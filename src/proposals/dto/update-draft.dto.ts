import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';

export class UpdateDraftDto {
  @ApiPropertyOptional({
    description: 'Audio file storage paths',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  audio_storage_paths?: string[];

  @ApiPropertyOptional({
    description: 'Document file storage paths',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  document_storage_paths?: string[];

  @ApiPropertyOptional({
    description: 'Proposal title',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Client name',
  })
  @IsOptional()
  @IsString()
  client_name?: string;

  @ApiPropertyOptional({
    description: 'Client email',
  })
  @IsOptional()
  @IsString()
  client_email?: string;

  @ApiPropertyOptional({
    description: 'Industry',
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    description: 'Proposal summary',
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({
    description: 'Project goals',
  })
  @IsOptional()
  @IsString()
  goals?: string;

  @ApiPropertyOptional({
    description: 'Project scope',
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({
    description: 'Deliverables list',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliverables?: string[];

  @ApiPropertyOptional({
    description: 'Start date (ISO format)',
  })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'End date (ISO format)',
  })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Total budget',
  })
  @IsOptional()
  @IsNumber()
  total_budget?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Billing type',
  })
  @IsOptional()
  @IsString()
  billing_type?: string;

  @ApiPropertyOptional({
    description: 'Project milestones',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  milestones?: object[];

  @ApiPropertyOptional({
    description: 'Team members',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  team_members?: object[];

  @ApiPropertyOptional({
    description: 'Related links',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  links?: string[];

  @ApiPropertyOptional({
    description: 'Submitted to recipients',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  submitted_to?: string[];

  @ApiPropertyOptional({
    description: 'Extraction status',
  })
  @IsOptional()
  @IsString()
  extraction_status?: string;

  @ApiPropertyOptional({
    description: 'Extraction progress (0-100)',
  })
  @IsOptional()
  @IsNumber()
  extraction_progress?: number;
}
