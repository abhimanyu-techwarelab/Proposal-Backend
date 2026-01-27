import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('current')
  @ApiOperation({
    summary: 'Get current subscription details for logged-in organization',
    description:
      'Returns the active subscription with plan details, all features, and plan feature limits. Falls back to the default free plan if no active subscription exists.',
  })
  @RequirePermission('create_proposals_product')
  async findCurrentDetails(
    @CurrentUser('organization_id') organizationId: string,
  ) {
    return this.subscriptionsService.findCurrentSubscriptionDetails(
      organizationId,
    );
  }

  @Get('organization/:organizationId')
  @ApiOperation({ summary: 'Get active subscription by organization ID' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: String,
  })
  @RequirePermission('create_proposals_product')
  async findActiveByOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.subscriptionsService.findActiveByOrganization(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiParam({
    name: 'id',
    description: 'Subscription UUID',
    type: String,
  })
  @RequirePermission('create_proposals_product')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.findById(id);
  }
}
