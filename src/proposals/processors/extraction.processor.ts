import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ProposalsService } from '../proposals.service';
import { StorageService } from '../../storage/storage.service';
import { AIService } from '../../ai/ai.service';
import { KnowledgeBaseService } from '../../knowledge-base/knowledge-base.service';

export interface ExtractionJobData {
  proposalId: string;
  audioUrls: string[];
  documentUrls: string[];
}

@Processor('field-extraction')
export class ExtractionProcessor extends WorkerHost {
  private readonly logger = new Logger(ExtractionProcessor.name);

  constructor(
    private proposalsService: ProposalsService,
    private storageService: StorageService,
    private aiService: AIService,
    private knowledgeBaseService: KnowledgeBaseService,
  ) {
    super();
  }

  async process(job: Job<ExtractionJobData>): Promise<void> {
    const { proposalId, audioUrls, documentUrls } = job.data;
    const startTime = Date.now();

    this.logger.log(`========================================`);
    this.logger.log(`[EXTRACTION START] Processing proposal: ${proposalId}`);
    this.logger.log(
      `[EXTRACTION] Audio: ${audioUrls.length}, Docs: ${documentUrls.length}`,
    );

    try {
      // Update progress: Starting
      await this.updateProgress(job, proposalId, 5, 'Starting extraction...');

      let combinedDocumentText = '';
      let combinedAudioText = '';
      const totalFiles = audioUrls.length + documentUrls.length;
      let processedFiles = 0;

      // Process documents
      for (const url of documentUrls) {
        try {
          this.logger.log(
            `[EXTRACTION] Downloading document: ${url.substring(0, 80)}...`,
          );
          const buffer = await this.storageService.downloadDocument(url);

          const mimeType = this.getMimeTypeFromUrl(url);
          const text = await this.knowledgeBaseService.parseDocument(
            buffer,
            mimeType,
          );

          combinedDocumentText += text + '\n\n';
          this.logger.log(
            `[EXTRACTION] Parsed document: ${text.length} chars`,
          );

          processedFiles++;
          const progress = Math.round(
            5 + (processedFiles / totalFiles) * 60,
          ); // 5-65%
          await this.updateProgress(
            job,
            proposalId,
            progress,
            `Processing documents (${processedFiles}/${documentUrls.length})`,
          );
        } catch (error: any) {
          this.logger.warn(
            `[EXTRACTION] Failed to process document: ${error.message}`,
          );
        }
      }

      // Process audio files
      for (let i = 0; i < audioUrls.length; i++) {
        const url = audioUrls[i];
        try {
          this.logger.log(
            `[EXTRACTION] Downloading audio ${i + 1}/${audioUrls.length}: ${url.substring(0, 80)}...`,
          );

          const buffer = await this.storageService.downloadAudio(url);
          this.logger.log(
            `[EXTRACTION] Audio downloaded: ${buffer.length} bytes`,
          );

          await this.updateProgress(
            job,
            proposalId,
            65 + Math.round((i / audioUrls.length) * 15), // 65-80%
            `Transcribing audio (${i + 1}/${audioUrls.length})`,
          );

          // Transcribe audio (with chunking for large files)
          const transcription = await this.aiService.transcribeAudio(buffer);
          combinedAudioText += transcription + '\n\n';
          this.logger.log(
            `[EXTRACTION] Transcribed audio: ${transcription.length} chars`,
          );

          processedFiles++;
        } catch (error: any) {
          this.logger.warn(
            `[EXTRACTION] Failed to process audio: ${error.message}`,
          );
        }
      }

      // Update progress: Extracting fields
      await this.updateProgress(
        job,
        proposalId,
        85,
        'Extracting fields from content...',
      );

      // Truncate content if too long (100KB max for GPT processing)
      const MAX_CONTENT_LENGTH = 100000;
      if (combinedDocumentText.length > MAX_CONTENT_LENGTH) {
        combinedDocumentText = combinedDocumentText.substring(
          0,
          MAX_CONTENT_LENGTH,
        );
        this.logger.warn(
          `[EXTRACTION] Document content truncated to ${MAX_CONTENT_LENGTH} chars`,
        );
      }

      // Fetch current proposal values for intelligent merging
      const currentProposal = await this.proposalsService.findOneById(proposalId);
      const currentValues = currentProposal ? {
        title: currentProposal.title || undefined,
        clientName: currentProposal.client_name || undefined,
        clientEmail: currentProposal.client_email || undefined,
        industry: currentProposal.industry || undefined,
        summary: currentProposal.summary || undefined,
        goals: currentProposal.goals || undefined,
        scope: currentProposal.scope || undefined,
        startDate: currentProposal.start_date?.toISOString().split('T')[0] || undefined,
        endDate: currentProposal.end_date?.toISOString().split('T')[0] || undefined,
        totalBudget: currentProposal.total_budget || undefined,
        currency: currentProposal.currency || undefined,
        billingType: currentProposal.billing_type || undefined,
        deliverables: currentProposal.deliverables || undefined,
        milestones: Array.isArray(currentProposal.milestones) 
          ? currentProposal.milestones
              .filter((m: any) => m && typeof m === 'object' && m.title)
              .map((m: any) => ({ title: m.title }))
          : undefined,
        teamMembers: Array.isArray(currentProposal.team_members)
          ? currentProposal.team_members
              .filter((tm: any) => tm && typeof tm === 'object' && tm.role)
              .map((tm: any) => ({ 
                role: tm.role, 
                experience: tm.experience ?? '' 
              }))
          : undefined,
        links: currentProposal.links || undefined,
      } : undefined;

      // Extract fields using AI with intelligent merging
      this.logger.log(
        `[EXTRACTION] Calling AI extraction with ${combinedDocumentText.length} doc chars, ${combinedAudioText.length} audio chars`,
      );
      this.logger.log(
        `[EXTRACTION] Merge mode enabled - will preserve user edits`,
      );
      const fields = await this.aiService.extractFieldsFromContent(
        combinedDocumentText,
        combinedAudioText,
        currentValues,
      );

      // Update progress: Saving
      await this.updateProgress(job, proposalId, 95, 'Saving extracted fields...');

      // Save extracted fields to proposal
      await this.proposalsService.updateDraftWithExtractedFields(
        proposalId,
        fields,
      );

      // Mark extraction as completed
      await this.proposalsService.updateExtractionStatus(
        proposalId,
        'completed',
        100,
      );

      const totalTime = Date.now() - startTime;
      this.logger.log(
        `[EXTRACTION COMPLETE] Proposal ${proposalId} completed in ${totalTime}ms`,
      );
      this.logger.log(`========================================`);
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      this.logger.error(
        `[EXTRACTION FAILED] Proposal ${proposalId} failed after ${totalTime}ms`,
      );
      this.logger.error(`[EXTRACTION FAILED] Error: ${error.message}`);
      this.logger.error(`[EXTRACTION FAILED] Stack: ${error.stack}`);

      // Mark extraction as failed
      await this.proposalsService.updateExtractionStatus(
        proposalId,
        'failed',
        0,
      );
      throw error;
    }
  }

  private async updateProgress(
    job: Job,
    proposalId: string,
    progress: number,
    message: string,
  ): Promise<void> {
    this.logger.log(`[EXTRACTION] ${message} (${progress}%)`);
    await job.updateProgress(progress);
    await this.proposalsService.updateExtractionProgress(proposalId, progress);
  }

  private getMimeTypeFromUrl(url: string): string {
    const lower = url.toLowerCase();
    if (lower.includes('.pdf')) return 'application/pdf';
    if (lower.includes('.docx'))
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (lower.includes('.doc')) return 'application/msword';
    return 'application/octet-stream';
  }
}
