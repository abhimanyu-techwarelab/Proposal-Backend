import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ProposalsService } from '../proposals.service';
import { StorageService } from '../../storage/storage.service';
import { KnowledgeBaseService } from '../../knowledge-base/knowledge-base.service';
import { AIService } from '../../ai/ai.service';
import { UtilsService } from '../../common/utils.service';
import { UsageCountersService } from '../../usage-counters/usage-counters.service';
import { ProposalJobData } from '../entities/proposal.entity';

@Processor('proposal-generation')
export class ProposalProcessor extends WorkerHost {
  private readonly logger = new Logger(ProposalProcessor.name);

  constructor(
    private proposalsService: ProposalsService,
    private storageService: StorageService,
    private knowledgeBaseService: KnowledgeBaseService,
    private aiService: AIService,
    private utilsService: UtilsService,
    private usageCountersService: UsageCountersService,
  ) {
    super();
  }

  async process(job: Job<ProposalJobData>): Promise<void> {
    const jobData = job.data;
    const startTime = Date.now();

    this.logger.log(`========================================`);
    this.logger.log(`[JOB START] Processing proposal: ${jobData.id}`);
    this.logger.log(`[JOB DATA] Job ID: ${job.id}, Attempt: ${job.attemptsMade + 1}`);
    this.logger.debug(`[JOB DATA] Full payload: ${JSON.stringify(jobData, null, 2)}`);

    try {
      const hasAudioFiles = jobData.audio_storage_paths && jobData.audio_storage_paths.length > 0;
      const hasDocuments = jobData.document_storage_paths && jobData.document_storage_paths.length > 0;

      this.logger.log(`[STEP 1] Checking for audio/documents - Audio: ${hasAudioFiles ? jobData.audio_storage_paths!.length : 0}, Docs: ${hasDocuments ? jobData.document_storage_paths!.length : 0}`);

      // Check for existing namespace from previous attempt
      this.logger.log(`[STEP 2] Checking database for existing Pinecone namespace...`);
      let namespace = await this.proposalsService.getProposalNamespace(jobData.id);

      if (namespace) {
        this.logger.log(`[STEP 2] FOUND existing namespace in DB: ${namespace}`);
        this.logger.log(`[STEP 2] This is a RETRY - documents already indexed in Pinecone`);
        this.logger.log(`[STEP 2-3] Skipping document indexing - reusing existing vectors`);
      } else if (hasAudioFiles || hasDocuments) {
        this.logger.log(`[STEP 2] No existing namespace found - this is a FRESH attempt`);
        this.logger.log(`[STEP 2] Creating new Pinecone namespace...`);
        namespace = await this.knowledgeBaseService.createNamespace(jobData.id);
        this.logger.log(`[STEP 2] Namespace created: ${namespace}`);

        if (hasAudioFiles) {
          this.logger.log(`[STEP 3a] Processing ${jobData.audio_storage_paths!.length} audio file(s)...`);
          await this.processAudioFiles(jobData.audio_storage_paths!, namespace, jobData.id);
          this.logger.log(`[STEP 3a] Audio processing complete`);
        }

        if (hasDocuments) {
          this.logger.log(`[STEP 3b] Processing ${jobData.document_storage_paths!.length} document(s)...`);
          await this.processDocuments(jobData.document_storage_paths!, namespace, jobData.id);
          this.logger.log(`[STEP 3b] Document processing complete`);
        }

        // Save namespace to DB after successful indexing
        this.logger.log(`[STEP 3c] Saving namespace to database for future retry reuse...`);
        await this.proposalsService.updateNamespace(jobData.id, namespace);
        this.logger.log(`[STEP 3c] Namespace "${namespace}" saved to pinecone_namespace column`);
      } else {
        this.logger.log(`[STEP 2] No existing namespace found in DB`);
        this.logger.log(`[STEP 2-3] Skipping namespace creation - no audio/documents provided`);
      }

      this.logger.log(`[STEP 4] Starting AI agent execution (parallel: GeneralInfo + Scope)...`);
      const aiStartTime = Date.now();

      const [generalInfoOutput, scopeOutput] = await Promise.all([
        this.aiService.executeGeneralInfoAgent(jobData),
        this.aiService.executeScopeAgent(jobData, namespace),
      ]);

      this.logger.log(`[STEP 4] GeneralInfo + Scope agents completed in ${Date.now() - aiStartTime}ms`);
      this.logger.debug(`[STEP 4] GeneralInfo output keys: ${Object.keys(generalInfoOutput).join(', ')}`);
      this.logger.debug(`[STEP 4] Scope output keys: ${Object.keys(scopeOutput).join(', ')}`);

      this.logger.log(`[STEP 5] Executing Timeline agent...`);
      const timelineStartTime = Date.now();

      const timelineOutput = await this.aiService.executeTimelineAgent(
        jobData,
        scopeOutput['scope-of-work-main-points'],
      );

      this.logger.log(`[STEP 5] Timeline agent completed in ${Date.now() - timelineStartTime}ms`);
      this.logger.debug(`[STEP 5] Timeline output: ${JSON.stringify(timelineOutput, null, 2)}`);

      this.logger.log(`[STEP 6] Saving AI outputs to PostgreSQL...`);
      await this.proposalsService.saveProposal(
        jobData,
        generalInfoOutput,
        scopeOutput,
        timelineOutput,
      );
      this.logger.log(`[STEP 6] Proposal saved with status: approval_pending`);

      // Increment usage counter after successful generation
      if (jobData.subscription_id) {
        await this.usageCountersService.incrementUsage(
          jobData.subscription_id,
          'proposal_number',
        );
        this.logger.log(`[STEP 7] Usage counter incremented for subscription: ${jobData.subscription_id}`);
      }

      const totalTime = Date.now() - startTime;
      this.logger.log(`[JOB COMPLETE] Proposal ${jobData.id} completed in ${totalTime}ms`);
      this.logger.log(`========================================`);
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      this.logger.error(`[JOB FAILED] Proposal ${jobData.id} failed after ${totalTime}ms`);
      this.logger.error(`[JOB FAILED] Error: ${error.message}`);
      this.logger.error(`[JOB FAILED] Stack: ${error.stack}`);
      await this.proposalsService.markProposalFailed(jobData.id, error.message);
      throw error;
    }
  }

  private async processAudioFiles(
    audioPaths: string[],
    namespace: string,
    proposalId: string,
  ): Promise<void> {
    this.logger.log(`[AUDIO] Starting to process ${audioPaths.length} audio file(s)`);

    for (let i = 0; i < audioPaths.length; i++) {
      const audioPath = audioPaths[i];
      const audioStartTime = Date.now();

      this.logger.log(`[AUDIO ${i + 1}/${audioPaths.length}] Processing: ${audioPath}`);

      try {
        this.logger.debug(`[AUDIO ${i + 1}] Downloading from Supabase Storage...`);
        const audioBuffer = await this.storageService.downloadAudio(audioPath);
        this.logger.log(`[AUDIO ${i + 1}] Downloaded - ${audioBuffer.length} bytes`);

        this.logger.debug(`[AUDIO ${i + 1}] Transcribing with Whisper...`);
        const transcribedText = await this.aiService.transcribeAudio(audioBuffer);
        this.logger.log(`[AUDIO ${i + 1}] Transcribed - ${transcribedText.length} characters`);
        this.logger.debug(`[AUDIO ${i + 1}] Transcription preview: ${transcribedText.substring(0, 200)}...`);

        const textBuffer = this.utilsService.textToFileBuffer(transcribedText);
        const filename = `transcription_${Date.now()}.txt`;

        this.logger.debug(`[AUDIO ${i + 1}] Indexing transcription to Pinecone...`);
        const result = await this.knowledgeBaseService.indexDocument(
          namespace,
          textBuffer,
          'text/plain',
          filename,
          proposalId,
          'transcription',
        );

        this.logger.log(`[AUDIO ${i + 1}] Complete in ${Date.now() - audioStartTime}ms - ${result.chunksIndexed} chunks indexed`);
      } catch (error: any) {
        this.logger.error(`[AUDIO ${i + 1}] FAILED: ${error.message}`);
        this.logger.error(`[AUDIO ${i + 1}] Stack: ${error.stack}`);
        throw error;
      }
    }

    this.logger.log(`[AUDIO] All ${audioPaths.length} audio file(s) processed successfully`);
  }

  private async processDocuments(
    documentPaths: string[],
    namespace: string,
    proposalId: string,
  ): Promise<void> {
    this.logger.log(`[DOC] Starting to process ${documentPaths.length} document(s)`);

    for (let i = 0; i < documentPaths.length; i++) {
      const documentPath = documentPaths[i];
      const docStartTime = Date.now();

      this.logger.log(`[DOC ${i + 1}/${documentPaths.length}] Processing: ${documentPath}`);

      try {
        this.logger.debug(`[DOC ${i + 1}] Downloading from Supabase Storage...`);
        const documentBuffer = await this.storageService.downloadDocument(documentPath);
        this.logger.log(`[DOC ${i + 1}] Downloaded - ${documentBuffer.length} bytes`);

        const mimeType = this.getMimeType(documentPath);
        const filename = this.getCleanFilename(documentPath);
        this.logger.debug(`[DOC ${i + 1}] Detected MIME type: ${mimeType}, filename: ${filename}`);

        this.logger.debug(`[DOC ${i + 1}] Indexing document to Pinecone...`);
        const result = await this.knowledgeBaseService.indexDocument(
          namespace,
          documentBuffer,
          mimeType,
          filename,
          proposalId,
          'document',
        );

        this.logger.log(`[DOC ${i + 1}] Complete in ${Date.now() - docStartTime}ms - ${result.chunksIndexed} chunks indexed`);
      } catch (error: any) {
        this.logger.error(`[DOC ${i + 1}] FAILED: ${error.message}`);
        this.logger.error(`[DOC ${i + 1}] Stack: ${error.stack}`);
        throw error;
      }
    }

    this.logger.log(`[DOC] All ${documentPaths.length} document(s) processed successfully`);
  }

  private getMimeType(filePath: string): string {
    // Remove query parameters and get the clean file path
    const cleanPath = filePath.split('?')[0];
    const extension = cleanPath.split('.').pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      md: 'text/markdown',
      json: 'application/json',
      csv: 'text/csv',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }

  private getCleanFilename(filePath: string): string {
    // Remove query parameters and get the clean filename
    const cleanPath = filePath.split('?')[0];
    return cleanPath.split('/').pop() || `document_${Date.now()}`;
  }
}
