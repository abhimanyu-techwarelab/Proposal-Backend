import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';
import { ProposalProcessor } from './processors/proposal.processor';
import { StorageModule } from '../storage/storage.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { AIModule } from '../ai/ai.module';
import { TemplatesModule } from '../templates/templates.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'proposal-generation',
    }),
    StorageModule,
    KnowledgeBaseModule,
    AIModule,
    TemplatesModule,
    CommonModule,
  ],
  controllers: [ProposalsController],
  providers: [ProposalsService, ProposalProcessor],
  exports: [ProposalsService],
})
export class ProposalsModule {}
