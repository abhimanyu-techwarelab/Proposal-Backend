import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';

export class GenerateProposalDto {
  @IsUUID()
  subscription_id: string;

  @IsUUID()
  template_id: string;

  @IsUUID()
  created_by: string;

  @IsArray()
  @IsString({ each: true })
  submitted_to: string[];

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  client_name?: string;

  @IsOptional()
  @IsString()
  client_email?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  links?: string[];

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  audio_storage_paths?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  document_storage_paths?: string[];

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  goals?: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliverables?: string[];

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsString()
  date_of_proposal?: string;

  @IsOptional()
  @IsArray()
  milestones?: object[];

  @IsOptional()
  @IsNumber()
  total_budget?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  billing_type?: string;

  @IsOptional()
  @IsArray()
  team_members?: object[];

  // Backward compatibility aliases
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @IsOptional()
  @IsUUID()
  user_id?: string;

  // Retry: If provided, creates a new version based on this proposal
  @IsOptional()
  @IsUUID()
  proposal_id?: string;
}
