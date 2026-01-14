import { Controller, Get, Post, Put, Delete, Body, Param, Query, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { Tag } from './entities/tag.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('tags')
@ApiBearerAuth('JWT-auth')
@Controller('tags')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TagsController {
  private readonly logger = new Logger(TagsController.name);

  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @RequirePermission('read_tag')
  @ApiOperation({
    summary: 'Get all tags',
    description: 'Retrieves a list of tags with optional pagination. Requires read_tag permission.',
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
    description: 'Tags retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.logger.log(`[REQUEST] GET /tags - page: ${page}, limit: ${limit}`);

    const startTime = Date.now();
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;

    const result = await this.tagsService.findAll(pageNum, limitNum);

    if (Array.isArray(result)) {
      this.logger.log(`[RESPONSE] 200 OK - count: ${result.length} - ${Date.now() - startTime}ms`);
    } else {
      this.logger.log(`[RESPONSE] 200 OK - count: ${result.data.length}, total: ${result.total} - ${Date.now() - startTime}ms`);
    }

    return result;
  }

  @Get(':id')
  @RequirePermission('read_tag')
  @ApiOperation({
    summary: 'Get a tag by ID',
    description: 'Retrieves a single tag by its ID. Requires read_tag permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tag ID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Tag retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async findOne(@Param('id') id: string) {
    this.logger.log(`[REQUEST] GET /tags/${id}`);

    const startTime = Date.now();
    const result = await this.tagsService.findOne(id);

    this.logger.log(`[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`);
    return result;
  }

  @Post()
  @RequirePermission('create_tag')
  @ApiOperation({
    summary: 'Create a new tag',
    description: 'Creates a new tag. Requires create_tag permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tag created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async create(
    @Body() tagData: Partial<Tag>,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.log(`[REQUEST] POST /tags - name: ${tagData.name}`);

    const startTime = Date.now();
    const tagToCreate = {
      ...tagData,
      created_by: user.user_id,
    };
    const result = await this.tagsService.create(tagToCreate);

    this.logger.log(`[RESPONSE] 201 Created - id: ${result.id} - ${Date.now() - startTime}ms`);
    return result;
  }

  @Put(':id')
  @RequirePermission('update_tag')
  @ApiOperation({
    summary: 'Update a tag',
    description: 'Updates an existing tag. Requires update_tag permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tag ID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Tag updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async update(
    @Param('id') id: string,
    @Body() updates: Partial<Tag>,
  ) {
    this.logger.log(`[REQUEST] PUT /tags/${id}`);

    const startTime = Date.now();
    const result = await this.tagsService.update(id, updates);

    this.logger.log(`[RESPONSE] 200 OK - ${Date.now() - startTime}ms`);
    return result;
  }

  @Delete(':id')
  @RequirePermission('delete_tag')
  @ApiOperation({
    summary: 'Delete a tag',
    description: 'Deletes a tag by its ID. Requires delete_tag permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tag ID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Tag deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async remove(@Param('id') id: string) {
    this.logger.log(`[REQUEST] DELETE /tags/${id}`);

    const startTime = Date.now();
    await this.tagsService.remove(id);

    this.logger.log(`[RESPONSE] 200 OK - ${Date.now() - startTime}ms`);
    return { message: 'Tag deleted successfully' };
  }
}
