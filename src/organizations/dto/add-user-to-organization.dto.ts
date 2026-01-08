import { IsUUID, IsNotEmpty } from 'class-validator';

export class AddUserToOrganizationDto {
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @IsUUID()
  @IsNotEmpty()
  organization_id: string;
}
