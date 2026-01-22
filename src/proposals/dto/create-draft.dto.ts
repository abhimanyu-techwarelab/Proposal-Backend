import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateDraftDto {
  @ApiProperty({
    description: 'Template ID to use for the proposal',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  template_id: string;

  @ApiProperty({
    description: 'Subscription ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  subscription_id: string;

  @ApiPropertyOptional({
    description: 'Audio file storage paths',
    example: ['proposal-audio/org-id/user-id/recording.mp3'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  audio_storage_paths?: string[];

  @ApiPropertyOptional({
    description: 'Document file storage paths',
    example: ['proposal-documents/org-id/user-id/doc.pdf'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  document_storage_paths?: string[];

  @ApiPropertyOptional({
    description: 'Proposal title',
    example: 'Q4 Marketing Proposal',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Client name',
    example: 'Acme Corporation',
  })
  @IsOptional()
  @IsString()
  client_name?: string;

  @ApiPropertyOptional({
    description: 'Client email',
    example: 'client@acme.com',
  })
  @IsOptional()
  @IsString()
  client_email?: string;

  @ApiPropertyOptional({
    description: 'Industry',
    example: 'Technology',
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
}
