import { ApiProperty } from '@nestjs/swagger';

export class DashboardSummaryDto {
  @ApiProperty({ description: 'Number of approved/completed proposals', example: 24 })
  approved_count: number;

  @ApiProperty({ description: 'Number of pending proposals (pending + processing + approval_pending)', example: 8 })
  pending_count: number;

  @ApiProperty({ description: 'Number of rejected proposals', example: 3 })
  rejected_count: number;

  @ApiProperty({ description: 'Total number of proposals', example: 35 })
  total_count: number;

  @ApiProperty({ description: 'Total value of completed proposals', example: 245000 })
  total_value: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Month-over-month change percentage based on proposal value', example: 12.5 })
  month_over_month_change: number;
}
