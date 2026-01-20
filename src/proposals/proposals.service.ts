import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { marked } from "marked";
import Handlebars from "handlebars";
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
import { StorageService } from "../storage/storage.service";
import { KnowledgeBaseService } from "../knowledge-base/knowledge-base.service";
import { AIService } from "../ai/ai.service";
import {
  ExtractedFields,
  ExtractFieldsResponse,
} from "./interfaces/extracted-fields.interface";

@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,
    @InjectQueue("proposal-generation") private proposalQueue: Queue,
    private templatesService: TemplatesService,
    private dataTransformService: DataTransformService,
    private storageService: StorageService,
    private knowledgeBaseService: KnowledgeBaseService,
    private aiService: AIService
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

  async findOneByOrganization(
    proposalId: string,
    organizationId: string
  ): Promise<Proposal | null> {
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
    // Convert markdown syntax (###, **, -, etc.) to HTML for text fields
    const templateData: Record<string, any> = {
      // Cover page
      project_name: proposal.title,
      client_name: proposal.client_name,
      date_of_proposal: proposal.date_of_proposal
        ? new Date(proposal.date_of_proposal).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "",
      submitted_to: proposal.submitted_to,

      // About Us page - convert markdown to HTML
      executive_summary: this.convertMarkdownToHtml(proposal.executive_summary),
      objectives: this.convertMarkdownToHtml(proposal.objectives),

      // Our Team page
      team_structure_min_experience:
        proposal.team_structure_min_experience?.toString(),
      team_structure_table_rows: this.renderTeamTableRows(
        proposal.team_structure_table as any[]
      ),

      // Our Services page - convert markdown to HTML
      training_and_support: this.convertMarkdownToHtml(proposal.training_and_support),

      // Scope of Work page - convert markdown to HTML
      scope_of_work_introduction: this.convertMarkdownToHtml(proposal.scope_of_work_introduction),
      scope_of_work_summary: this.convertMarkdownToHtml(proposal.scope_of_work_summary),
      scope_of_work: this.convertMarkdownToHtml(proposal.scope_of_work),

      // Pricing & Timeline page
      duration_business_days: proposal.duration_business_days?.toString(),
      implementation_timeline_table_rows: this.renderTimelineTableRows(
        proposal.implementation_timeline_table as any[]
      ),

      // Next Steps page
      status: proposal.status,
    };

    let html = this.templatesService.renderTemplate(
      template.html,
      templateData
    );

    // Inject CSS for styling markdown content inside placeholders
    const markdownStyles = `
    <style>
      /* Style for placeholder containers with markdown content (p and div with nested HTML) */
      p.placeholder:has(p, ul, ol, h1, h2, h3, h4, h5, h6),
      div.placeholder:has(p, ul, ol, h1, h2, h3, h4, h5, h6) {
        background: transparent !important;
        color: inherit !important;
        white-space: normal !important;
      }

      /* Fallback for browsers that don't support :has() */
      p.placeholder > p:first-child,
      p.placeholder > ul:first-child,
      p.placeholder > ol:first-child,
      div.placeholder > p:first-child,
      div.placeholder > ul:first-child,
      div.placeholder > h2:first-child {
        margin-top: 0;
      }

      /* Style headings ONLY inside .placeholder (markdown converted content) */
      .placeholder h1 {
        font-size: 1.5em;
        font-weight: bold;
        color: var(--primary-color, #2c3e50);
        margin-top: 1em;
        margin-bottom: 0.5em;
        border-bottom: 2px solid var(--accent-color, #3498db);
        padding-bottom: 0.3em;
      }

      .placeholder h2 {
        font-size: 1.3em;
        font-weight: bold;
        color: var(--primary-color, #2c3e50);
        margin-top: 1em;
        margin-bottom: 0.5em;
        border-bottom: 1px solid #ddd;
        padding-bottom: 0.2em;
      }

      .placeholder h3 {
        font-size: 1.1em;
        font-weight: bold;
        color: var(--primary-color, #2c3e50);
        margin-top: 0.8em;
        margin-bottom: 0.4em;
      }

      .placeholder h4,
      .placeholder h5,
      .placeholder h6 {
        font-size: 1em;
        font-weight: bold;
        color: var(--primary-color, #2c3e50);
        margin-top: 0.5em;
        margin-bottom: 0.3em;
      }

      /* Ensure content sections can flow */
      .placeholder p {
        margin-top: 0.5em;
        margin-bottom: 0.5em;
        line-height: 1.6;
      }

      .placeholder ul,
      .placeholder ol {
        margin-top: 0.5em;
        margin-bottom: 0.5em;
        padding-left: 1.5em;
      }

      .placeholder li {
        margin-bottom: 0.3em;
        line-height: 1.5;
      }

      .placeholder strong {
        font-weight: bold;
      }

      .placeholder em {
        font-style: italic;
      }
    </style>
    `;

    // Inject the markdown styles before </head>
    html = html.replace('</head>', `${markdownStyles}</head>`);

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

  private convertMarkdownToHtml(text: string | undefined | null): Handlebars.SafeString {
    if (!text) return new Handlebars.SafeString("");
    const html = marked.parse(text) as string;
    return new Handlebars.SafeString(html);
  }

  async approveProposal(
    proposalId: string,
    organizationId: string,
    userId: string,
    comments?: string
  ): Promise<Proposal> {
    this.logger.log(
      `[APPROVE] Approving proposal: ${proposalId} by user: ${userId}`
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
      this.logger.warn(`[APPROVE] Proposal not found: ${proposalId}`);
      throw new HttpException("Proposal not found", HttpStatus.NOT_FOUND);
    }

    // Validate status transition
    if (proposal.status !== "approval_pending") {
      this.logger.warn(
        `[APPROVE] Invalid status transition from ${proposal.status} to completed`
      );
      throw new HttpException(
        `Cannot approve proposal with status: ${proposal.status}. Only proposals with status 'approval_pending' can be approved.`,
        HttpStatus.BAD_REQUEST
      );
    }

    // Update proposal status to completed (approved)
    proposal.status = "completed";
    proposal.approved_by = userId;
    proposal.approved_at = new Date();
    proposal.approval_comments = comments || undefined;
    proposal.updated_by = userId;
    proposal.updated_at = new Date();

    const updatedProposal = await this.proposalRepository.save(proposal);

    this.logger.log(
      `[APPROVE] Proposal ${proposalId} approved successfully by ${userId}`
    );

    return updatedProposal;
  }

  async rejectProposal(
    proposalId: string,
    organizationId: string,
    userId: string,
    reason: string
  ): Promise<Proposal> {
    this.logger.log(
      `[REJECT] Rejecting proposal: ${proposalId} by user: ${userId}`
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
      this.logger.warn(`[REJECT] Proposal not found: ${proposalId}`);
      throw new HttpException("Proposal not found", HttpStatus.NOT_FOUND);
    }

    // Validate status transition
    if (proposal.status !== "approval_pending") {
      this.logger.warn(
        `[REJECT] Invalid status transition from ${proposal.status} to rejected`
      );
      throw new HttpException(
        `Cannot reject proposal with status: ${proposal.status}. Only proposals with status 'approval_pending' can be rejected.`,
        HttpStatus.BAD_REQUEST
      );
    }

    // Update proposal status to rejected
    proposal.status = "rejected";
    proposal.approved_by = userId;
    proposal.approved_at = new Date();
    proposal.rejection_reason = reason;
    proposal.updated_by = userId;
    proposal.updated_at = new Date();

    const updatedProposal = await this.proposalRepository.save(proposal);

    this.logger.log(
      `[REJECT] Proposal ${proposalId} rejected by ${userId}. Reason: ${reason}`
    );

    return updatedProposal;
  }

  async extractFieldsFromUploads(
    documentUrls: string[],
    audioUrls: string[] = []
  ): Promise<ExtractFieldsResponse> {
    const totalStartTime = Date.now();
    this.logger.log(`[EXTRACT] Starting field extraction`);
    this.logger.log(
      `[EXTRACT] Documents: ${documentUrls.length}, Audio: ${audioUrls.length}`
    );

    let combinedDocumentText = "";
    let combinedAudioText = "";

    // Process documents
    for (const url of documentUrls) {
      try {
        const docStartTime = Date.now();
        this.logger.log(
          `[EXTRACT] Downloading document: ${url.substring(0, 80)}...`
        );
        const buffer = await this.storageService.downloadDocument(url);
        this.logger.log(`[EXTRACT] Download took ${Date.now() - docStartTime}ms`);

        // Determine MIME type from URL
        const parseStartTime = Date.now();
        const mimeType = this.getMimeTypeFromUrl(url);
        const text = await this.knowledgeBaseService.parseDocument(
          buffer,
          mimeType
        );
        this.logger.log(`[EXTRACT] Parse took ${Date.now() - parseStartTime}ms`);

        combinedDocumentText += text + "\n\n";
        this.logger.log(`[EXTRACT] Parsed document: ${text.length} chars`);
      } catch (error: any) {
        this.logger.warn(
          `[EXTRACT] Failed to process document: ${error.message}`
        );
      }
    }

    // Process audio files
    for (const url of audioUrls) {
      try {
        const audioStartTime = Date.now();
        this.logger.log(
          `[EXTRACT] Downloading audio: ${url.substring(0, 80)}...`
        );
        const buffer = await this.storageService.downloadAudio(url);
        this.logger.log(`[EXTRACT] Audio download took ${Date.now() - audioStartTime}ms`);

        const transcribeStartTime = Date.now();
        const transcription = await this.aiService.transcribeAudio(buffer);
        this.logger.log(`[EXTRACT] Transcription took ${Date.now() - transcribeStartTime}ms`);

        combinedAudioText += transcription + "\n\n";
        this.logger.log(
          `[EXTRACT] Transcribed audio: ${transcription.length} chars`
        );
      } catch (error: any) {
        this.logger.warn(`[EXTRACT] Failed to process audio: ${error.message}`);
      }
    }

    // Truncate content if too long (100KB max for GPT processing)
    const MAX_CONTENT_LENGTH = 100000;
    if (combinedDocumentText.length > MAX_CONTENT_LENGTH) {
      combinedDocumentText = combinedDocumentText.substring(
        0,
        MAX_CONTENT_LENGTH
      );
      this.logger.warn(
        `[EXTRACT] Document content truncated to ${MAX_CONTENT_LENGTH} chars`
      );
    }

    // Extract fields using AI
    const aiStartTime = Date.now();
    this.logger.log(`[EXTRACT] Calling AI extraction with ${combinedDocumentText.length} doc chars, ${combinedAudioText.length} audio chars`);
    const fields = await this.aiService.extractFieldsFromContent(
      combinedDocumentText,
      combinedAudioText
    );
    this.logger.log(`[EXTRACT] AI extraction took ${Date.now() - aiStartTime}ms`);

    // Determine confidence based on content quality
    const confidence = this.calculateExtractionConfidence(
      combinedDocumentText.length,
      combinedAudioText.length,
      Object.keys(fields).length
    );

    this.logger.log(`[EXTRACT] Total extraction time: ${Date.now() - totalStartTime}ms`);

    return {
      success: true,
      fields,
      sources: {
        documents: documentUrls.length,
        audio: audioUrls.length,
      },
      confidence,
    };
  }

  private getMimeTypeFromUrl(url: string): string {
    const lower = url.toLowerCase();
    if (lower.includes(".pdf")) return "application/pdf";
    if (lower.includes(".docx"))
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (lower.includes(".doc")) return "application/msword";
    return "application/octet-stream";
  }

  private calculateExtractionConfidence(
    docLength: number,
    audioLength: number,
    fieldsExtracted: number
  ): "high" | "medium" | "low" {
    const totalContent = docLength + audioLength;
    if (totalContent > 5000 && fieldsExtracted >= 8) return "high";
    if (totalContent > 1000 && fieldsExtracted >= 4) return "medium";
    return "low";
  }
}
