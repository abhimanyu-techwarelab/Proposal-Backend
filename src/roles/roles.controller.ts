import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Logger,
  BadRequestException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { RolesService } from "./roles.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";

@ApiTags("roles")
@ApiBearerAuth("JWT-auth")
@Controller("roles")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  private readonly logger = new Logger(RolesController.name);

  constructor(private readonly rolesService: RolesService) {}

  @Post("create")
  @RequirePermission(
    "create_role",
    "read_role",
    "create_roles_product",
    "read_roles_product"
  )
  @ApiOperation({
    summary: "Create a new role",
    description:
      "Creates a new role for an organization. Requires create_role, read_role, create_roles_product, or read_roles_product permission.",
  })
  @ApiResponse({
    status: 201,
    description: "Role created successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async create(@Body() dto: CreateRoleDto) {
    this.logger.log(`[REQUEST] POST /roles/create`);

    const startTime = Date.now();
    const result = await this.rolesService.create(dto);

    this.logger.log(
      `[RESPONSE] 201 Created - id: ${result.id} - ${Date.now() - startTime}ms`
    );

    return result;
  }

  @Get()
  @RequirePermission("read_role", "read_roles_product", "create_users_product")
  @ApiOperation({
    summary: "Get all roles",
    description:
      "Retrieves a list of roles for a specific organization with optional pagination. Requires read_role, read_roles_product, or create_users_product permission.",
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID to filter roles",
    type: String,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number for pagination",
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Number of items per page",
    type: Number,
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: "Roles retrieved successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - organization_id is required",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async findAll(
    @Query("organization_id") organizationId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    this.logger.log(
      `[REQUEST] GET /roles - organization_id: ${organizationId}, page: ${page}, limit: ${limit}`
    );

    if (!organizationId) {
      throw new BadRequestException("organization_id is required");
    }

    const startTime = Date.now();
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;

    const result = await this.rolesService.findAll(
      organizationId,
      pageNum,
      limitNum
    );

    if (Array.isArray(result)) {
      this.logger.log(
        `[RESPONSE] 200 OK - count: ${result.length} - ${
          Date.now() - startTime
        }ms`
      );
    } else {
      this.logger.log(
        `[RESPONSE] 200 OK - count: ${result.data.length}, total: ${
          result.total
        } - ${Date.now() - startTime}ms`
      );
    }

    return result;
  }

  @Get(":id")
  @RequirePermission("read_role", "read_roles_product", "create_users_product")
  @ApiOperation({
    summary: "Get role by ID",
    description:
      "Retrieves a specific role by its ID. Requires read_role, read_roles_product, or create_users_product permission.",
  })
  @ApiParam({
    name: "id",
    description: "Role ID (UUID)",
    type: String,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Role retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Role not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async findOne(@Param("id") id: string) {
    this.logger.log(`[REQUEST] GET /roles/${id}`);

    const startTime = Date.now();
    const result = await this.rolesService.findOne(id);

    this.logger.log(
      `[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`
    );

    return result;
  }

  @Put("update/:id")
  @RequirePermission(
    "update_role",
    "read_role",
    "update_roles_product",
    "read_roles_product"
  )
  @ApiOperation({
    summary: "Update role",
    description:
      "Updates an existing role. Only provided fields will be updated. Requires update_role, read_role, update_roles_product, or read_roles_product permission.",
  })
  @ApiParam({
    name: "id",
    description: "Role ID (UUID)",
    type: String,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Role updated successfully",
  })
  @ApiResponse({ status: 404, description: "Role not found" })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async update(@Param("id") id: string, @Body() dto: UpdateRoleDto) {
    this.logger.log(`[REQUEST] PUT /roles/update/${id}`);

    const startTime = Date.now();
    const result = await this.rolesService.update(id, dto);

    this.logger.log(
      `[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`
    );

    return result;
  }

  @Delete("delete/:id")
  @RequirePermission(
    "delete_role",
    "read_role",
    "delete_roles_product",
    "read_roles_product"
  )
  @ApiOperation({
    summary: "Delete role (soft delete)",
    description:
      "Soft deletes a role. The role is marked as deleted but not removed from the database. Requires delete_role, read_role, delete_roles_product, or read_roles_product permission.",
  })
  @ApiParam({
    name: "id",
    description: "Role ID (UUID)",
    type: String,
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Role deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Role not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async delete(@Param("id") id: string) {
    this.logger.log(`[REQUEST] DELETE /roles/delete/${id}`);

    const startTime = Date.now();
    const result = await this.rolesService.softDelete(id);

    this.logger.log(
      `[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`
    );

    return result;
  }
}
