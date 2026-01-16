import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectProposalDto {
  @ApiProperty({
    description: 'Reason for rejecting the proposal',
    example: 'Budget exceeds approved limits',
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' })
  reason: string;
}
