import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UsageCounter } from './entities/usage-counter.entity';
import { Feature } from '../features/entities/feature.entity';
import { PlanFeature } from '../plans/entities/plan-feature.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

const DEFAULT_FREE_PLAN_ID = 'ceb2e568-b6e9-40c0-8079-51996e299b1f';

@Injectable()
export class UsageCountersService {
  private readonly logger = new Logger(UsageCountersService.name);

  constructor(
    @InjectRepository(UsageCounter)
    private usageCounterRepository: Repository<UsageCounter>,
    @InjectRepository(Feature)
    private featureRepository: Repository<Feature>,
    @InjectRepository(PlanFeature)
    private planFeatureRepository: Repository<PlanFeature>,
    private subscriptionsService: SubscriptionsService,
    private dataSource: DataSource,
  ) {}

  /**
   * Check if an organization has remaining usage for a feature.
   * Reads limit from plan_features and current_usage from usage_counters.
   */
  async checkLimit(
    organizationId: string,
    featureKey: string,
  ): Promise<{
    allowed: boolean;
    current_usage: number;
    limit: number;
    remaining: number;
  }> {
    // 1. Find feature by key
    const feature = await this.featureRepository.findOne({
      where: { key: featureKey },
    });
    if (!feature) {
      this.logger.warn(`[CHECK_LIMIT] Feature not found: ${featureKey}`);
      throw new NotFoundException(`Feature not found: ${featureKey}`);
    }

    // 2. Find active subscription, fallback to free plan
    let subscriptionId: string | null = null;
    let planId: string;
    try {
      const subscription =
        await this.subscriptionsService.findActiveByOrganization(
          organizationId,
        );
      subscriptionId = subscription.id;
      planId = subscription.plan_id;
      this.logger.log(
        `[CHECK_LIMIT] Found subscription ${subscriptionId} (plan: ${planId}) for org ${organizationId}`,
      );
    } catch (error) {
      this.logger.warn(
        `[CHECK_LIMIT] No active subscription for org ${organizationId}: ${error?.message || error}. Falling back to free plan. Usage counter row will NOT be created.`,
      );
      planId = DEFAULT_FREE_PLAN_ID;
    }

    // 3. Get limit from plan_features
    const planFeature = await this.planFeatureRepository.findOne({
      where: { plan_id: planId, feature_id: feature.id },
    });

    if (!planFeature || planFeature.limit === null || planFeature.limit === 0) {
      this.logger.log(
        `[CHECK_LIMIT] Feature ${featureKey} not available in plan or limit is 0`,
      );
      return { allowed: false, current_usage: 0, limit: 0, remaining: 0 };
    }

    // 4. Unlimited check (limit = -1)
    if (planFeature.limit === -1) {
      const currentUsage = subscriptionId
        ? await this.getCurrentUsage(subscriptionId, feature.id)
        : 0;
      return {
        allowed: true,
        current_usage: currentUsage,
        limit: -1,
        remaining: -1,
      };
    }

    // 5. Get current usage from usage_counters
    const currentUsage = subscriptionId
      ? await this.getCurrentUsage(subscriptionId, feature.id)
      : 0;

    // 6. Compare: current_usage < limit → allowed
    const remaining = planFeature.limit - currentUsage;
    const allowed = currentUsage < planFeature.limit;

    this.logger.log(
      `[CHECK_LIMIT] Feature ${featureKey}: ${currentUsage}/${planFeature.limit} (allowed: ${allowed})`,
    );

    return {
      allowed,
      current_usage: currentUsage,
      limit: planFeature.limit,
      remaining: Math.max(remaining, 0),
    };
  }

  /**
   * Increment usage counter atomically using PostgreSQL upsert.
   * Creates the row if it doesn't exist, otherwise increments current_usage.
   */
  async incrementUsage(
    subscriptionId: string,
    featureKey: string,
  ): Promise<number> {
    const feature = await this.featureRepository.findOne({
      where: { key: featureKey },
    });
    if (!feature) {
      throw new NotFoundException(`Feature not found: ${featureKey}`);
    }

    const result = await this.dataSource.query(
      `INSERT INTO usage_counters (id, subscription_id, feature_id, current_usage, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 1, NOW(), NOW())
       ON CONFLICT (subscription_id, feature_id)
       DO UPDATE SET current_usage = usage_counters.current_usage + 1, updated_at = NOW()
       RETURNING current_usage`,
      [subscriptionId, feature.id],
    );

    const newUsage = result[0].current_usage;
    this.logger.log(
      `[INCREMENT] Feature ${featureKey} for subscription ${subscriptionId}: now at ${newUsage}`,
    );
    return newUsage;
  }

  /**
   * Increment usage by organization ID (resolves subscription internally).
   */
  async incrementUsageByOrganization(
    organizationId: string,
    featureKey: string,
  ): Promise<number> {
    try {
      const subscription =
        await this.subscriptionsService.findActiveByOrganization(
          organizationId,
        );
      this.logger.log(
        `[INCREMENT] Found subscription ${subscription.id} for org ${organizationId}`,
      );
      return this.incrementUsage(subscription.id, featureKey);
    } catch (error) {
      this.logger.error(
        `[INCREMENT] Failed to increment ${featureKey} for org ${organizationId}: ${error?.message || error}`,
      );
      this.logger.error(
        `[INCREMENT] Stack: ${error?.stack || 'No stack trace'}`,
      );
      return 0;
    }
  }

  /**
   * Get usage summary for all limit-number features of an organization.
   */
  async getUsageSummary(
    organizationId: string,
  ): Promise<
    Array<{
      feature_key: string;
      feature_name: string;
      current_usage: number;
      limit: number;
    }>
  > {
    // Find active subscription
    let subscriptionId: string | null = null;
    let planId: string;
    try {
      const subscription =
        await this.subscriptionsService.findActiveByOrganization(
          organizationId,
        );
      subscriptionId = subscription.id;
      planId = subscription.plan_id;
      this.logger.log(
        `[USAGE_SUMMARY] Found subscription ${subscriptionId} (plan: ${planId}) for org ${organizationId}`,
      );
    } catch (error) {
      this.logger.warn(
        `[USAGE_SUMMARY] No active subscription for org ${organizationId}: ${error?.message || error}. Falling back to free plan.`,
      );
      planId = DEFAULT_FREE_PLAN_ID;
    }

    // Get all limit-number features for the plan
    const planFeatures = await this.planFeatureRepository.find({
      where: { plan_id: planId },
      relations: ['feature'],
    });

    const summary: { feature_key: string; feature_name: string; current_usage: number; limit: number }[] = [];

    for (const pf of planFeatures) {
      if (!pf.feature || pf.feature.type !== 'limit-number') continue;

      const currentUsage = subscriptionId
        ? await this.getCurrentUsage(subscriptionId, pf.feature_id)
        : 0;

      summary.push({
        feature_key: pf.feature.key,
        feature_name: pf.feature.feature,
        current_usage: currentUsage,
        limit: pf.limit ?? 0,
      });
    }

    return summary;
  }

  /**
   * Reset all counters for a subscription (e.g., on billing period renewal).
   */
  async resetCounters(subscriptionId: string): Promise<void> {
    await this.usageCounterRepository.update(
      { subscription_id: subscriptionId },
      { current_usage: 0 },
    );
    this.logger.log(
      `[RESET] All counters reset for subscription ${subscriptionId}`,
    );
  }

  /**
   * Get current usage for a specific subscription + feature combo.
   * Creates the row with current_usage=0 if it doesn't exist.
   */
  private async getCurrentUsage(
    subscriptionId: string,
    featureId: string,
  ): Promise<number> {
    const result = await this.dataSource.query(
      `INSERT INTO usage_counters (id, subscription_id, feature_id, current_usage, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 0, NOW(), NOW())
       ON CONFLICT (subscription_id, feature_id)
       DO UPDATE SET id = usage_counters.id
       RETURNING current_usage`,
      [subscriptionId, featureId],
    );
    return result[0].current_usage;
  }
}
