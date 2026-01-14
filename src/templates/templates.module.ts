import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TemplatesController } from "./templates.controller";
import { TemplatesService } from "./templates.service";
import { Template } from "./entities/template.entity";
import { TemplateTag } from "./entities/template-tag.entity";
import { Tag } from "../tags/entities/tag.entity";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Template, TemplateTag, Tag]),
    StorageModule,
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
