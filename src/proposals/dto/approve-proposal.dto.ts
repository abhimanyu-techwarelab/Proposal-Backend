import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveProposalDto {
  @ApiPropertyOptional({
    description: 'Optional comments for the approval',
    example: 'Approved with minor changes',
    type: String,
  })
  @IsOptional()
  @IsString()
  comments?: string;
}
