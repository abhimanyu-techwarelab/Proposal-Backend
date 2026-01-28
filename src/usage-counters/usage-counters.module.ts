import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageCountersController } from './usage-counters.controller';
import { UsageCountersService } from './usage-counters.service';
import { UsageLimitGuard } from './guards/usage-limit.guard';
import { UsageCounter } from './entities/usage-counter.entity';
import { Feature } from '../features/entities/feature.entity';
import { PlanFeature } from '../plans/entities/plan-feature.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsageCounter, Feature, PlanFeature]),
    SubscriptionsModule,
  ],
  controllers: [UsageCountersController],
  providers: [UsageCountersService, UsageLimitGuard],
  exports: [UsageCountersService, UsageLimitGuard],
})
export class UsageCountersModule {}
