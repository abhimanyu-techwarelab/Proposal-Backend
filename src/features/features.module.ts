import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeaturesController } from './features.controller';
import { FeaturesService } from './features.service';
import { Feature } from './entities/feature.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Feature])],
  controllers: [FeaturesController],
  providers: [FeaturesService],
  exports: [FeaturesService],
})
export class FeaturesModule {}
