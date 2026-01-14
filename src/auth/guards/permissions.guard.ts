import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/require-permission.decorator";
import { JwtPayload } from "../interfaces/jwt-payload.interface";

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    // If no permissions are required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      this.logger.error(
        "[PERMISSIONS] User object not found in request. JWT guard may have failed."
      );
      throw new ForbiddenException("User not authenticated");
    }

    const userPermissions = user.permissions || [];
    const route = `${request.method} ${request.url}`;

    this.logger.log(
      `[PERMISSIONS] Checking route: ${route}. Required: [${requiredPermissions.join(
        ", "
      )}]. User has: [${userPermissions.join(", ") || "none"}]`
    );

    // Check if user has ANY of the required permissions (OR logic)
    // This allows flexibility for both Admin Panel and Product App permissions:
    // - Admin Panel permissions: e.g., 'read_role', 'create_role', 'update_role', 'delete_role'
    // - Product App permissions: e.g., 'read_roles_product', 'create_roles_product', etc.
    // Example: @RequirePermission('read_role', 'read_roles_product') means
    // user needs read_role (Admin Panel) OR read_roles_product (Product App)
    // This allows the same endpoint to work for both admin panel and product app users
    const hasAnyPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAnyPermission) {
      this.logger.warn(
        `[PERMISSIONS] Access denied for ${route}. Required (any of): [${requiredPermissions.join(
          ", "
        )}]. User has: [${userPermissions.join(", ") || "none"}]. User ID: ${
          user.user_id
        }`
      );
      throw new ForbiddenException(
        `Insufficient permissions. Required (any of): ${requiredPermissions.join(
          ", "
        )}. User has: ${userPermissions.join(", ") || "none"}`
      );
    }

    this.logger.log(`[PERMISSIONS] Access granted for ${route}`);
    return true;
  }
}
