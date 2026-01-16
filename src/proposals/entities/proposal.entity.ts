import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('proposals')
export class Proposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  subscription_id: string;

  @Column({ type: 'uuid', nullable: true })
  template_id: string;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @Column({ type: 'varchar', nullable: true })
  title: string;

  @Column({ type: 'varchar', nullable: true })
  client_name: string;

  @Column({ type: 'varchar', nullable: true })
  client_email: string;

  @Column({ type: 'varchar', nullable: true })
  industry: string;

  @Column({ type: 'text', nullable: true })
  executive_summary: string;

  @Column({ type: 'text', nullable: true })
  objectives: string;

  @Column({ type: 'text', nullable: true })
  training_and_support: string;

  @Column({ type: 'int', nullable: true })
  team_structure_min_experience: number;

  @Column({ type: 'jsonb', nullable: true })
  team_structure_table: object;

  @Column({ type: 'text', nullable: true })
  scope_of_work_introduction: string;

  @Column({ type: 'text', nullable: true })
  scope_of_work_summary: string;

  @Column({ type: 'text', nullable: true })
  scope_of_work: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'text', nullable: true })
  goals: string;

  @Column({ type: 'text', nullable: true })
  scope: string;

  @Column({ type: 'date', nullable: true })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  end_date: Date;

  @Column({ type: 'date', nullable: true })
  date_of_proposal: Date;

  @Column({ type: 'int', nullable: true })
  duration_business_days: number;

  @Column({ type: 'decimal', nullable: true })
  total_budget: number;

  @Column({ type: 'varchar', nullable: true })
  currency: string;

  @Column({ type: 'varchar', nullable: true })
  billing_type: string;

  @Column({ type: 'text', array: true, nullable: true })
  links: string[];

  @Column({ type: 'text', array: true, nullable: true })
  deliverables: string[];

  @Column({ type: 'jsonb', nullable: true })
  milestones: object;

  @Column({ type: 'jsonb', nullable: true })
  team_members: object;

  @Column({ type: 'text', array: true, nullable: true })
  submitted_to: string[];

  @Column({ type: 'text', array: true, nullable: true })
  audio_storage_paths: string[];

  @Column({ type: 'text', array: true, nullable: true })
  document_storage_paths: string[];

  @Column({ type: 'jsonb', nullable: true })
  implementation_timeline_table: object;

  @Column({ type: 'text', nullable: true })
  rendered_pdf_url: string;

  @Column({ type: 'varchar', nullable: true })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  pinecone_namespace: string;

  @Column({ type: 'uuid', nullable: true })
  parent_id: string;

  @Column({ type: 'int', default: 1 })
  version_number: number;

  @Column({ type: 'date', nullable: true })
  retention_date: Date;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn({ nullable: true })
  updated_at: Date;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string;

  @Column({ type: 'uuid', nullable: true })
  approved_by?: string;

  @Column({ type: 'timestamp', nullable: true })
  approved_at?: Date;

  @Column({ type: 'text', nullable: true })
  rejection_reason?: string;

  @Column({ type: 'text', nullable: true })
  approval_comments?: string;
}

export interface ProposalJobData {
  id: string;
  subscription_id?: string;
  template_id: string;
  created_by: string;
  title?: string;
  client_name?: string;
  client_email?: string;
  links?: string[];
  industry?: string;
  audio_storage_paths?: string[];
  document_storage_paths?: string[];
  summary?: string;
  goals?: string;
  scope?: string;
  deliverables?: string[];
  start_date?: string;
  end_date?: string;
  date_of_proposal?: string;
  milestones?: object[];
  total_budget?: number;
  currency?: string;
  billing_type?: string;
  team_members?: object[];
  submitted_to?: string[];
}

export interface AIGeneratedContent {
  'executive-summary'?: string;
  objectives?: string;
  'training-and-support'?: string;
  'team-structure-min-experiance'?: string;
  'team-structure-table'?: TeamStructureRow[];
  'scope-of-work-introduction'?: string;
  'scope-of-work-summary'?: string;
  'scope-of-work'?: string;
  'scope-of-work-main-points'?: string;
  'duration-business-days'?: string;
  'implementation-timeline-table'?: TimelineRow[];
}

export interface GeneralInfoOutput {
  'executive-summary': string;
  objectives: string;
  'training-and-support': string;
  'team-structure-min-experiance': string;
  'team-structure-table': TeamStructureRow[];
}

export interface ScopeOutput {
  'scope-of-work-introduction': string;
  'scope-of-work-summary': string;
  'scope-of-work': string;
  'scope-of-work-main-points': string;
}

export interface TimelineOutput {
  'duration-business-days': string;
  'implementation-timeline-table': TimelineRow[];
}

export interface TeamStructureRow {
  Designation: string;
  Count: string;
  'Key Responsibilities': string;
  Experience: string;
}

export interface TimelineRow {
  phase: string;
  scope: string;
  timeline: string;
}
