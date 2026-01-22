import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ProposalsService } from "./proposals.service";
import { GenerateProposalDto } from "./dto/generate-proposal.dto";
import { ApproveProposalDto } from "./dto/approve-proposal.dto";
import { RejectProposalDto } from "./dto/reject-proposal.dto";
import { ExtractFieldsDto } from "./dto/extract-fields.dto";
import { CreateDraftDto } from "./dto/create-draft.dto";
import { UpdateDraftDto } from "./dto/update-draft.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@ApiTags("proposals")
@ApiBearerAuth("JWT-auth")
@Controller("product/proposals")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProposalsController {
  private readonly logger = new Logger(ProposalsController.name);

  constructor(
    private readonly proposalsService: ProposalsService,
    @InjectQueue("proposal-generation") private readonly proposalQueue: Queue
  ) {}

  @Post("generate")
  @ApiOperation({
    summary: "Generate a new proposal",
    description:
      "Initiates the generation of a new proposal using AI. The proposal is processed asynchronously via a queue. Returns a proposal ID that can be used to check status and retrieve results.",
  })
  @ApiResponse({
    status: 200,
    description: "Proposal generation initiated successfully",
    schema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Proposal ID for tracking",
          example: "123e4567-e89b-12d3-a456-426614174000",
        },
        status: {
          type: "string",
          description: "Initial status",
          example: "pending",
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async generateProposal(@Body() dto: GenerateProposalDto) {
    this.logger.log(`[REQUEST] POST /product/proposals/generate`);

    const startTime = Date.now();
    const result = await this.proposalsService.generateProposal(dto);

    this.logger.log(
      `[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`
    );
    return result;
  }

  @Post("extract-fields")
  @ApiOperation({
    summary: "Extract form fields from uploaded documents and audio",
    description:
      "Parses uploaded documents (PDF, DOCX) and transcribes audio files to extract proposal form fields using AI. Returns extracted data that can be used to auto-populate the form.",
  })
  @ApiResponse({
    status: 200,
    description: "Fields extracted successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        fields: {
          type: "object",
          properties: {
            title: { type: "string" },
            clientName: { type: "string" },
            clientEmail: { type: "string" },
            industry: { type: "string" },
            summary: { type: "string" },
            goals: { type: "string" },
            scope: { type: "string" },
            startDate: { type: "string" },
            endDate: { type: "string" },
            totalBudget: { type: "number" },
            currency: { type: "string" },
            billingType: { type: "string" },
            deliverables: { type: "array", items: { type: "string" } },
            milestones: { type: "array" },
            teamMembers: { type: "array" },
            links: { type: "array", items: { type: "string" } },
            recipients: { type: "array" },
          },
        },
        sources: {
          type: "object",
          properties: {
            documents: { type: "number" },
            audio: { type: "number" },
          },
        },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Bad request - no files provided" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async extractFields(@Body() dto: ExtractFieldsDto) {
    this.logger.log(`[REQUEST] POST /product/proposals/extract-fields`);
    this.logger.log(
      `[REQUEST] Documents: ${dto.document_urls?.length || 0}, Audio: ${dto.audio_urls?.length || 0}`
    );

    if (
      (!dto.document_urls || dto.document_urls.length === 0) &&
      (!dto.audio_urls || dto.audio_urls.length === 0)
    ) {
      throw new HttpException(
        "At least one document or audio URL is required",
        HttpStatus.BAD_REQUEST
      );
    }

    const startTime = Date.now();
    const result = await this.proposalsService.extractFieldsFromUploads(
      dto.document_urls || [],
      dto.audio_urls || []
    );

    this.logger.log(
      `[RESPONSE] 200 OK - extracted ${Object.keys(result.fields).length} fields - ${Date.now() - startTime}ms`
    );

    return result;
  }

  @Get("health/queue")
  @ApiOperation({
    summary: "Check proposal queue health",
    description:
      "Checks the health status of the proposal generation queue and Redis connection. Creates a test job to verify queue functionality.",
  })
  @ApiResponse({
    status: 200,
    description: "Queue health check successful",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "ok" },
        queue: { type: "string", example: "proposal-generation" },
        redis: { type: "string", example: "connected" },
        counts: {
          type: "object",
          properties: {
            waiting: { type: "number", example: 5 },
            active: { type: "number", example: 2 },
            completed: { type: "number", example: 100 },
            failed: { type: "number", example: 1 },
          },
        },
        testJob: {
          type: "object",
          properties: {
            id: { type: "string", example: "job-123" },
            name: { type: "string", example: "health-check" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: "Service unavailable - queue connection failed",
  })
  async checkQueueHealth() {
    this.logger.log(`[REQUEST] GET /product/proposals/health/queue`);

    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.proposalQueue.getWaitingCount(),
        this.proposalQueue.getActiveCount(),
        this.proposalQueue.getCompletedCount(),
        this.proposalQueue.getFailedCount(),
      ]);

      const testJob = await this.proposalQueue.add("health-check", {
        test: true,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `[RESPONSE] Queue health check passed - job ${testJob.id} added`
      );

      return {
        status: "ok",
        queue: "proposal-generation",
        redis: "connected",
        counts: { waiting, active, completed, failed },
        testJob: { id: testJob.id, name: testJob.name },
      };
    } catch (error) {
      this.logger.error(
        `[RESPONSE] Queue health check failed: ${error.message}`
      );
      throw new HttpException(
        { status: "error", message: error.message },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  @Get()
  @RequirePermission("read_proposals_product")
  @ApiOperation({
    summary: "Get all proposals by organization",
    description:
      "Retrieves all proposals for the authenticated user's organization. Supports pagination and filtering. Requires read_proposals_product permission.",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number (default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page (default: 10)",
  })
  @ApiQuery({
    name: "status",
    required: false,
    type: String,
    description: "Filter by status",
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "Search in title and client_name",
  })
  @ApiResponse({
    status: 200,
    description: "Proposals retrieved successfully",
    schema: {
      type: "object",
      properties: {
        proposals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              client_name: { type: "string" },
              client_email: { type: "string" },
              industry: { type: "string" },
              total_budget: { type: "number" },
              currency: { type: "string" },
              status: { type: "string" },
              date_of_proposal: { type: "string", format: "date" },
              created_at: { type: "string", format: "date-time" },
            },
          },
        },
        meta: {
          type: "object",
          properties: {
            page: { type: "number" },
            limit: { type: "number" },
            total: { type: "number" },
            total_pages: { type: "number" },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async findAll(
    @CurrentUser("organization_id") organizationId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("search") search?: string
  ) {
    this.logger.log(
      `[REQUEST] GET /product/proposals - organization_id: ${organizationId}`
    );

    const startTime = Date.now();
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const result = await this.proposalsService.findAllByOrganization(
      organizationId,
      {
        page: pageNum,
        limit: limitNum,
        status,
        search,
      }
    );

    this.logger.log(
      `[RESPONSE] 200 OK - found ${result.proposals.length} proposals - ${
        Date.now() - startTime
      }ms`
    );

    return result;
  }

  @Get("count")
  @RequirePermission("view_dashboard")
  @ApiOperation({
    summary: "Get proposal count",
    description:
      "Returns the total count of proposals. Requires view_dashboard permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Proposal count retrieved successfully",
    schema: {
      type: "object",
      properties: {
        count: { type: "number", example: 150 },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async count() {
    this.logger.log(`[REQUEST] GET /product/proposals/count`);

    const startTime = Date.now();
    const result = await this.proposalsService.count();

    this.logger.log(
      `[RESPONSE] 200 OK - count: ${result.count} - ${Date.now() - startTime}ms`
    );

    return result;
  }

  @Get(":id/render")
  @ApiOperation({
    summary: "Render proposal as HTML",
    description:
      "Renders a completed proposal as HTML. The proposal must be in completed status.",
  })
  @ApiParam({
    name: "id",
    description: "Proposal ID (UUID)",
    type: String,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Proposal rendered successfully",
    schema: {
      type: "object",
      properties: {
        html: {
          type: "string",
          description: "Rendered HTML content",
          example: "<html>...</html>",
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - proposal not ready or invalid",
  })
  @ApiResponse({ status: 404, description: "Proposal not found" })
  async renderProposal(@Param("id") id: string) {
    this.logger.log(`[REQUEST] GET /product/proposals/${id}/render`);

    const startTime = Date.now();

    try {
      const result = await this.proposalsService.renderProposal(id);
      this.logger.log(
        `[RESPONSE] 200 OK - rendered ${result.html.length} chars - ${
          Date.now() - startTime
        }ms`
      );
      return result;
    } catch (error) {
      this.logger.error(`[RESPONSE] Render failed: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(":id/status")
  @ApiOperation({
    summary: "Get proposal status",
    description:
      "Retrieves the current status of a proposal. Use this endpoint to poll for proposal completion.",
  })
  @ApiParam({
    name: "id",
    description: "Proposal ID (UUID)",
    type: String,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Proposal status retrieved successfully",
    schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["pending", "processing", "completed", "failed"],
          example: "completed",
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Proposal not found" })
  async getProposalStatus(@Param("id") id: string) {
    this.logger.log(`[REQUEST] GET /product/proposals/${id}/status`);

    const startTime = Date.now();
    const result = await this.proposalsService.getProposalResult(id);

    if (!result) {
      this.logger.warn(`[RESPONSE] 404 Not Found - id: ${id}`);
      throw new HttpException("Proposal not found", HttpStatus.NOT_FOUND);
    }

    this.logger.log(
      `[RESPONSE] 200 OK - status: ${result.status} - ${
        Date.now() - startTime
      }ms`
    );

    return {
      status: result.status,
    };
  }

  @Get(":id")
  @RequirePermission("read_proposals_product")
  @ApiOperation({
    summary: "Get proposal details",
    description:
      "Retrieves the complete proposal data including all fields. Requires read_proposals_product permission.",
  })
  @ApiParam({
    name: "id",
    description: "Proposal ID (UUID)",
    type: String,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Proposal retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Proposal not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async getProposalDetails(
    @Param("id") id: string,
    @CurrentUser("organization_id") organizationId: string
  ) {
    this.logger.log(
      `[REQUEST] GET /product/proposals/${id} - organization_id: ${organizationId}`
    );

    const startTime = Date.now();
    const proposal = await this.proposalsService.findOneByOrganization(
      id,
      organizationId
    );

    if (!proposal) {
      this.logger.warn(`[RESPONSE] 404 Not Found - id: ${id}`);
      throw new HttpException("Proposal not found", HttpStatus.NOT_FOUND);
    }

    this.logger.log(
      `[RESPONSE] 200 OK - proposal ${id} retrieved - ${Date.now() - startTime}ms`
    );

    return proposal;
  }

  @Delete(":id")
  @RequirePermission("delete_proposals_product")
  @ApiOperation({
    summary: "Soft delete a proposal",
    description:
      "Soft deletes a proposal by setting is_deleted=true. The proposal will no longer appear in listings but data is preserved. Requires delete_proposals_product permission.",
  })
  @ApiParam({
    name: "id",
    description: "Proposal ID (UUID)",
    type: String,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Proposal soft deleted successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Proposal deleted successfully" },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Proposal not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async deleteProposal(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload
  ) {
    this.logger.log(
      `[REQUEST] DELETE /product/proposals/${id} - organization_id: ${user.organization_id}`
    );

    const startTime = Date.now();

    try {
      // Get the proposal to check its status
      const proposal = await this.proposalsService.findOneByOrganization(
        id,
        user.organization_id
      );

      if (!proposal) {
        throw new HttpException("Proposal not found", HttpStatus.NOT_FOUND);
      }

      // If proposal is completed/approved, require approval permission
      if (proposal.status === "completed") {
        const hasApprovalPermission = user.permissions?.includes(
          "approve_proposals_product"
        );
        if (!hasApprovalPermission) {
          throw new HttpException(
            "Cannot delete approved proposals without approval permission",
            HttpStatus.FORBIDDEN
          );
        }
      }

      await this.proposalsService.softDeleteProposal(id, user.organization_id);
      this.logger.log(
        `[RESPONSE] 200 OK - proposal ${id} soft deleted - ${
          Date.now() - startTime
        }ms`
      );

      return {
        success: true,
        message: "Proposal deleted successfully",
      };
    } catch (error) {
      this.logger.error(`[RESPONSE] Delete failed: ${error.message}`);
      throw error;
    }
  }

  @Post(":id/approve")
  @RequirePermission("approve_proposals_product")
  @ApiOperation({
    summary: "Approve a proposal",
    description:
      "Approves a proposal that is in approval_pending status. Changes status to completed. Requires approve_proposals_product permission.",
  })
  @ApiParam({
    name: "id",
    description: "Proposal ID (UUID)",
    type: String,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Proposal approved successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Proposal approved successfully" },
        proposal: {
          type: "object",
          properties: {
            id: { type: "string" },
            status: { type: "string", example: "completed" },
            approved_by: { type: "string" },
            approved_at: { type: "string", format: "date-time" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - invalid status transition",
  })
  @ApiResponse({ status: 404, description: "Proposal not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async approveProposal(
    @Param("id") id: string,
    @CurrentUser("organization_id") organizationId: string,
    @CurrentUser("user_id") userId: string,
    @Body() dto: ApproveProposalDto
  ) {
    this.logger.log(
      `[REQUEST] POST /product/proposals/${id}/approve - user: ${userId}`
    );

    const startTime = Date.now();

    const proposal = await this.proposalsService.approveProposal(
      id,
      organizationId,
      userId,
      dto.comments
    );

    this.logger.log(
      `[RESPONSE] 200 OK - proposal ${id} approved - ${Date.now() - startTime}ms`
    );

    return {
      success: true,
      message: "Proposal approved successfully",
      proposal: {
        id: proposal.id,
        status: proposal.status,
        approved_by: proposal.approved_by,
        approved_at: proposal.approved_at,
      },
    };
  }

  @Post(":id/reject")
  @RequirePermission("approve_proposals_product")
  @ApiOperation({
    summary: "Reject a proposal",
    description:
      "Rejects a proposal that is in approval_pending status. Changes status to rejected. Requires approve_proposals_product permission.",
  })
  @ApiParam({
    name: "id",
    description: "Proposal ID (UUID)",
    type: String,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Proposal rejected successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Proposal rejected successfully" },
        proposal: {
          type: "object",
          properties: {
            id: { type: "string" },
            status: { type: "string", example: "rejected" },
            approved_by: { type: "string" },
            approved_at: { type: "string", format: "date-time" },
            rejection_reason: { type: "string" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - invalid status transition or missing reason",
  })
  @ApiResponse({ status: 404, description: "Proposal not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async rejectProposal(
    @Param("id") id: string,
    @CurrentUser("organization_id") organizationId: string,
    @CurrentUser("user_id") userId: string,
    @Body() dto: RejectProposalDto
  ) {
    this.logger.log(
      `[REQUEST] POST /product/proposals/${id}/reject - user: ${userId}`
    );

    const startTime = Date.now();

    const proposal = await this.proposalsService.rejectProposal(
      id,
      organizationId,
      userId,
      dto.reason
    );

    this.logger.log(
      `[RESPONSE] 200 OK - proposal ${id} rejected - ${Date.now() - startTime}ms`
    );

    return {
      success: true,
      message: "Proposal rejected successfully",
      proposal: {
        id: proposal.id,
        status: proposal.status,
        approved_by: proposal.approved_by,
        approved_at: proposal.approved_at,
        rejection_reason: proposal.rejection_reason,
      },
    };
  }

  // ============================================================================
  // Draft Proposal Endpoints
  // ============================================================================

  @Post("draft")
  @RequirePermission("create_proposals_product")
  @ApiOperation({
    summary: "Create a draft proposal",
    description:
      "Creates a draft proposal and optionally queues field extraction from uploaded files. Returns the draft ID for tracking.",
  })
  @ApiResponse({
    status: 201,
    description: "Draft created successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        id: { type: "string", example: "123e4567-e89b-12d3-a456-426614174000" },
        extraction_job_id: { type: "string", nullable: true },
      },
    },
  })
  async createDraft(
    @Body() dto: CreateDraftDto,
    @CurrentUser() user: JwtPayload
  ) {
    this.logger.log(`[REQUEST] POST /product/proposals/draft`);
    const startTime = Date.now();

    // Create the draft
    const draft = await this.proposalsService.createDraft({
      template_id: dto.template_id,
      created_by: user.user_id,
      subscription_id: dto.subscription_id,
      audio_storage_paths: dto.audio_storage_paths,
      document_storage_paths: dto.document_storage_paths,
      title: dto.title,
      client_name: dto.client_name,
      client_email: dto.client_email,
      industry: dto.industry,
      summary: dto.summary,
      goals: dto.goals,
      scope: dto.scope,
    });

    // If files were provided, queue extraction
    let extractionJobId: string | null = null;
    const hasFiles =
      (dto.audio_storage_paths && dto.audio_storage_paths.length > 0) ||
      (dto.document_storage_paths && dto.document_storage_paths.length > 0);

    if (hasFiles) {
      // Generate signed URLs for the files
      const audioUrls: string[] = [];
      const documentUrls: string[] = [];

      if (dto.audio_storage_paths) {
        for (const path of dto.audio_storage_paths) {
          const fullPath = `proposal-audio/${path}`;
          const { signedUrls } = await this.proposalsService[
            "storageService"
          ].getSignedUrls([fullPath]);
          if (signedUrls[0]?.signedUrl) {
            audioUrls.push(signedUrls[0].signedUrl);
          }
        }
      }

      if (dto.document_storage_paths) {
        for (const path of dto.document_storage_paths) {
          const fullPath = `proposal-documents/${path}`;
          const { signedUrls } = await this.proposalsService[
            "storageService"
          ].getSignedUrls([fullPath]);
          if (signedUrls[0]?.signedUrl) {
            documentUrls.push(signedUrls[0].signedUrl);
          }
        }
      }

      if (audioUrls.length > 0 || documentUrls.length > 0) {
        extractionJobId = await this.proposalsService.queueExtraction(
          draft.id,
          audioUrls,
          documentUrls
        );
      }
    }

    this.logger.log(
      `[RESPONSE] 201 Created - draft ${draft.id} - ${Date.now() - startTime}ms`
    );

    return {
      success: true,
      id: draft.id,
      extraction_job_id: extractionJobId,
    };
  }

  @Patch(":id/draft")
  @RequirePermission("create_proposals_product")
  @ApiOperation({
    summary: "Update a draft proposal",
    description: "Updates fields on an existing draft proposal.",
  })
  @ApiParam({ name: "id", description: "Draft proposal ID" })
  @ApiResponse({
    status: 200,
    description: "Draft updated successfully",
  })
  async updateDraft(
    @Param("id") id: string,
    @Body() dto: UpdateDraftDto,
    @CurrentUser() user: JwtPayload
  ) {
    this.logger.log(`[REQUEST] PATCH /product/proposals/${id}/draft`);
    const startTime = Date.now();

    // Get current proposal to detect new files
    const currentProposal = await this.proposalsService.findOneById(id);
    if (!currentProposal) {
      throw new HttpException("Draft proposal not found", HttpStatus.NOT_FOUND);
    }

    // Detect new files by comparing arrays
    const currentAudioPaths = currentProposal.audio_storage_paths || [];
    const currentDocPaths = currentProposal.document_storage_paths || [];
    const newAudioPaths = dto.audio_storage_paths || currentAudioPaths;
    const newDocPaths = dto.document_storage_paths || currentDocPaths;

    // Find paths that are in new but not in current
    const addedAudioPaths = newAudioPaths.filter(
      (path) => !currentAudioPaths.includes(path)
    );
    const addedDocPaths = newDocPaths.filter(
      (path) => !currentDocPaths.includes(path)
    );

    const hasNewFiles = addedAudioPaths.length > 0 || addedDocPaths.length > 0;

    // Update the draft
    const draft = await this.proposalsService.updateDraft(id, dto);

    // If new files were added, re-queue extraction
    let extractionJobId: string | null = null;
    if (hasNewFiles) {
      this.logger.log(
        `[EXTRACTION] New files detected - audio: ${addedAudioPaths.length}, docs: ${addedDocPaths.length}`
      );

      // Generate signed URLs for ALL files (not just new ones) for re-extraction
      const audioUrls: string[] = [];
      const documentUrls: string[] = [];

      for (const path of newAudioPaths) {
        const fullPath = `proposal-audio/${path}`;
        const { signedUrls } = await this.proposalsService[
          "storageService"
        ].getSignedUrls([fullPath]);
        if (signedUrls[0]?.signedUrl) {
          audioUrls.push(signedUrls[0].signedUrl);
        }
      }

      for (const path of newDocPaths) {
        const fullPath = `proposal-documents/${path}`;
        const { signedUrls } = await this.proposalsService[
          "storageService"
        ].getSignedUrls([fullPath]);
        if (signedUrls[0]?.signedUrl) {
          documentUrls.push(signedUrls[0].signedUrl);
        }
      }

      if (audioUrls.length > 0 || documentUrls.length > 0) {
        extractionJobId = await this.proposalsService.queueExtraction(
          draft.id,
          audioUrls,
          documentUrls
        );
      }
    }

    this.logger.log(
      `[RESPONSE] 200 OK - draft ${id} updated - ${Date.now() - startTime}ms`
    );

    return {
      success: true,
      proposal: draft,
      extraction_job_id: extractionJobId,
    };
  }

  @Get(":id/extraction-status")
  @RequirePermission("read_proposals_product")
  @ApiOperation({
    summary: "Get extraction status for a draft",
    description:
      "Returns the current extraction status and progress for a draft proposal.",
  })
  @ApiParam({ name: "id", description: "Proposal ID" })
  @ApiResponse({
    status: 200,
    description: "Extraction status retrieved",
    schema: {
      type: "object",
      properties: {
        extraction_status: {
          type: "string",
          enum: ["pending", "processing", "completed", "failed"],
        },
        extraction_progress: { type: "number", example: 45 },
        extraction_job_id: { type: "string", nullable: true },
      },
    },
  })
  async getExtractionStatus(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload
  ) {
    this.logger.log(`[REQUEST] GET /product/proposals/${id}/extraction-status`);

    const status = await this.proposalsService.getExtractionStatus(id);

    return status;
  }

  @Post(":id/submit")
  @RequirePermission("create_proposals_product")
  @ApiOperation({
    summary: "Submit a draft for generation",
    description:
      "Submits a draft proposal for AI generation. Changes status from draft to processing.",
  })
  @ApiParam({ name: "id", description: "Draft proposal ID" })
  @ApiResponse({
    status: 200,
    description: "Draft submitted for generation",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        id: { type: "string" },
        message: { type: "string" },
      },
    },
  })
  async submitDraft(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload
  ) {
    this.logger.log(`[REQUEST] POST /product/proposals/${id}/submit`);
    const startTime = Date.now();

    const result = await this.proposalsService.submitDraft(id);

    this.logger.log(
      `[RESPONSE] 200 OK - draft ${id} submitted - ${Date.now() - startTime}ms`
    );

    return {
      success: true,
      id: result.id,
      message: "Draft submitted for generation",
    };
  }
}
