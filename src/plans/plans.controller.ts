import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { Plan } from './entities/plan.entity';
import { PlanFeature } from './entities/plan-feature.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('plans')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PlansController {
  private readonly logger = new Logger(PlansController.name);

  constructor(private readonly plansService: PlansService) {}

  @Get()
  async findAll(@Query('include') include?: string) {
    const includeFeatures = include === 'features';
    this.logger.log(`[REQUEST] GET /plans${includeFeatures ? '?include=features' : ''}`);

    const startTime = Date.now();
    const result = await this.plansService.findAll(includeFeatures);

    this.logger.log(`[RESPONSE] 200 OK - count: ${result.length} - ${Date.now() - startTime}ms`);

    return result;
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query('include') include?: string) {
    const includeFeatures = include === 'features';
    this.logger.log(`[REQUEST] GET /plans/${id}${includeFeatures ? '?include=features' : ''}`);

    const startTime = Date.now();
    const result = await this.plansService.findOne(id, includeFeatures);

    this.logger.log(`[RESPONSE] 200 OK - ${Date.now() - startTime}ms`);

    return result;
  }

  @Post()
  async create(@Body() plan: Partial<Plan>) {
    this.logger.log(`[REQUEST] POST /plans`);

    const startTime = Date.now();
    const result = await this.plansService.create(plan);

    this.logger.log(`[RESPONSE] 200 OK - ${Date.now() - startTime}ms`);

    return result;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updates: Partial<Plan>) {
    this.logger.log(`[REQUEST] PUT /plans/${id}`);

    const startTime = Date.now();
    const result = await this.plansService.update(id, updates);

    this.logger.log(`[RESPONSE] 200 OK - ${Date.now() - startTime}ms`);

    return result;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    this.logger.log(`[REQUEST] DELETE /plans/${id}`);

    const startTime = Date.now();
    const result = await this.plansService.remove(id);

    this.logger.log(`[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`);
    return result;
  }

  @Put(':id/features')
  async updatePlanFeatures(
    @Param('id') planId: string,
    @Body() planFeatures: Partial<PlanFeature>[],
  ) {
    this.logger.log(`[REQUEST] PUT /plans/${planId}/features - ${planFeatures.length} features`);

    const startTime = Date.now();
    const result = await this.plansService.updatePlanFeatures(planId, planFeatures);

    this.logger.log(`[RESPONSE] 200 OK - ${result.length} features - ${Date.now() - startTime}ms`);

    return result;
  }
}
