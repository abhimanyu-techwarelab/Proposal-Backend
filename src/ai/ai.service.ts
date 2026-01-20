import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GeneralInfoAgent } from './agents/general-info.agent';
import { ScopeAgent } from './agents/scope.agent';
import { TimelineAgent } from './agents/timeline.agent';
import { FieldExtractionAgent } from './agents/field-extraction.agent';
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
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });

    this.generalInfoAgent = new GeneralInfoAgent(this.openai);
    this.scopeAgent = new ScopeAgent(this.openai, this.knowledgeBaseService);
    this.timelineAgent = new TimelineAgent(this.openai);
    this.fieldExtractionAgent = new FieldExtractionAgent(this.openai);
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    this.logger.log('Transcribing audio...');

    try {
      const file = await OpenAI.toFile(audioBuffer, 'audio.mp3', { type: 'audio/mpeg' });

      const transcription = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
      });

      this.logger.log(`Audio transcribed, length: ${transcription.text.length} characters`);
      return transcription.text;
    } catch (error: any) {
      this.logger.error(`Failed to transcribe audio: ${error.message}`);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
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
  ): Promise<ExtractedFields> {
    this.logger.log(`[EXTRACT] Extracting fields from content`);
    return this.fieldExtractionAgent.extract(documentText, audioTranscription);
  }
}
