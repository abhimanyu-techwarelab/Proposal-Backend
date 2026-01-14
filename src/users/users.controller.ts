import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Query,
  Param,
  Logger,
  BadRequestException,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Post("create")
  @UseGuards(PermissionsGuard)
  @RequirePermission("create_user", "read_user")
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Creates a new user account. Requires create_user or read_user permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        email: { type: 'string', example: 'user@example.com' },
        first_name: { type: 'string', example: 'John' },
        last_name: { type: 'string', example: 'Doe' },
        organization_id: { type: 'string', nullable: true },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async create(@Body() dto: CreateUserDto) {
    this.logger.log(`[REQUEST] POST /users/create`);

    const startTime = Date.now();
    const result = await this.usersService.create(dto);

    this.logger.log(
      `[RESPONSE] 201 Created - id: ${result.id} - ${Date.now() - startTime}ms`
    );

    return result;
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermission("read_users_product")
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieves a list of users for the authenticated user\'s organization. Supports pagination. Requires read_users_product permission.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term to filter by name or email',
    type: String,
    example: 'john',
  })
  @ApiQuery({
    name: 'role_id',
    required: false,
    description: 'Filter by role ID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      oneOf: [
        {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              first_name: { type: 'string' },
              last_name: { type: 'string' },
            },
          },
        },
        {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { type: 'object' },
            },
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async findAll(
    @CurrentUser("organization_id") organizationId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("role_id") roleId?: string
  ) {
    this.logger.log(
      `[REQUEST] GET /users - organization_id: ${organizationId}, page: ${page}, limit: ${limit}, search: ${search}, role_id: ${roleId}`
    );

    const startTime = Date.now();
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;

    const result = await this.usersService.findAll(
      organizationId,
      pageNum,
      limitNum,
      search,
      roleId
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

  @Get("me")
  @ApiOperation({
    summary: 'Get current user',
    description: 'Retrieves the currently authenticated user information based on JWT token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        email: { type: 'string', example: 'user@example.com' },
        first_name: { type: 'string', example: 'John' },
        last_name: { type: 'string', example: 'Doe' },
        organization_id: { type: 'string', nullable: true },
        role_id: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  async getCurrentUser(@CurrentUser() user: JwtPayload) {
    this.logger.log(`[REQUEST] GET /users/me - user_id: ${user.user_id}`);

    const startTime = Date.now();
    const result = await this.usersService.findOne(user.user_id);

    this.logger.log(
      `[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`
    );

    return result;
  }

  @Get(":id")
  @UseGuards(PermissionsGuard)
  @RequirePermission("read_user")
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieves a specific user by their ID. Requires read_user permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID (UUID)',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async findOne(@Param("id") id: string) {
    this.logger.log(`[REQUEST] GET /users/${id}`);

    const startTime = Date.now();
    const result = await this.usersService.findOne(id);

    this.logger.log(
      `[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`
    );

    return result;
  }

  @Put("update/:id")
  @UseGuards(PermissionsGuard)
  @RequirePermission("update_user", "read_user")
  @ApiOperation({
    summary: 'Update user',
    description: 'Updates an existing user. Only provided fields will be updated. Requires update_user or read_user permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID (UUID)',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    this.logger.log(`[REQUEST] PUT /users/update/${id}`);

    const startTime = Date.now();
    const result = await this.usersService.update(id, dto);

    this.logger.log(
      `[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`
    );

    return result;
  }

  @Delete("delete/:id")
  @UseGuards(PermissionsGuard)
  @RequirePermission("delete_user", "read_user")
  @ApiOperation({
    summary: 'Delete user (soft delete)',
    description: 'Soft deletes a user. The user is marked as deleted but not removed from the database. Requires delete_user or read_user permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID (UUID)',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async delete(@Param("id") id: string) {
    this.logger.log(`[REQUEST] DELETE /users/delete/${id}`);

    const startTime = Date.now();
    const result = await this.usersService.softDelete(id);

    this.logger.log(
      `[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`
    );

    return result;
  }
}
