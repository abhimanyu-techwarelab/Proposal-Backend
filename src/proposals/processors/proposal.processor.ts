import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ProposalsService } from '../proposals.service';
import { StorageService } from '../../storage/storage.service';
import { KnowledgeBaseService } from '../../knowledge-base/knowledge-base.service';
import { AIService } from '../../ai/ai.service';
import { TemplatesService } from '../../templates/templates.service';
import { UtilsService } from '../../common/utils.service';
import { DataTransformService } from '../../common/data-transform.service';
import { ProposalJobData } from '../entities/proposal.entity';

@Processor('proposal-generation')
export class ProposalProcessor extends WorkerHost {
  private readonly logger = new Logger(ProposalProcessor.name);

  constructor(
    private proposalsService: ProposalsService,
    private storageService: StorageService,
    private knowledgeBaseService: KnowledgeBaseService,
    private aiService: AIService,
    private templatesService: TemplatesService,
    private utilsService: UtilsService,
    private dataTransformService: DataTransformService,
  ) {
    super();
  }

  async process(job: Job<ProposalJobData>): Promise<void> {
    const jobData = job.data;
    const startTime = Date.now();

    this.logger.log(`========================================`);
    this.logger.log(`[JOB START] Processing proposal: ${jobData.proposal_id}`);
    this.logger.log(`[JOB DATA] Job ID: ${job.id}, Attempt: ${job.attemptsMade + 1}`);
    this.logger.debug(`[JOB DATA] Full payload: ${JSON.stringify(jobData, null, 2)}`);

    try {
      let fileStoreName: string | null = null;

      const hasAudioFiles = jobData.audio_path && jobData.audio_path.length > 0;
      const hasDocuments = jobData.document_storage_paths && jobData.document_storage_paths.length > 0;

      this.logger.log(`[STEP 1] Checking for audio/documents - Audio: ${hasAudioFiles ? jobData.audio_path!.length : 0}, Docs: ${hasDocuments ? jobData.document_storage_paths!.length : 0}`);

      if (hasAudioFiles || hasDocuments) {
        this.logger.log(`[STEP 2] Creating Gemini File Store...`);
        const filename = this.utilsService.generateFilename();
        this.logger.debug(`[STEP 2] Generated filename: ${filename}`);

        fileStoreName = await this.knowledgeBaseService.createFileStore(filename);
        this.logger.log(`[STEP 2] File store created: ${fileStoreName}`);

        if (hasAudioFiles) {
          this.logger.log(`[STEP 3a] Processing ${jobData.audio_path!.length} audio file(s)...`);
          await this.processAudioFiles(jobData.audio_path!, fileStoreName);
          this.logger.log(`[STEP 3a] Audio processing complete`);
        }

        if (hasDocuments) {
          this.logger.log(`[STEP 3b] Processing ${jobData.document_storage_paths!.length} document(s)...`);
          await this.processDocuments(jobData.document_storage_paths!, fileStoreName);
          this.logger.log(`[STEP 3b] Document processing complete`);
        }
      } else {
        this.logger.log(`[STEP 2-3] Skipping file store creation - no audio/documents provided`);
      }

      this.logger.log(`[STEP 4] Starting AI agent execution (parallel: GeneralInfo + Scope)...`);
      const aiStartTime = Date.now();

      const [generalInfoOutput, scopeOutput] = await Promise.all([
        this.aiService.executeGeneralInfoAgent(jobData),
        this.aiService.executeScopeAgent(jobData, fileStoreName),
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

      this.logger.log(`[STEP 6] Merging all outputs...`);
      const mergedData = this.dataTransformService.mergeOutputs(
        jobData,
        generalInfoOutput,
        scopeOutput,
        timelineOutput,
      );
      this.logger.log(`[STEP 6] Data merged - ${Object.keys(mergedData).length} fields`);

      this.logger.log(`[STEP 7] Fetching template: ${jobData.template_id}...`);
      const template = await this.templatesService.fetchTemplate(jobData.template_id);
      this.logger.log(`[STEP 7] Template fetched: ${template.template_name}`);

      this.logger.log(`[STEP 8] Rendering template...`);
      const renderedHtml = this.templatesService.renderTemplate(template.template_design, mergedData);
      this.logger.log(`[STEP 8] Template rendered - ${renderedHtml.length} characters`);

      this.logger.log(`[STEP 9] Saving proposal to Supabase...`);
      await this.proposalsService.saveProposal(jobData, mergedData, renderedHtml);
      this.logger.log(`[STEP 9] Proposal saved with status: approval_pending`);

      const totalTime = Date.now() - startTime;
      this.logger.log(`[JOB COMPLETE] Proposal ${jobData.proposal_id} completed in ${totalTime}ms`);
      this.logger.log(`========================================`);
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      this.logger.error(`[JOB FAILED] Proposal ${jobData.proposal_id} failed after ${totalTime}ms`);
      this.logger.error(`[JOB FAILED] Error: ${error.message}`);
      this.logger.error(`[JOB FAILED] Stack: ${error.stack}`);
      await this.proposalsService.markProposalFailed(jobData.proposal_id, error.message);
      throw error;
    }
  }

  private async processAudioFiles(audioPaths: string[], fileStoreName: string): Promise<void> {
    this.logger.log(`[AUDIO] Starting to process ${audioPaths.length} audio file(s)`);

    for (let i = 0; i < audioPaths.length; i++) {
      const audioPath = audioPaths[i];
      const audioStartTime = Date.now();

      this.logger.log(`[AUDIO ${i + 1}/${audioPaths.length}] Processing: ${audioPath}`);

      try {
        this.logger.debug(`[AUDIO ${i + 1}] Downloading from Supabase...`);
        const audioBuffer = await this.storageService.downloadAudio(audioPath);
        this.logger.log(`[AUDIO ${i + 1}] Downloaded - ${audioBuffer.length} bytes`);

        this.logger.debug(`[AUDIO ${i + 1}] Transcribing with Whisper...`);
        const transcribedText = await this.aiService.transcribeAudio(audioBuffer);
        this.logger.log(`[AUDIO ${i + 1}] Transcribed - ${transcribedText.length} characters`);
        this.logger.debug(`[AUDIO ${i + 1}] Transcription preview: ${transcribedText.substring(0, 200)}...`);

        const textBuffer = this.utilsService.textToFileBuffer(transcribedText);

        const filename = `transcription_${Date.now()}.txt`;
        this.logger.debug(`[AUDIO ${i + 1}] Uploading to Gemini as: ${filename}`);
        const uploadedFile = await this.knowledgeBaseService.uploadFile(
          textBuffer,
          'text/plain',
          filename,
        );
        this.logger.log(`[AUDIO ${i + 1}] Uploaded to Gemini: ${uploadedFile.name}`);

        this.logger.debug(`[AUDIO ${i + 1}] Importing to file store...`);
        await this.knowledgeBaseService.importFileToStore(fileStoreName, uploadedFile.name);

        this.logger.log(`[AUDIO ${i + 1}] Complete in ${Date.now() - audioStartTime}ms`);
      } catch (error: any) {
        this.logger.error(`[AUDIO ${i + 1}] FAILED: ${error.message}`);
        this.logger.error(`[AUDIO ${i + 1}] Stack: ${error.stack}`);
        throw error;
      }
    }

    this.logger.log(`[AUDIO] All ${audioPaths.length} audio file(s) processed successfully`);
  }

  private async processDocuments(documentPaths: string[], fileStoreName: string): Promise<void> {
    this.logger.log(`[DOC] Starting to process ${documentPaths.length} document(s)`);

    for (let i = 0; i < documentPaths.length; i++) {
      const documentPath = documentPaths[i];
      const docStartTime = Date.now();

      this.logger.log(`[DOC ${i + 1}/${documentPaths.length}] Processing: ${documentPath}`);

      try {
        this.logger.debug(`[DOC ${i + 1}] Downloading from Supabase...`);
        const documentBuffer = await this.storageService.downloadDocument(documentPath);
        this.logger.log(`[DOC ${i + 1}] Downloaded - ${documentBuffer.length} bytes`);

        const mimeType = this.getMimeType(documentPath);
        const filename = documentPath.split('/').pop() || `document_${Date.now()}`;
        this.logger.debug(`[DOC ${i + 1}] Detected MIME type: ${mimeType}, filename: ${filename}`);

        this.logger.debug(`[DOC ${i + 1}] Uploading to Gemini...`);
        const uploadedFile = await this.knowledgeBaseService.uploadFile(
          documentBuffer,
          mimeType,
          filename,
        );
        this.logger.log(`[DOC ${i + 1}] Uploaded to Gemini: ${uploadedFile.name}`);

        this.logger.debug(`[DOC ${i + 1}] Importing to file store...`);
        await this.knowledgeBaseService.importFileToStore(fileStoreName, uploadedFile.name);

        this.logger.log(`[DOC ${i + 1}] Complete in ${Date.now() - docStartTime}ms`);
      } catch (error: any) {
        this.logger.error(`[DOC ${i + 1}] FAILED: ${error.message}`);
        this.logger.error(`[DOC ${i + 1}] Stack: ${error.stack}`);
        throw error;
      }
    }

    this.logger.log(`[DOC] All ${documentPaths.length} document(s) processed successfully`);
  }

  private getMimeType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();

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
}
