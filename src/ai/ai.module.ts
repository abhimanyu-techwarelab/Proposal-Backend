import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AudioChunkingService } from './audio-chunking.service';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';

@Module({
  imports: [KnowledgeBaseModule],
  providers: [AIService, AudioChunkingService],
  exports: [AIService, AudioChunkingService],
})
export class AIModule {}
