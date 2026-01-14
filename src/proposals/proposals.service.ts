import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { GenerateProposalDto } from "./dto/generate-proposal.dto";
import {
  Proposal,
  ProposalJobData,
  GeneralInfoOutput,
  ScopeOutput,
  TimelineOutput,
} from "./entities/proposal.entity";
import { TemplatesService } from "../templates/templates.service";
import { DataTransformService } from "../common/data-transform.service";

@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,
    @InjectQueue("proposal-generation") private proposalQueue: Queue,
    private templatesService: TemplatesService,
    private dataTransformService: DataTransformService
  ) {
    this.logger.log(`[INIT] ProposalsService initialized with TypeORM`);
  }

  async generateProposal(dto: GenerateProposalDto): Promise<{ id: string }> {
    this.logger.log(`========================================`);
    this.logger.log(`[API] POST /proposals/generate`);

    if (dto.proposal_id) {
      // RETRY MODE - Create new proposal based on existing one
      this.logger.log(
        `[API] RETRY MODE - Creating new version based on proposal: ${dto.proposal_id}`
      );
      return this.createRetryProposal(dto);
    } else {
      // NEW MODE - Create fresh proposal
      this.logger.log(`[API] NEW MODE - Creating fresh proposal`);
      return this.createNewProposal(dto);
    }
  }

  private async createNewProposal(
    dto: GenerateProposalDto
  ): Promise<{ id: string }> {
    const subscriptionId = dto.subscription_id || dto.organization_id;
    this.logger.log(`[NEW] subscription_id: ${subscriptionId}`);
    this.logger.log(`[NEW] template_id: ${dto.template_id}`);
    this.logger.log(`[NEW] created_by: ${dto.created_by}`);
    this.logger.debug(`[NEW] Full DTO: ${JSON.stringify(dto, null, 2)}`);

    this.logger.log(`[NEW] Creating proposal row in PostgreSQL...`);

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
      date_of_proposal: dto.date_of_proposal
        ? new Date(dto.date_of_proposal)
        : undefined,
      milestones: dto.milestones,
      total_budget: dto.total_budget,
      currency: dto.currency,
      billing_type: dto.billing_type,
      team_members: dto.team_members,
      submitted_to: dto.submitted_to,
      status: "processing",
      version_number: 1,
    });

    const savedProposal = await this.proposalRepository.save(proposal);
    const proposalId = savedProposal.id;
    this.logger.log(
      `[NEW] Proposal created with ID: ${proposalId} (version: 1)`
    );

    await this.queueProposalJob(savedProposal, dto);

    this.logger.log(`[API] Returning id: ${proposalId}`);
    this.logger.log(`========================================`);

    return { id: proposalId };
  }

  private async createRetryProposal(
    dto: GenerateProposalDto
  ): Promise<{ id: string }> {
    const parentId = dto.proposal_id!;
    this.logger.log(`[RETRY] Fetching parent proposal: ${parentId}`);

    // 1. Fetch parent proposal
    const parent = await this.proposalRepository.findOne({
      where: { id: parentId },
    });

    if (!parent) {
      this.logger.error(`[RETRY] Parent proposal not found: ${parentId}`);
      throw new Error(`Parent proposal not found: ${parentId}`);
    }

    this.logger.log(
      `[RETRY] Parent proposal found - version: ${parent.version_number}`
    );

    // 2. Calculate next version number
    const nextVersion = await this.getNextVersionNumber(parentId);
    this.logger.log(`[RETRY] Next version number: ${nextVersion}`);

    // 3. Determine pinecone_namespace
    const hasNewDocuments =
      dto.document_storage_paths && dto.document_storage_paths.length > 0;
    const hasNewAudio =
      dto.audio_storage_paths && dto.audio_storage_paths.length > 0;

    let pineconeNamespace: string | undefined = undefined;
    if (hasNewDocuments || hasNewAudio) {
      this.logger.log(
        `[RETRY] New documents/audio provided - will create fresh index`
      );
      pineconeNamespace = undefined;
    } else {
      this.logger.log(
        `[RETRY] No new documents - looking up latest namespace in chain...`
      );
      pineconeNamespace = await this.getLatestNamespaceInChain(parentId);
      if (pineconeNamespace) {
        this.logger.log(`[RETRY] Reusing namespace: ${pineconeNamespace}`);
      } else {
        this.logger.log(
          `[RETRY] No namespace found in chain - will create fresh index`
        );
      }
    }

    // 4. Create new proposal (use DTO values if provided, else copy from parent)
    const subscriptionId =
      dto.subscription_id || dto.organization_id || parent.subscription_id;

    const newProposal = this.proposalRepository.create({
      parent_id: parentId,
      version_number: nextVersion,
      pinecone_namespace: pineconeNamespace,
      subscription_id: subscriptionId,
      template_id: dto.template_id || parent.template_id,
      created_by: dto.created_by || parent.created_by,
      title: dto.title ?? parent.title,
      client_name: dto.client_name ?? parent.client_name,
      client_email: dto.client_email ?? parent.client_email,
      links: dto.links ?? parent.links,
      industry: dto.industry ?? parent.industry,
      audio_storage_paths:
        dto.audio_storage_paths ?? parent.audio_storage_paths,
      document_storage_paths:
        dto.document_storage_paths ?? parent.document_storage_paths,
      summary: dto.summary ?? parent.summary,
      goals: dto.goals ?? parent.goals,
      scope: dto.scope ?? parent.scope,
      deliverables: dto.deliverables ?? parent.deliverables,
      start_date: dto.start_date ? new Date(dto.start_date) : parent.start_date,
      end_date: dto.end_date ? new Date(dto.end_date) : parent.end_date,
      date_of_proposal: dto.date_of_proposal
        ? new Date(dto.date_of_proposal)
        : parent.date_of_proposal,
      milestones: dto.milestones ?? parent.milestones,
      total_budget: dto.total_budget ?? parent.total_budget,
      currency: dto.currency ?? parent.currency,
      billing_type: dto.billing_type ?? parent.billing_type,
      team_members: dto.team_members ?? parent.team_members,
      submitted_to: dto.submitted_to ?? parent.submitted_to,
      status: "processing",
    });

    const savedProposal = await this.proposalRepository.save(newProposal);
    const proposalId = savedProposal.id;
    this.logger.log(
      `[RETRY] New proposal created: ${proposalId} (parent: ${parentId}, version: ${nextVersion})`
    );

    await this.queueProposalJob(savedProposal, dto);

    this.logger.log(`[API] Returning id: ${proposalId}`);
    this.logger.log(`========================================`);

    return { id: proposalId };
  }

  private async getNextVersionNumber(proposalId: string): Promise<number> {
    // Find the root proposal (trace back to the original)
    let rootId = proposalId;
    let current = await this.proposalRepository.findOne({
      where: { id: proposalId },
      select: ["parent_id", "version_number"],
    });

    while (current?.parent_id) {
      rootId = current.parent_id;
      current = await this.proposalRepository.findOne({
        where: { id: current.parent_id },
        select: ["parent_id", "version_number"],
      });
    }

    // Find max version number in the entire chain (root + all descendants)
    const maxVersionResult = await this.proposalRepository
      .createQueryBuilder("proposal")
      .select("MAX(proposal.version_number)", "maxVersion")
      .where("proposal.id = :rootId OR proposal.parent_id = :rootId", {
        rootId,
      })
      .orWhere(
        "proposal.parent_id IN (SELECT id FROM proposals WHERE parent_id = :rootId)",
        { rootId }
      )
      .getRawOne();

    const maxVersion = maxVersionResult?.maxVersion || 1;
    this.logger.log(
      `[VERSION] Root proposal: ${rootId}, Max version in chain: ${maxVersion}`
    );

    return maxVersion + 1;
  }

  private async getLatestNamespaceInChain(
    proposalId: string
  ): Promise<string | undefined> {
    this.logger.log(
      `[NAMESPACE] Looking up latest namespace in chain for proposal: ${proposalId}`
    );

    // 1. Find root proposal (trace back through parent_id chain)
    let rootId = proposalId;
    let current = await this.proposalRepository.findOne({
      where: { id: proposalId },
      select: ["parent_id"],
    });

    while (current?.parent_id) {
      rootId = current.parent_id;
      current = await this.proposalRepository.findOne({
        where: { id: current.parent_id },
        select: ["parent_id"],
      });
    }

    this.logger.log(`[NAMESPACE] Root proposal in chain: ${rootId}`);

    // 2. Find proposal with highest version_number that has a non-null namespace
    const latestWithNamespace = await this.proposalRepository
      .createQueryBuilder("proposal")
      .select(["proposal.version_number", "proposal.pinecone_namespace"])
      .where("proposal.id = :rootId OR proposal.parent_id = :rootId", {
        rootId,
      })
      .orWhere(
        "proposal.parent_id IN (SELECT id FROM proposals WHERE parent_id = :rootId)",
        { rootId }
      )
      .andWhere("proposal.pinecone_namespace IS NOT NULL")
      .orderBy("proposal.version_number", "DESC")
      .getOne();

    if (latestWithNamespace?.pinecone_namespace) {
      this.logger.log(
        `[NAMESPACE] Found latest namespace from version ${latestWithNamespace.version_number}: ${latestWithNamespace.pinecone_namespace}`
      );
      return latestWithNamespace.pinecone_namespace;
    }

    this.logger.log(`[NAMESPACE] No namespace found in chain`);
    return undefined;
  }

  private async queueProposalJob(
    proposal: Proposal,
    dto: GenerateProposalDto
  ): Promise<void> {
    const jobData: ProposalJobData = {
      id: proposal.id,
      subscription_id: proposal.subscription_id,
      template_id: proposal.template_id,
      created_by: proposal.created_by,
      title: proposal.title,
      client_name: proposal.client_name,
      client_email: proposal.client_email,
      links: proposal.links,
      industry: proposal.industry,
      audio_storage_paths: proposal.audio_storage_paths,
      document_storage_paths: proposal.document_storage_paths,
      summary: proposal.summary,
      goals: proposal.goals,
      scope: proposal.scope,
      deliverables: proposal.deliverables,
      start_date: proposal.start_date?.toISOString?.() || undefined,
      end_date: proposal.end_date?.toISOString?.() || undefined,
      date_of_proposal: proposal.date_of_proposal?.toISOString?.() || undefined,
      milestones: proposal.milestones as object[],
      total_budget: proposal.total_budget,
      currency: proposal.currency,
      billing_type: proposal.billing_type,
      team_members: proposal.team_members as object[],
      submitted_to: proposal.submitted_to,
    };

    this.logger.log(`[QUEUE] Adding job to proposal-generation queue...`);

    const job = await this.proposalQueue.add("generate", jobData, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    });

    this.logger.log(`[QUEUE] Job added - ID: ${job.id}`);
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
    this.logger.debug(
      `[API] Proposal data: ${JSON.stringify(proposal, null, 2)}`
    );

    return proposal;
  }

  async saveProposal(
    jobData: ProposalJobData,
    generalInfo: GeneralInfoOutput,
    scope: ScopeOutput,
    timeline: TimelineOutput
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
        status: "approval_pending",
        executive_summary: generalInfo["executive-summary"],
        objectives: generalInfo.objectives,
        training_and_support: generalInfo["training-and-support"],
        team_structure_min_experience: parseIntSafe(
          generalInfo["team-structure-min-experiance"]
        ),
        team_structure_table: generalInfo["team-structure-table"],
        scope_of_work_introduction: scope["scope-of-work-introduction"],
        scope_of_work_summary: scope["scope-of-work-summary"],
        scope_of_work: scope["scope-of-work"],
        duration_business_days: parseIntSafe(
          timeline["duration-business-days"]
        ),
        implementation_timeline_table:
          timeline["implementation-timeline-table"],
      }
    );

    if (result.affected === 0) {
      this.logger.error(
        `[SAVE] FAILED - No proposal found with id ${jobData.id}`
      );
      throw new Error(`Failed to save proposal: Proposal not found`);
    }

    this.logger.log(
      `[SAVE] SUCCESS - Proposal ${jobData.id} updated with status: approval_pending`
    );
  }

  async renderProposal(proposalId: string): Promise<{ html: string }> {
    this.logger.log(`[RENDER] Rendering proposal ${proposalId}...`);

    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
    });

    if (!proposal) {
      this.logger.error(`[RENDER] Proposal ${proposalId} not found`);
      throw new Error("Proposal not found");
    }

    if (!proposal.template_id) {
      this.logger.error(`[RENDER] Proposal ${proposalId} has no template_id`);
      throw new Error("Proposal has no template assigned");
    }

    const template = await this.templatesService.fetchTemplate(
      proposal.template_id
    );
    this.logger.log(`[RENDER] Template fetched: ${template.name}`);

    // Map proposal data to template expected format (snake_case keys to match template)
    const templateData: Record<string, any> = {
      // Cover page
      project_name: proposal.title,
      client_name: proposal.client_name,
      current_date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),

      // About Us page
      executive_summary: proposal.executive_summary,
      objectives: proposal.objectives,

      // Our Team page
      team_structure_min_experience:
        proposal.team_structure_min_experience?.toString(),
      team_structure_table_rows: this.renderTeamTableRows(
        proposal.team_structure_table as any[]
      ),

      // Our Services page
      training_and_support: proposal.training_and_support,

      // Scope of Work page
      scope_of_work_introduction: proposal.scope_of_work_introduction,
      scope_of_work_summary: proposal.scope_of_work_summary,
      scope_of_work: proposal.scope_of_work,

      // Pricing & Timeline page
      duration_business_days: proposal.duration_business_days?.toString(),
      implementation_timeline_table_rows: this.renderTimelineTableRows(
        proposal.implementation_timeline_table as any[]
      ),

      // Next Steps page
      status: proposal.status,
    };

    const html = this.templatesService.renderTemplate(
      template.html,
      templateData
    );
    this.logger.log(`[RENDER] Template rendered - ${html.length} characters`);

    return { html };
  }

  async updateNamespace(proposalId: string, namespace: string): Promise<void> {
    this.logger.log(`[NAMESPACE] Saving Pinecone namespace to database...`);
    this.logger.log(`[NAMESPACE] Proposal ID: ${proposalId}`);
    this.logger.log(`[NAMESPACE] Namespace: ${namespace}`);

    const result = await this.proposalRepository.update(
      { id: proposalId },
      { pinecone_namespace: namespace }
    );

    if (result.affected === 0) {
      this.logger.error(
        `[NAMESPACE] FAILED - No proposal found with id ${proposalId}`
      );
    } else {
      this.logger.log(
        `[NAMESPACE] SUCCESS - Namespace saved to pinecone_namespace column`
      );
    }
  }

  async getProposalNamespace(proposalId: string): Promise<string | null> {
    this.logger.log(
      `[NAMESPACE] Checking for existing namespace in database...`
    );
    this.logger.log(`[NAMESPACE] Proposal ID: ${proposalId}`);

    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
      select: ["pinecone_namespace"],
    });

    const namespace = proposal?.pinecone_namespace || null;

    if (namespace) {
      this.logger.log(`[NAMESPACE] FOUND existing namespace: ${namespace}`);
    } else {
      this.logger.log(
        `[NAMESPACE] No namespace found - first attempt or not yet indexed`
      );
    }

    return namespace;
  }

  async markProposalFailed(
    proposalId: string,
    errorMessage: string
  ): Promise<void> {
    this.logger.log(`[FAIL] Marking proposal ${proposalId} as failed...`);
    this.logger.log(`[FAIL] Error: ${errorMessage.substring(0, 200)}`);

    const result = await this.proposalRepository.update(
      { id: proposalId },
      { status: "failed" }
    );

    if (result.affected === 0) {
      this.logger.error(`[FAIL] Could not update status: Proposal not found`);
    } else {
      this.logger.log(`[FAIL] Proposal ${proposalId} marked as failed`);
    }
  }

  async findAllByOrganization(
    organizationId: string,
    filters?: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
    }
  ): Promise<{
    proposals: Proposal[];
    meta: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }> {
    this.logger.log(
      `[FIND] Finding proposals for organization: ${organizationId}`
    );
    this.logger.log(`[FIND] Filters: ${JSON.stringify(filters)}`);

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    // Build query with join to subscriptions table
    // Join: proposals -> subscriptions -> organizations (via organization_id)
    const queryBuilder = this.proposalRepository
      .createQueryBuilder("proposal")
      .innerJoin(
        "subscriptions",
        "subscription",
        "subscription.id = proposal.subscription_id"
      )
      .where("subscription.organization_id = :organizationId", {
        organizationId,
      })
      .andWhere("proposal.is_deleted = :isDeleted", { isDeleted: false });

    // Apply status filter
    if (filters?.status) {
      queryBuilder.andWhere("proposal.status = :status", {
        status: filters.status,
      });
    }

    // Apply search filter
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      queryBuilder.andWhere(
        "(proposal.title ILIKE :search OR proposal.client_name ILIKE :search)",
        { search: searchTerm }
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination and ordering
    const proposals = await queryBuilder
      .orderBy("proposal.created_at", "DESC")
      .skip(skip)
      .take(limit)
      .getMany();

    const total_pages = Math.ceil(total / limit);

    this.logger.log(
      `[FIND] Found ${proposals.length} proposals (total: ${total})`
    );

    return {
      proposals,
      meta: {
        page,
        limit,
        total,
        total_pages,
      },
    };
  }

  async count(): Promise<{ count: number }> {
    this.logger.log(`[COUNT] Counting all proposals`);

    const count = await this.proposalRepository.count();

    this.logger.log(`[COUNT] Total proposals: ${count}`);

    return { count };
  }

  async softDeleteProposal(
    proposalId: string,
    organizationId: string
  ): Promise<void> {
    this.logger.log(
      `[DELETE] Soft deleting proposal: ${proposalId} for organization: ${organizationId}`
    );

    // Find proposal and verify it belongs to the organization
    const proposal = await this.proposalRepository
      .createQueryBuilder("proposal")
      .innerJoin(
        "subscriptions",
        "subscription",
        "subscription.id = proposal.subscription_id"
      )
      .where("proposal.id = :proposalId", { proposalId })
      .andWhere("subscription.organization_id = :organizationId", {
        organizationId,
      })
      .andWhere("proposal.is_deleted = :isDeleted", { isDeleted: false })
      .getOne();

    if (!proposal) {
      this.logger.warn(
        `[DELETE] Proposal not found or already deleted: ${proposalId}`
      );
      throw new HttpException(
        "Proposal not found or already deleted",
        HttpStatus.NOT_FOUND
      );
    }

    // Soft delete by setting is_deleted = true
    proposal.is_deleted = true;
    proposal.updated_at = new Date();

    await this.proposalRepository.save(proposal);

    this.logger.log(
      `[DELETE] Proposal ${proposalId} soft deleted successfully`
    );
  }

  private renderTeamTableRows(table: any[]): string {
    if (!table || table.length === 0) return "";
    return table
      .map(
        (row) => `
      <tr>
        <td>${row.Designation || ""}</td>
        <td>${row.Count || ""}</td>
        <td>${row.Experience || ""}</td>
        <td>${row["Key Responsibilities"] || ""}</td>
      </tr>
    `
      )
      .join("");
  }

  private renderTimelineTableRows(table: any[]): string {
    if (!table || table.length === 0) return "";
    return table
      .map(
        (row) => `
      <tr>
        <td>${row.phase || ""}</td>
        <td>${row.scope || ""}</td>
        <td>${row.timeline || ""}</td>
      </tr>
    `
      )
      .join("");
  }
}
