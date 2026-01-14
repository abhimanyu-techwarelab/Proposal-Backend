import { IsString, IsOptional, IsNumber, IsArray, Min, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetSignedUrlDto {
  @ApiProperty({
    description: 'Storage path where the file will be uploaded',
    example: 'uploads/documents/proposal.pdf',
    type: String,
  })
  @IsString()
  storagePath: string;

  @ApiPropertyOptional({
    description: 'Expiration time in seconds (default: 3600)',
    example: 3600,
    type: Number,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  expiresIn?: number;
}

export class GetSignedUrlsDto {
  @ApiProperty({
    description: 'Array of storage paths for multiple file uploads',
    example: ['uploads/documents/file1.pdf', 'uploads/documents/file2.pdf'],
    type: [String],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  storagePaths: string[];

  @ApiPropertyOptional({
    description: 'Expiration time in seconds for all URLs (default: 3600)',
    example: 3600,
    type: Number,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  expiresIn?: number;
}
