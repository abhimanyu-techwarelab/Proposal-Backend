import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  IsObject,
} from 'class-validator';

export class GenerateProposalDto {
  @IsUUID()
  proposal_id: string;

  @IsUUID()
  organization_id: string;

  @IsUUID()
  template_id: string;

  @IsUUID()
  created_by: string;

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
  audio_path?: string[];

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

  @IsOptional()
  @IsString()
  submitted_to?: string;
}
