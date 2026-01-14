import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("templates")
export class Template {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "text", nullable: true })
  html: string;

  @Column({ type: "text", nullable: true })
  preview_image: string;

  @Column({ type: "boolean", default: false })
  is_deleted: boolean;

  @Column({ type: "uuid", nullable: true })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn({ nullable: true })
  updated_at: Date;

  @Column({ type: "uuid", nullable: true })
  updated_by: string;
}
