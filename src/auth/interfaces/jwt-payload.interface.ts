export interface JwtPayload {
  user_id: string;
  organization_id: string;
  permissions: string[];
  has_admin_access: boolean;
  iat?: number;
  exp?: number;
}
