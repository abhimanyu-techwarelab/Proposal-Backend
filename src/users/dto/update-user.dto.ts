import { IsString, IsEmail, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
    type: String,
  })
  @IsString()
  @IsOptional()
  first_name?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
    type: String,
  })
  @IsString()
  @IsOptional()
  last_name?: string;

  @ApiPropertyOptional({
    description: 'User email address (must be unique if provided)',
    example: 'user@example.com',
    type: String,
    format: 'email',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Role ID to assign to the user',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  role_id?: string;

  @ApiPropertyOptional({
    description: 'Profile image URL',
    example: 'https://example.com/profile.jpg',
    type: String,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  profile_image?: string | null;
}
