import { IsString, IsOptional, IsEmail, IsBoolean, IsUUID } from 'class-validator';

export class UpdateOrganizationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  logo_url?: string;

  @IsEmail()
  @IsOptional()
  primary_email?: string;

  @IsBoolean()
  @IsOptional()
  is_paused?: boolean;

  @IsUUID()
  updated_by: string;
}
