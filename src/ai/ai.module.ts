import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';

@Module({
  imports: [KnowledgeBaseModule],
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}
