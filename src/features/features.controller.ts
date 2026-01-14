import {
  Controller,
  Get,
  Param,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { FeaturesService } from './features.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('features')
@ApiBearerAuth('JWT-auth')
@Controller('features')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FeaturesController {
  private readonly logger = new Logger(FeaturesController.name);

  constructor(private readonly featuresService: FeaturesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all features',
    description: 'Retrieves a list of all available system features.',
  })
  @ApiResponse({
    status: 200,
    description: 'Features retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
          name: { type: 'string', example: 'Feature Name' },
          description: { type: 'string', example: 'Feature description' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll() {
    this.logger.log(`[REQUEST] GET /features`);

    const startTime = Date.now();
    const result = await this.featuresService.findAll();

    this.logger.log(`[RESPONSE] 200 OK - count: ${result.length} - ${Date.now() - startTime}ms`);

    return result;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get feature by ID',
    description: 'Retrieves a specific feature by its ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Feature ID (UUID)',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string) {
    this.logger.log(`[REQUEST] GET /features/${id}`);

    const startTime = Date.now();
    const result = await this.featuresService.findOne(id);

    this.logger.log(`[RESPONSE] 200 OK - ${Date.now() - startTime}ms`);

    return result;
  }
}
