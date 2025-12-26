import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GenerateProposalDto } from './dto/generate-proposal.dto';
import { Proposal, ProposalJobData, AIGeneratedContent } from './entities/proposal.entity';

@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);
  private supabase: SupabaseClient;

  constructor(
    private configService: ConfigService,
    @InjectQueue('proposal-generation') private proposalQueue: Queue,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY') || '';

    this.logger.log(`[INIT] Initializing Supabase client`);
    this.logger.debug(`[INIT] Supabase URL: ${supabaseUrl.substring(0, 30)}...`);

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger.log(`[INIT] Supabase client initialized`);
  }

  async generateProposal(dto: GenerateProposalDto): Promise<{ proposal_id: string }> {
    this.logger.log(`========================================`);
    this.logger.log(`[API] POST /proposals/generate`);
    this.logger.log(`[API] proposal_id: ${dto.proposal_id}`);
    this.logger.log(`[API] organization_id: ${dto.organization_id}`);
    this.logger.log(`[API] template_id: ${dto.template_id}`);
    this.logger.log(`[API] created_by: ${dto.created_by}`);
    this.logger.debug(`[API] Full DTO: ${JSON.stringify(dto, null, 2)}`);

    const jobData: ProposalJobData = {
      proposal_id: dto.proposal_id,
      organization_id: dto.organization_id,
      template_id: dto.template_id,
      created_by: dto.created_by,
      title: dto.title,
      client_name: dto.client_name,
      client_email: dto.client_email,
      links: dto.links,
      industry: dto.industry,
      audio_path: dto.audio_path,
      document_storage_paths: dto.document_storage_paths,
      summary: dto.summary,
      goals: dto.goals,
      scope: dto.scope,
      deliverables: dto.deliverables,
      start_date: dto.start_date,
      end_date: dto.end_date,
      date_of_proposal: dto.date_of_proposal,
      milestones: dto.milestones,
      total_budget: dto.total_budget,
      currency: dto.currency,
      billing_type: dto.billing_type,
      team_members: dto.team_members,
      submitted_to: dto.submitted_to,
    };

    this.logger.log(`[QUEUE] Adding job to proposal-generation queue...`);

    const job = await this.proposalQueue.add('generate', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });

    this.logger.log(`[QUEUE] Job added - ID: ${job.id}`);
    this.logger.log(`[API] Returning proposal_id: ${dto.proposal_id}`);
    this.logger.log(`========================================`);

    return { proposal_id: dto.proposal_id };
  }

  async getProposalResult(proposalId: string): Promise<Proposal | null> {
    this.logger.log(`[API] GET /proposals/${proposalId}/result`);

    const { data, error } = await this.supabase
      .from('proposals')
      .select('*')
      .eq('proposal_id', proposalId)
      .single();

    if (error) {
      this.logger.error(`[API] Error fetching proposal ${proposalId}: ${error.message}`);
      return null;
    }

    this.logger.log(`[API] Proposal found - status: ${data.status}`);
    this.logger.debug(`[API] Proposal data: ${JSON.stringify(data, null, 2)}`);

    return data as Proposal;
  }

  async saveProposal(
    jobData: ProposalJobData,
    aiContent: AIGeneratedContent,
    pdfCode: string,
  ): Promise<void> {
    this.logger.log(`[SAVE] Saving proposal ${jobData.proposal_id} to Supabase...`);
    this.logger.log(`[SAVE] pdf_code length: ${pdfCode.length} chars`);

    const proposal: Partial<Proposal> = {
      proposal_id: jobData.proposal_id,
      organization_id: jobData.organization_id,
      created_by: jobData.created_by,
      title: jobData.title,
      client_name: jobData.client_name,
      client_email: jobData.client_email,
      links: jobData.links,
      industry: jobData.industry,
      audio_path: jobData.audio_path,
      summary: jobData.summary,
      goals: jobData.goals,
      scope: jobData.scope,
      deliverables: jobData.deliverables,
      start_date: jobData.start_date,
      end_date: jobData.end_date,
      date_of_proposal: jobData.date_of_proposal,
      milestones: jobData.milestones,
      total_budget: jobData.total_budget,
      currency: jobData.currency,
      billing_type: jobData.billing_type,
      team_members: jobData.team_members,
      submitted_to: jobData.submitted_to,
      status: 'approval_pending',
      pdf_code: pdfCode,
    };

    this.logger.debug(`[SAVE] Proposal fields: ${Object.keys(proposal).join(', ')}`);

    const { error } = await this.supabase.from('proposals').upsert(proposal);

    if (error) {
      this.logger.error(`[SAVE] FAILED - ${error.message}`);
      this.logger.error(`[SAVE] Error details: ${JSON.stringify(error)}`);
      throw new Error(`Failed to save proposal: ${error.message}`);
    }

    this.logger.log(`[SAVE] SUCCESS - Proposal ${jobData.proposal_id} saved with status: approval_pending`);
  }

  async markProposalFailed(proposalId: string, errorMessage: string): Promise<void> {
    this.logger.log(`[FAIL] Marking proposal ${proposalId} as failed...`);
    this.logger.log(`[FAIL] Error: ${errorMessage.substring(0, 200)}`);

    const { error } = await this.supabase
      .from('proposals')
      .upsert({
        proposal_id: proposalId,
        status: 'failed',
        error: errorMessage,
      });

    if (error) {
      this.logger.error(`[FAIL] Could not update status: ${error.message}`);
    } else {
      this.logger.log(`[FAIL] Proposal ${proposalId} marked as failed`);
    }
  }
}
