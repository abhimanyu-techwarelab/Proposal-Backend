import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';
import { ProposalProcessor } from './processors/proposal.processor';
import { ExtractionProcessor } from './processors/extraction.processor';
import { StorageModule } from '../storage/storage.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { AIModule } from '../ai/ai.module';
import { TemplatesModule } from '../templates/templates.module';
import { CommonModule } from '../common/common.module';
import { UsageCountersModule } from '../usage-counters/usage-counters.module';
import { Proposal } from './entities/proposal.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proposal]),
    BullModule.registerQueue({
      name: 'proposal-generation',
    }),
    BullModule.registerQueue({
      name: 'field-extraction',
    }),
    StorageModule,
    KnowledgeBaseModule,
    AIModule,
    TemplatesModule,
    CommonModule,
    UsageCountersModule,
  ],
  controllers: [ProposalsController],
  providers: [ProposalsService, ProposalProcessor, ExtractionProcessor],
  exports: [ProposalsService],
})
export class ProposalsModule {}
