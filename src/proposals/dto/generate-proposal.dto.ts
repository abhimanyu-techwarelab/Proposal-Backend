import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateProposalDto {
  @ApiProperty({
    description: 'Subscription ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
    format: 'uuid',
  })
  @IsUUID()
  subscription_id: string;

  @ApiProperty({
    description: 'Template ID (UUID) to use for proposal generation',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
    format: 'uuid',
  })
  @IsUUID()
  template_id: string;

  @ApiProperty({
    description: 'User ID (UUID) who is creating the proposal',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
    format: 'uuid',
  })
  @IsUUID()
  created_by: string;

  @ApiProperty({
    description: 'Array of email addresses to submit the proposal to',
    example: ['client@example.com', 'manager@example.com'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  submitted_to: string[];

  @ApiPropertyOptional({
    description: 'Proposal title',
    example: 'Website Redesign Proposal',
    type: String,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Client name',
    example: 'Acme Corporation',
    type: String,
  })
  @IsOptional()
  @IsString()
  client_name?: string;

  @ApiPropertyOptional({
    description: 'Client email address',
    example: 'client@example.com',
    type: String,
    format: 'email',
  })
  @IsOptional()
  @IsString()
  client_email?: string;

  @ApiPropertyOptional({
    description: 'Array of relevant links',
    example: ['https://example.com', 'https://example2.com'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  links?: string[];

  @ApiPropertyOptional({
    description: 'Industry sector',
    example: 'Technology',
    type: String,
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    description: 'Array of audio file storage paths',
    example: ['storage/audio/file1.mp3', 'storage/audio/file2.mp3'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  audio_storage_paths?: string[];

  @ApiPropertyOptional({
    description: 'Array of document file storage paths',
    example: ['storage/docs/doc1.pdf', 'storage/docs/doc2.pdf'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  document_storage_paths?: string[];

  @ApiPropertyOptional({
    description: 'Project summary',
    example: 'A comprehensive website redesign project',
    type: String,
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({
    description: 'Project goals',
    example: 'Improve user experience and increase conversions',
    type: String,
  })
  @IsOptional()
  @IsString()
  goals?: string;

  @ApiPropertyOptional({
    description: 'Project scope',
    example: 'Full website redesign including frontend and backend',
    type: String,
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({
    description: 'Array of project deliverables',
    example: ['Responsive website', 'Admin dashboard', 'API documentation'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliverables?: string[];

  @ApiPropertyOptional({
    description: 'Project start date (ISO 8601 format)',
    example: '2024-01-01',
    type: String,
  })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Project end date (ISO 8601 format)',
    example: '2024-06-30',
    type: String,
  })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Date of proposal (ISO 8601 format)',
    example: '2024-01-15',
    type: String,
  })
  @IsOptional()
  @IsString()
  date_of_proposal?: string;

  @ApiPropertyOptional({
    description: 'Array of project milestones',
    example: [{ name: 'Phase 1', date: '2024-02-01', description: 'Design completion' }],
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  milestones?: object[];

  @ApiPropertyOptional({
    description: 'Total project budget',
    example: 50000,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  total_budget?: number;

  @ApiPropertyOptional({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
    type: String,
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Billing type',
    example: 'Fixed Price',
    type: String,
  })
  @IsOptional()
  @IsString()
  billing_type?: string;

  @ApiPropertyOptional({
    description: 'Array of team members',
    example: [{ name: 'John Doe', role: 'Developer', email: 'john@example.com' }],
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  team_members?: object[];

  // Backward compatibility aliases
  @ApiPropertyOptional({
    description: 'Organization ID (backward compatibility)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiPropertyOptional({
    description: 'User ID (backward compatibility)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  // Retry: If provided, creates a new version based on this proposal
  @ApiPropertyOptional({
    description: 'Proposal ID for retry/version creation',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  proposal_id?: string;
}
