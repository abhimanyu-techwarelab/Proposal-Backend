import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Template } from "./template.entity";
import { Tag } from "../../tags/entities/tag.entity";

@Entity("template_tags")
export class TemplateTag {
  @PrimaryColumn({ type: "uuid" })
  template_id: string;

  @PrimaryColumn({ type: "uuid" })
  tag_id: string;

  @ManyToOne(() => Template, { onDelete: "CASCADE" })
  @JoinColumn({ name: "template_id" })
  template: Template;

  @ManyToOne(() => Tag, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tag_id" })
  tag: Tag;
}
