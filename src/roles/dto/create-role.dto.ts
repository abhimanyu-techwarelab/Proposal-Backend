import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  organization_id: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}
