export interface Proposal {
  proposal_id: string;
  organization_id: string;
  created_at?: string;
  created_by: string;
  title?: string;
  client_name?: string;
  client_email?: string;
  links?: string[];
  industry?: string;
  audio_path?: string[];
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
  submitted_to?: string;
  status: 'approval_pending' | 'failed';
  pdf_code?: string;
  error?: string;
}

export interface ProposalJobData {
  proposal_id: string;
  organization_id: string;
  template_id: string;
  created_by: string;
  title?: string;
  client_name?: string;
  client_email?: string;
  links?: string[];
  industry?: string;
  audio_path?: string[];
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
  submitted_to?: string;
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
