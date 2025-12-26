import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ProposalsModule } from './proposals/proposals.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { AIModule } from './ai/ai.module';
import { TemplatesModule } from './templates/templates.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    ProposalsModule,
    QueueModule,
    StorageModule,
    KnowledgeBaseModule,
    AIModule,
    TemplatesModule,
    CommonModule,
  ],
})
export class AppModule {}
