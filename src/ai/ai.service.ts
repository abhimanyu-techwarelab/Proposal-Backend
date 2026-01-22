import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GeneralInfoAgent } from './agents/general-info.agent';
import { ScopeAgent } from './agents/scope.agent';
import { TimelineAgent } from './agents/timeline.agent';
import { FieldExtractionAgent, CurrentProposalValues } from './agents/field-extraction.agent';
import { AudioChunkingService, AudioChunk, TranscriptionChunk } from './audio-chunking.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { ProposalJobData } from '../proposals/entities/proposal.entity';
import { ExtractedFields } from '../proposals/interfaces/extracted-fields.interface';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private openai: OpenAI;
  private generalInfoAgent: GeneralInfoAgent;
  private scopeAgent: ScopeAgent;
  private timelineAgent: TimelineAgent;
  private fieldExtractionAgent: FieldExtractionAgent;

  constructor(
    private configService: ConfigService,
    private knowledgeBaseService: KnowledgeBaseService,
    private audioChunkingService: AudioChunkingService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      timeout: 300000, // 5 minutes for transcription
    });

    this.generalInfoAgent = new GeneralInfoAgent(this.openai);
    this.scopeAgent = new ScopeAgent(this.openai, this.knowledgeBaseService);
    this.timelineAgent = new TimelineAgent(this.openai);
    this.fieldExtractionAgent = new FieldExtractionAgent(this.openai);
  }

  /**
   * Transcribe audio with automatic chunking for large files
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    options?: { onProgress?: (progress: number) => void }
  ): Promise<string> {
    const startTime = Date.now();
    this.logger.log(
      `[TRANSCRIBE] Starting transcription, buffer size: ${audioBuffer.length} bytes`
    );

    try {
      // Check if chunking is needed
      if (!this.audioChunkingService.needsChunking(audioBuffer)) {
        // Small file: transcribe directly
        this.logger.log(`[TRANSCRIBE] File under 25MB, transcribing directly`);
        return await this.transcribeSingleChunk(audioBuffer);
      }

      // Large file: chunk and transcribe
      this.logger.log(`[TRANSCRIBE] File exceeds 25MB, chunking required`);
      const chunkResult = await this.audioChunkingService.chunkAudio(audioBuffer);

      this.logger.log(
        `[TRANSCRIBE] Processing ${chunkResult.chunks.length} chunks`
      );

      // Transcribe chunks with controlled parallelism
      const transcriptions = await this.transcribeChunksWithProgress(
        chunkResult.chunks,
        options?.onProgress
      );

      // Merge results
      const mergedText =
        this.audioChunkingService.mergeTranscriptions(transcriptions);

      const duration = Date.now() - startTime;
      this.logger.log(
        `[TRANSCRIBE] Complete in ${duration}ms, ${mergedText.length} chars`
      );

      return mergedText;
    } catch (error: any) {
      this.logger.error(`[TRANSCRIBE] Failed: ${error.message}`);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  /**
   * Transcribe a single audio chunk
   */
  private async transcribeSingleChunk(audioBuffer: Buffer): Promise<string> {
    const file = await OpenAI.toFile(audioBuffer, 'audio.mp3', {
      type: 'audio/mpeg',
    });

    const transcription = await this.openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
    });

    this.logger.log(
      `[TRANSCRIBE] Single chunk transcribed: ${transcription.text.length} chars`
    );
    return transcription.text;
  }

  /**
   * Transcribe multiple chunks with progress tracking
   */
  private async transcribeChunksWithProgress(
    chunks: AudioChunk[],
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionChunk[]> {
    const results: TranscriptionChunk[] = [];
    const concurrency = 3; // Parallel API calls

    for (let i = 0; i < chunks.length; i += concurrency) {
      const batch = chunks.slice(i, i + concurrency);

      const batchResults = await Promise.all(
        batch.map(async (chunk) => {
          const text = await this.transcribeSingleChunk(chunk.buffer);
          return {
            index: chunk.index,
            text,
            startTime: chunk.startTime,
            endTime: chunk.endTime,
          };
        })
      );

      results.push(...batchResults);

      // Report progress
      if (onProgress) {
        const progress = Math.round(
          ((i + batch.length) / chunks.length) * 100
        );
        onProgress(progress);
      }

      this.logger.log(
        `[TRANSCRIBE] Batch complete: ${i + batch.length}/${chunks.length} chunks`
      );
    }

    return results;
  }

  async executeGeneralInfoAgent(jobData: ProposalJobData): Promise<{
    'executive-summary': string;
    objectives: string;
    'training-and-support': string;
    'team-structure-min-experiance': string;
    'team-structure-table': Array<{
      Designation: string;
      Count: string;
      'Key Responsibilities': string;
      Experience: string;
    }>;
  }> {
    this.logger.log(`Executing General Info Agent for proposal: ${jobData.id}`);
    return this.generalInfoAgent.execute(jobData);
  }

  async executeScopeAgent(
    jobData: ProposalJobData,
    namespace: string | null,
  ): Promise<{
    'scope-of-work-introduction': string;
    'scope-of-work-summary': string;
    'scope-of-work': string;
    'scope-of-work-main-points': string;
  }> {
    this.logger.log(`Executing Scope Agent for proposal: ${jobData.id}`);
    return this.scopeAgent.execute(jobData, namespace);
  }

  async executeTimelineAgent(
    jobData: ProposalJobData,
    scopeMainPoints: string,
  ): Promise<{
    'duration-business-days': string;
    'implementation-timeline-table': Array<{
      phase: string;
      scope: string;
      timeline: string;
    }>;
  }> {
    this.logger.log(`Executing Timeline Agent for proposal: ${jobData.id}`);
    return this.timelineAgent.execute(jobData, scopeMainPoints);
  }

  async extractFieldsFromContent(
    documentText: string,
    audioTranscription?: string,
    currentValues?: CurrentProposalValues,
  ): Promise<ExtractedFields> {
    this.logger.log(`[EXTRACT] Extracting fields from content`);
    this.logger.log(`[EXTRACT] Merge mode: ${currentValues ? 'enabled' : 'disabled'}`);
    return this.fieldExtractionAgent.extract(documentText, audioTranscription, currentValues);
  }
}
