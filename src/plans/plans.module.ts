import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { Plan } from './entities/plan.entity';
import { PlanFeature } from './entities/plan-feature.entity';
import { Feature } from '../features/entities/feature.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Plan, PlanFeature, Feature])],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
