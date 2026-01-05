import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GenerateProposalDto } from './dto/generate-proposal.dto';
import {
  Proposal,
  ProposalJobData,
  GeneralInfoOutput,
  ScopeOutput,
  TimelineOutput,
} from './entities/proposal.entity';
import { TemplatesService } from '../templates/templates.service';
import { DataTransformService } from '../common/data-transform.service';

@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,
    @InjectQueue('proposal-generation') private proposalQueue: Queue,
    private templatesService: TemplatesService,
    private dataTransformService: DataTransformService,
  ) {
    this.logger.log(`[INIT] ProposalsService initialized with TypeORM`);
  }

  async generateProposal(dto: GenerateProposalDto): Promise<{ id: string }> {
    this.logger.log(`========================================`);
    this.logger.log(`[API] POST /proposals/generate`);
    // Support both subscription_id and organization_id for backward compatibility
    const subscriptionId = dto.subscription_id || dto.organization_id;
    this.logger.log(`[API] subscription_id: ${subscriptionId}`);
    this.logger.log(`[API] template_id: ${dto.template_id}`);
    this.logger.log(`[API] created_by: ${dto.created_by}`);
    this.logger.debug(`[API] Full DTO: ${JSON.stringify(dto, null, 2)}`);

    this.logger.log(`[DB] Creating proposal row in PostgreSQL...`);

    const proposal = this.proposalRepository.create({
      subscription_id: subscriptionId,
      template_id: dto.template_id,
      created_by: dto.created_by,
      title: dto.title,
      client_name: dto.client_name,
      client_email: dto.client_email,
      links: dto.links,
      industry: dto.industry,
      audio_storage_paths: dto.audio_storage_paths,
      document_storage_paths: dto.document_storage_paths,
      summary: dto.summary,
      goals: dto.goals,
      scope: dto.scope,
      deliverables: dto.deliverables,
      start_date: dto.start_date ? new Date(dto.start_date) : undefined,
      end_date: dto.end_date ? new Date(dto.end_date) : undefined,
      date_of_proposal: dto.date_of_proposal ? new Date(dto.date_of_proposal) : undefined,
      milestones: dto.milestones,
      total_budget: dto.total_budget,
      currency: dto.currency,
      billing_type: dto.billing_type,
      team_members: dto.team_members,
      submitted_to: dto.submitted_to,
      status: 'processing',
    });

    const savedProposal = await this.proposalRepository.save(proposal);

    const proposalId = savedProposal.id;
    this.logger.log(`[DB] Proposal created with ID: ${proposalId}`);

    const jobData: ProposalJobData = {
      id: proposalId,
      subscription_id: subscriptionId,
      template_id: dto.template_id,
      created_by: dto.created_by,
      title: dto.title,
      client_name: dto.client_name,
      client_email: dto.client_email,
      links: dto.links,
      industry: dto.industry,
      audio_storage_paths: dto.audio_storage_paths,
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
    this.logger.log(`[API] Returning id: ${proposalId}`);
    this.logger.log(`========================================`);

    return { id: proposalId };
  }

  async getProposalResult(proposalId: string): Promise<Proposal | null> {
    this.logger.log(`[API] GET /proposals/${proposalId}/result`);

    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
    });

    if (!proposal) {
      this.logger.error(`[API] Proposal ${proposalId} not found`);
      return null;
    }

    this.logger.log(`[API] Proposal found - status: ${proposal.status}`);
    this.logger.debug(`[API] Proposal data: ${JSON.stringify(proposal, null, 2)}`);

    return proposal;
  }

  async saveProposal(
    jobData: ProposalJobData,
    generalInfo: GeneralInfoOutput,
    scope: ScopeOutput,
    timeline: TimelineOutput,
  ): Promise<void> {
    this.logger.log(`[SAVE] Updating proposal ${jobData.id} in PostgreSQL...`);

    // Parse integers safely, defaulting to undefined if invalid
    const parseIntSafe = (value: string | undefined): number | undefined => {
      if (!value) return undefined;
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? undefined : parsed;
    };

    const result = await this.proposalRepository.update(
      { id: jobData.id },
      {
        status: 'approval_pending',
        executive_summary: generalInfo['executive-summary'],
        objectives: generalInfo.objectives,
        training_and_support: generalInfo['training-and-support'],
        team_structure_min_experience: parseIntSafe(generalInfo['team-structure-min-experiance']),
        team_structure_table: generalInfo['team-structure-table'],
        scope_of_work_introduction: scope['scope-of-work-introduction'],
        scope_of_work_summary: scope['scope-of-work-summary'],
        scope_of_work: scope['scope-of-work'],
        duration_business_days: parseIntSafe(timeline['duration-business-days']),
        implementation_timeline_table: timeline['implementation-timeline-table'],
      },
    );

    if (result.affected === 0) {
      this.logger.error(`[SAVE] FAILED - No proposal found with id ${jobData.id}`);
      throw new Error(`Failed to save proposal: Proposal not found`);
    }

    this.logger.log(`[SAVE] SUCCESS - Proposal ${jobData.id} updated with status: approval_pending`);
  }

  async renderProposal(proposalId: string): Promise<{ html: string }> {
    this.logger.log(`[RENDER] Rendering proposal ${proposalId}...`);

    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
    });

    if (!proposal) {
      this.logger.error(`[RENDER] Proposal ${proposalId} not found`);
      throw new Error('Proposal not found');
    }

    if (!proposal.template_id) {
      this.logger.error(`[RENDER] Proposal ${proposalId} has no template_id`);
      throw new Error('Proposal has no template assigned');
    }

    const template = await this.templatesService.fetchTemplate(proposal.template_id);
    this.logger.log(`[RENDER] Template fetched: ${template.name}`);

    // Add table headers for rendering
    const teamTableWithHeader = this.dataTransformService.addTeamStructureHeader(
      proposal.team_structure_table as any,
    );
    const timelineTableWithHeader = this.dataTransformService.addTimelineHeader(
      proposal.implementation_timeline_table as any,
    );

    // Map proposal data to template expected format
    const templateData: Record<string, any> = {
      title: proposal.title,
      date_of_proposal: proposal.date_of_proposal?.toISOString?.() || proposal.date_of_proposal,
      submitted_to: proposal.submitted_to,
      'executive-summary': proposal.executive_summary,
      objectives: proposal.objectives,
      'scope-of-work-introduction': proposal.scope_of_work_introduction,
      'scope-of-work-summary': proposal.scope_of_work_summary,
      'scope-of-work': proposal.scope_of_work,
      start_date: proposal.start_date?.toISOString?.() || proposal.start_date,
      end_date: proposal.end_date?.toISOString?.() || proposal.end_date,
      'training-and-support': proposal.training_and_support,
      'duration-business-days': proposal.duration_business_days?.toString(),
      'team-structure-min-experiance': proposal.team_structure_min_experience?.toString(),
      'team-structure-table': teamTableWithHeader,
      'implementation-timeline-table': timelineTableWithHeader,
    };

    const html = this.templatesService.renderTemplate(template.html, templateData);
    this.logger.log(`[RENDER] Template rendered - ${html.length} characters`);

    return { html };
  }

  async markProposalFailed(proposalId: string, errorMessage: string): Promise<void> {
    this.logger.log(`[FAIL] Marking proposal ${proposalId} as failed...`);
    this.logger.log(`[FAIL] Error: ${errorMessage.substring(0, 200)}`);

    const result = await this.proposalRepository.update(
      { id: proposalId },
      { status: 'failed' },
    );

    if (result.affected === 0) {
      this.logger.error(`[FAIL] Could not update status: Proposal not found`);
    } else {
      this.logger.log(`[FAIL] Proposal ${proposalId} marked as failed`);
    }
  }
}
