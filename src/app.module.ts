import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProposalsModule } from "./proposals/proposals.module";
import { QueueModule } from "./queue/queue.module";
import { StorageModule } from "./storage/storage.module";
import { KnowledgeBaseModule } from "./knowledge-base/knowledge-base.module";
import { AIModule } from "./ai/ai.module";
import { TemplatesModule } from "./templates/templates.module";
import { CommonModule } from "./common/common.module";
import { HealthModule } from "./health/health.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { UsersModule } from "./users/users.module";
import { RolesModule } from "./roles/roles.module";
import { AuthModule } from "./auth/auth.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { TagsModule } from "./tags/tags.module";
import { SeedModule } from "./seed/seed.module";
import { FeaturesModule } from "./features/features.module";
import { PlansModule } from "./plans/plans.module";
import { Proposal } from "./proposals/entities/proposal.entity";
import { Template } from "./templates/entities/template.entity";
import { Organization } from "./organizations/entities/organization.entity";
import { User } from "./users/entities/user.entity";
import { Role } from "./roles/entities/role.entity";
import { Permission } from "./permissions/entities/permission.entity";
import { RolePermission } from "./permissions/entities/role-permission.entity";
import { Tag } from "./tags/entities/tag.entity";
import { TemplateTag } from "./templates/entities/template-tag.entity";
import { Feature } from "./features/entities/feature.entity";
import { Plan } from "./plans/entities/plan.entity";
import { PlanFeature } from "./plans/entities/plan-feature.entity";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get<string>("DB_HOST", "localhost"),
        port: configService.get<number>("DB_PORT", 5432),
        username: configService.get<string>("DB_USERNAME", "postgres"),
        password: configService.get<string>("DB_PASSWORD", ""),
        database: configService.get<string>("DB_DATABASE", "proposal_db"),
        entities: [
          Proposal,
          Template,
          TemplateTag,
          Organization,
          User,
          Role,
          Permission,
          RolePermission,
          Tag,
          Feature,
          Plan,
          PlanFeature,
        ],
        synchronize: false,
        ssl:
          configService.get<string>("DB_SSL", "false") === "true"
            ? { rejectUnauthorized: false }
            : false,
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const password = configService.get<string>("REDIS_PASSWORD");
        return {
          connection: {
            host: configService.get<string>("REDIS_HOST", "localhost"),
            port: configService.get<number>("REDIS_PORT", 6379),
            ...(password && { password }),
          },
        };
      },
      inject: [ConfigService],
    }),
    ProposalsModule,
    QueueModule,
    StorageModule,
    KnowledgeBaseModule,
    AIModule,
    TemplatesModule,
    CommonModule,
    HealthModule,
    OrganizationsModule,
    UsersModule,
    RolesModule,
    AuthModule,
    PermissionsModule,
    TagsModule,
    SeedModule,
    FeaturesModule,
    PlansModule,
  ],
})
export class AppModule {}
