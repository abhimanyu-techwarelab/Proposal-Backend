import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan, IsNull } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { Feature } from '../features/entities/feature.entity';
import { Plan } from '../plans/entities/plan.entity';

const DEFAULT_FREE_PLAN_ID = 'ceb2e568-b6e9-40c0-8079-51996e299b1f';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Feature)
    private featureRepository: Repository<Feature>,
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
  ) {}

  /**
   * Find an active subscription by organization ID
   * Active means: status is 'active', 'trialing', or 'past_due'
   * AND current_period_end is in the future OR null (lifetime subscription)
   */
  async findActiveByOrganization(organizationId: string): Promise<Subscription> {
    // First try to find with future expiration
    let subscription = await this.subscriptionRepository.findOne({
      where: {
        organization_id: organizationId,
        status: In(['active', 'trialing', 'past_due']),
        current_period_end: MoreThan(new Date()),
      },
    });

    if (subscription) {
      this.logger.log(
        `[FIND_ACTIVE] Found subscription ${subscription.id} (status: ${subscription.status}, period_end: ${subscription.current_period_end}) for org ${organizationId}`,
      );
      return subscription;
    }

    // If not found, try to find with null expiration (lifetime)
    subscription = await this.subscriptionRepository.findOne({
      where: {
        organization_id: organizationId,
        status: In(['active', 'trialing', 'past_due']),
        current_period_end: IsNull(),
      },
    });

    if (subscription) {
      this.logger.log(
        `[FIND_ACTIVE] Found lifetime subscription ${subscription.id} (status: ${subscription.status}) for org ${organizationId}`,
      );
      return subscription;
    }

    // Debug: check if ANY subscription exists for this org (regardless of status/period)
    const anySubscription = await this.subscriptionRepository.findOne({
      where: { organization_id: organizationId },
    });
    if (anySubscription) {
      this.logger.warn(
        `[FIND_ACTIVE] Subscription exists for org ${organizationId} but NOT active. id: ${anySubscription.id}, status: "${anySubscription.status}", period_end: ${anySubscription.current_period_end}`,
      );
    } else {
      this.logger.warn(
        `[FIND_ACTIVE] No subscription at all for org ${organizationId}`,
      );
    }

    throw new NotFoundException(
      'No active subscription found for this organization',
    );
  }

  /**
   * Find subscription by ID
   */
  async findById(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  /**
   * Find current subscription details for an organization with joined plan, plan_features, and features.
   * Falls back to the default free plan if no active subscription exists.
   * Also returns all features from the features table.
   */
  async findCurrentSubscriptionDetails(organizationId: string) {
    // 1. Try to find active subscription with joined relations
    let subscription = await this.subscriptionRepository.findOne({
      where: {
        organization_id: organizationId,
        status: In(['active', 'trialing', 'past_due']),
        current_period_end: MoreThan(new Date()),
      },
      relations: ['plan', 'plan.plan_features', 'plan.plan_features.feature'],
    });

    // Try with null expiration (lifetime subscription)
    if (!subscription) {
      subscription = await this.subscriptionRepository.findOne({
        where: {
          organization_id: organizationId,
          status: In(['active', 'trialing', 'past_due']),
          current_period_end: IsNull(),
        },
        relations: ['plan', 'plan.plan_features', 'plan.plan_features.feature'],
      });
    }

    // 2. Determine the plan (from subscription or fallback to default free plan)
    let plan: Plan | null = null;
    if (subscription?.plan) {
      plan = subscription.plan;
    } else {
      plan = await this.planRepository.findOne({
        where: { id: DEFAULT_FREE_PLAN_ID },
        relations: ['plan_features', 'plan_features.feature'],
      });
    }

    // 3. Fetch all features
    const allFeatures = await this.featureRepository.find({
      order: { created_at: 'ASC' },
    });

    // 4. Map plan_features to rename is_true -> is_enabled
    const mappedPlanFeatures = plan?.plan_features?.map((pf) => ({
      id: pf.id,
      plan_id: pf.plan_id,
      feature_id: pf.feature_id,
      limit: pf.limit,
      is_enabled: pf.is_true,
      feature: pf.feature,
    })) || [];

    // 5. Build response
    return {
      subscription: subscription
        ? {
            id: subscription.id,
            organization_id: subscription.organization_id,
            plan_id: subscription.plan_id,
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
            trial_end: subscription.trial_end,
            created_at: subscription.created_at,
            updated_at: subscription.updated_at,
          }
        : null,
      plan: plan
        ? {
            id: plan.id,
            plan_code: plan.plan_code,
            name: plan.name,
            description: plan.description,
            price: plan.price,
            billing_interval: plan.billing_interval,
            is_active: plan.is_active,
            plan_features: mappedPlanFeatures,
          }
        : null,
      allFeatures,
    };
  }
}
