import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan, IsNull } from 'typeorm';
import { Subscription } from './entities/subscription.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
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

    // If not found, try to find with null expiration (lifetime)
    if (!subscription) {
      subscription = await this.subscriptionRepository.findOne({
        where: {
          organization_id: organizationId,
          status: In(['active', 'trialing', 'past_due']),
          current_period_end: IsNull(),
        },
      });
    }

    if (!subscription) {
      throw new NotFoundException(
        'No active subscription found for this organization',
      );
    }

    return subscription;
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
}
