import { IsArray, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExtractFieldsDto {
  @ApiProperty({
    description: 'Array of document signed URLs to extract fields from',
    example: ['https://supabase.co/storage/v1/object/sign/proposal-documents/...'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  document_urls: string[];

  @ApiPropertyOptional({
    description: 'Array of audio signed URLs to transcribe and extract from',
    example: ['https://supabase.co/storage/v1/object/sign/proposal-audio/...'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  audio_urls?: string[];
}
