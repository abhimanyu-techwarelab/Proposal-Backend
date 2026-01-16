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

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

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
