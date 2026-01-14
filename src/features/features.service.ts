import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feature } from './entities/feature.entity';

@Injectable()
export class FeaturesService {
  private readonly logger = new Logger(FeaturesService.name);

  constructor(
    @InjectRepository(Feature)
    private featuresRepository: Repository<Feature>,
  ) {}

  async findAll(): Promise<Feature[]> {
    this.logger.log('Finding all features');
    return await this.featuresRepository.find({
      order: { created_at: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Feature | null> {
    this.logger.log(`Finding feature with id: ${id}`);
    return await this.featuresRepository.findOne({ where: { id } });
  }

  async create(feature: Partial<Feature>): Promise<Feature> {
    this.logger.log('Creating feature');
    const newFeature = this.featuresRepository.create(feature);
    return await this.featuresRepository.save(newFeature);
  }

  async update(id: string, updates: Partial<Feature>): Promise<Feature> {
    this.logger.log(`Updating feature with id: ${id}`);
    await this.featuresRepository.update(id, updates);
    const updated = await this.featuresRepository.findOne({ where: { id } });
    if (!updated) {
      throw new Error(`Feature with id ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Removing feature with id: ${id}`);
    await this.featuresRepository.delete(id);
  }
}
