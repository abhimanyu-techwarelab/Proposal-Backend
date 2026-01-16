import {
  Controller,
  Post,
  Get,
  Delete,
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

  @Get(":id")
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
  async getProposalResult(@Param("id") id: string) {
    this.logger.log(`[REQUEST] GET /product/proposals/${id}`);

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
}
