import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposal } from '../proposals/entities/proposal.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
  ) {}

  async getSummary(organizationId: string): Promise<DashboardSummaryDto> {
    this.logger.log(`[getSummary] Fetching dashboard summary for organization: ${organizationId}`);

    // Get subscription IDs for this organization
    const subscriptions = await this.subscriptionRepository.find({
      where: { organization_id: organizationId },
      select: ['id'],
    });

    const subscriptionIds = subscriptions.map((s) => s.id);

    if (subscriptionIds.length === 0) {
      this.logger.log(`[getSummary] No subscriptions found for organization: ${organizationId}`);
      return {
        approved_count: 0,
        pending_count: 0,
        rejected_count: 0,
        total_count: 0,
        total_value: 0,
        currency: 'USD',
        month_over_month_change: 0,
      };
    }

    // Get counts by status
    const statusCounts = await this.proposalRepository
      .createQueryBuilder('proposal')
      .select('proposal.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('proposal.subscription_id IN (:...subscriptionIds)', { subscriptionIds })
      .andWhere('proposal.is_deleted = :isDeleted', { isDeleted: false })
      .groupBy('proposal.status')
      .getRawMany();

    // Parse counts
    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    let totalCount = 0;

    for (const row of statusCounts) {
      const count = parseInt(row.count, 10);
      totalCount += count;

      switch (row.status) {
        case 'completed':
          approvedCount = count;
          break;
        case 'rejected':
          rejectedCount = count;
          break;
        case 'pending':
        case 'processing':
        case 'approval_pending':
          pendingCount += count;
          break;
      }
    }

    // Get total value of completed proposals and determine most common currency
    const valueResult = await this.proposalRepository
      .createQueryBuilder('proposal')
      .select('SUM(proposal.total_budget)', 'total_value')
      .addSelect('proposal.currency', 'currency')
      .where('proposal.subscription_id IN (:...subscriptionIds)', { subscriptionIds })
      .andWhere('proposal.is_deleted = :isDeleted', { isDeleted: false })
      .andWhere('proposal.status = :status', { status: 'completed' })
      .andWhere('proposal.total_budget IS NOT NULL')
      .groupBy('proposal.currency')
      .orderBy('SUM(proposal.total_budget)', 'DESC')
      .getRawOne();

    const totalValue = valueResult ? parseFloat(valueResult.total_value) || 0 : 0;
    const currency = valueResult?.currency || 'USD';

    // Calculate month-over-month change based on proposal value
    const monthOverMonthChange = await this.calculateMonthOverMonthChange(subscriptionIds, currency);

    this.logger.log(
      `[getSummary] Summary for org ${organizationId}: approved=${approvedCount}, pending=${pendingCount}, rejected=${rejectedCount}, total=${totalCount}, value=${totalValue}, mom=${monthOverMonthChange}%`,
    );

    return {
      approved_count: approvedCount,
      pending_count: pendingCount,
      rejected_count: rejectedCount,
      total_count: totalCount,
      total_value: totalValue,
      currency,
      month_over_month_change: monthOverMonthChange,
    };
  }

  private async calculateMonthOverMonthChange(subscriptionIds: string[], currency: string): Promise<number> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Current month start and end
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    // Last month start and end
    const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    // Get current month's completed proposal value
    const currentMonthValue = await this.getCompletedProposalValue(
      subscriptionIds,
      currency,
      currentMonthStart,
      currentMonthEnd,
    );

    // Get last month's completed proposal value
    const lastMonthValue = await this.getCompletedProposalValue(
      subscriptionIds,
      currency,
      lastMonthStart,
      lastMonthEnd,
    );

    this.logger.log(
      `[calculateMonthOverMonthChange] Current month value: ${currentMonthValue}, Last month value: ${lastMonthValue}`,
    );

    // Calculate percentage change
    if (lastMonthValue === 0) {
      // If no value last month, return 100% if there's value this month, 0% otherwise
      return currentMonthValue > 0 ? 100 : 0;
    }

    const change = ((currentMonthValue - lastMonthValue) / lastMonthValue) * 100;
    // Round to 1 decimal place
    return Math.round(change * 10) / 10;
  }

  private async getCompletedProposalValue(
    subscriptionIds: string[],
    currency: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.proposalRepository
      .createQueryBuilder('proposal')
      .select('SUM(proposal.total_budget)', 'total_value')
      .where('proposal.subscription_id IN (:...subscriptionIds)', { subscriptionIds })
      .andWhere('proposal.is_deleted = :isDeleted', { isDeleted: false })
      .andWhere('proposal.status = :status', { status: 'completed' })
      .andWhere('proposal.currency = :currency', { currency })
      .andWhere('proposal.total_budget IS NOT NULL')
      .andWhere('proposal.created_at >= :startDate', { startDate })
      .andWhere('proposal.created_at <= :endDate', { endDate })
      .getRawOne();

    return result ? parseFloat(result.total_value) || 0 : 0;
  }
}
