import { Controller, Get, Post, Put, Delete, Body, Param, Query, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('organizations')
@ApiBearerAuth('JWT-auth')
@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationsController {
  private readonly logger = new Logger(OrganizationsController.name);

  constructor(
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Post('create')
  @Public()
  @ApiOperation({
    summary: 'Create a new organization',
    description: 'Creates a new organization. Requires create_organization or read_organization permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async create(@Body() dto: CreateOrganizationDto) {
    this.logger.log(`[REQUEST] POST /organizations/create`);

    const startTime = Date.now();
    const result = await this.organizationsService.create(dto);

    this.logger.log(`[RESPONSE] 201 Created - id: ${result.id} - ${Date.now() - startTime}ms`);

    return result;
  }

  @Delete('delete/:id')
  @RequirePermission('delete_organization', 'read_organization')
  @ApiOperation({
    summary: 'Delete organization (soft delete)',
    description: 'Soft deletes an organization. The organization is marked as deleted but not removed from the database. Requires delete_organization or read_organization permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization ID (UUID)',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async delete(@Param('id') id: string) {
    this.logger.log(`[REQUEST] DELETE /organizations/delete/${id}`);

    const startTime = Date.now();
    const result = await this.organizationsService.softDelete(id);

    this.logger.log(`[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`);

    return result;
  }

  @Put('update/:id')
  @RequirePermission('update_organization', 'read_organization')
  @ApiOperation({
    summary: 'Update organization',
    description: 'Updates an existing organization. Only provided fields will be updated. Requires update_organization or read_organization permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization ID (UUID)',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    this.logger.log(`[REQUEST] PUT /organizations/update/${id}`);

    const startTime = Date.now();
    const result = await this.organizationsService.update(id, dto);

    this.logger.log(`[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`);

    return result;
  }

  @Get('count')
  @RequirePermission('view_dashboard')
  @ApiOperation({
    summary: 'Get organization count',
    description: 'Returns the total count of organizations. Requires view_dashboard permission.',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 25 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async count() {
    this.logger.log(`[REQUEST] GET /organizations/count`);

    const startTime = Date.now();
    const result = await this.organizationsService.count();

    this.logger.log(`[RESPONSE] 200 OK - count: ${result.count} - ${Date.now() - startTime}ms`);

    return result;
  }

  @Get()
  @RequirePermission('read_organization')
  @ApiOperation({
    summary: 'Get all organizations',
    description: 'Retrieves a list of organizations with optional pagination. Requires read_organization permission.',
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
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.logger.log(`[REQUEST] GET /organizations - page: ${page}, limit: ${limit}`);

    const startTime = Date.now();
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;

    const result = await this.organizationsService.findAll(pageNum, limitNum);

    if (Array.isArray(result)) {
      this.logger.log(`[RESPONSE] 200 OK - count: ${result.length} - ${Date.now() - startTime}ms`);
    } else {
      this.logger.log(`[RESPONSE] 200 OK - count: ${result.data.length}, total: ${result.total} - ${Date.now() - startTime}ms`);
    }

    return result;
  }

  @Get(':id')
  @RequirePermission('read_organization')
  @ApiOperation({
    summary: 'Get organization by ID',
    description: 'Retrieves a specific organization by its ID. Requires read_organization permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization ID (UUID)',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async findOne(@Param('id') id: string) {
    this.logger.log(`[REQUEST] GET /organizations/${id}`);

    const startTime = Date.now();
    const result = await this.organizationsService.findOne(id);

    this.logger.log(`[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`);

    return result;
  }
}
