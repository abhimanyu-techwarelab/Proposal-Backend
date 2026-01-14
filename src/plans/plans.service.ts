import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './entities/plan.entity';
import { PlanFeature } from './entities/plan-feature.entity';
import { Feature } from '../features/entities/feature.entity';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @InjectRepository(Plan)
    private plansRepository: Repository<Plan>,
    @InjectRepository(PlanFeature)
    private planFeaturesRepository: Repository<PlanFeature>,
    @InjectRepository(Feature)
    private featuresRepository: Repository<Feature>,
  ) {}

  async findAll(includeFeatures = false): Promise<Plan[]> {
    this.logger.log('Finding all plans');
    const plans = await this.plansRepository.find({
      where: { is_deleted: false },
      order: { created_at: 'ASC' },
    });

    if (includeFeatures) {
      for (const plan of plans) {
        plan.plan_features = await this.planFeaturesRepository.find({
          where: { plan_id: plan.id },
          relations: ['feature'],
        });
      }
    }

    return plans;
  }

  async findOne(id: string, includeFeatures = false): Promise<Plan | null> {
    this.logger.log(`Finding plan with id: ${id}`);
    const plan = await this.plansRepository.findOne({ 
      where: { id, is_deleted: false } 
    });

    if (plan && includeFeatures) {
      plan.plan_features = await this.planFeaturesRepository.find({
        where: { plan_id: plan.id },
        relations: ['feature'],
      });
    }

    return plan;
  }

  async create(planData: Partial<Plan>): Promise<Plan> {
    this.logger.log('Creating plan');
    const newPlan = this.plansRepository.create(planData);
    return await this.plansRepository.save(newPlan);
  }

  async update(id: string, updates: Partial<Plan>): Promise<Plan> {
    this.logger.log(`Updating plan with id: ${id}`);
    
    const plan = await this.plansRepository.findOne({
      where: { id, is_deleted: false },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with id ${id} not found`);
    }

    Object.assign(plan, updates);
    const updated = await this.plansRepository.save(plan);
    
    return updated;
  }

  async remove(id: string): Promise<Plan> {
    this.logger.log(`Soft deleting plan with id: ${id}`);
    
    const plan = await this.plansRepository.findOne({
      where: { id, is_deleted: false },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with id ${id} not found`);
    }

    plan.is_deleted = true;
    const deletedPlan = await this.plansRepository.save(plan);
    
    this.logger.log(`Plan soft deleted: ${id}`);
    return deletedPlan;
  }

  async updatePlanFeatures(planId: string, planFeatures: Partial<PlanFeature>[]): Promise<PlanFeature[]> {
    this.logger.log(`Updating plan features for plan: ${planId}`);

    // Delete existing plan_features for this plan
    await this.planFeaturesRepository.delete({ plan_id: planId });

    // Create new plan_features
    const newPlanFeatures = planFeatures.map(pf => ({
      ...pf,
      plan_id: planId,
    }));

    const created = this.planFeaturesRepository.create(newPlanFeatures);
    return await this.planFeaturesRepository.save(created);
  }
}
