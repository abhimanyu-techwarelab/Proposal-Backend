import { IsUUID, IsNotEmpty, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RolePermissionItemDto {
  @IsUUID()
  @IsNotEmpty()
  role_id: string;

  @IsUUID()
  @IsNotEmpty()
  permission_id: string;

  @IsBoolean()
  @IsNotEmpty()
  is_active: boolean;
}

export class CreateRolePermissionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionItemDto)
  items: RolePermissionItemDto[];
}
