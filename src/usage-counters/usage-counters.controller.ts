import { Controller, Get, Param, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsageCountersService } from './usage-counters.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Usage')
@ApiBearerAuth()
@Controller('usage')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsageCountersController {
  private readonly logger = new Logger(UsageCountersController.name);

  constructor(
    private readonly usageCountersService: UsageCountersService,
  ) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get usage summary for all limit-number features',
    description:
      'Returns current usage and limits for all limit-number features of the current organization.',
  })
  @RequirePermission('create_proposals_product')
  async getUsageSummary(
    @CurrentUser('organization_id') organizationId: string,
  ) {
    this.logger.log(
      `[REQUEST] GET /usage/summary - org: ${organizationId}`,
    );

    const startTime = Date.now();
    const result =
      await this.usageCountersService.getUsageSummary(organizationId);

    this.logger.log(
      `[RESPONSE] 200 OK - ${result.length} features - ${Date.now() - startTime}ms`,
    );

    return result;
  }

  @Get(':featureKey')
  @ApiOperation({
    summary: 'Get usage for a specific feature',
    description:
      'Returns current usage and limit for a specific feature by key.',
  })
  @RequirePermission('create_proposals_product')
  async getFeatureUsage(
    @Param('featureKey') featureKey: string,
    @CurrentUser('organization_id') organizationId: string,
  ) {
    this.logger.log(
      `[REQUEST] GET /usage/${featureKey} - org: ${organizationId}`,
    );

    const startTime = Date.now();
    const result = await this.usageCountersService.checkLimit(
      organizationId,
      featureKey,
    );

    this.logger.log(
      `[RESPONSE] 200 OK - ${featureKey}: ${result.current_usage}/${result.limit} - ${Date.now() - startTime}ms`,
    );

    return {
      feature_key: featureKey,
      current_usage: result.current_usage,
      limit: result.limit,
      remaining: result.remaining,
    };
  }
}
