import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @RequirePermission('view_dashboard_product')
  @ApiOperation({
    summary: 'Get dashboard summary',
    description:
      'Returns dashboard summary statistics including proposal counts by status, total value, and month-over-month change. Data is scoped to the current user\'s organization.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary retrieved successfully',
    type: DashboardSummaryDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getSummary(@CurrentUser() user: JwtPayload): Promise<{ success: boolean; data: DashboardSummaryDto }> {
    this.logger.log(`[REQUEST] GET /dashboard/summary - user: ${user.user_id}, org: ${user.organization_id}`);

    const startTime = Date.now();
    const result = await this.dashboardService.getSummary(user.organization_id);

    this.logger.log(
      `[RESPONSE] 200 OK - total: ${result.total_count}, value: ${result.total_value} - ${Date.now() - startTime}ms`,
    );

    return {
      success: true,
      data: result,
    };
  }
}
