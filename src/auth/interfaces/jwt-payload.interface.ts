export interface JwtPayload {
  user_id: string;
  organization_id: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}
