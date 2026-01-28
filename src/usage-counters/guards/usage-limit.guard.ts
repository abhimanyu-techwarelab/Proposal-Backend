import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USAGE_FEATURE_KEY } from '../decorators/check-usage.decorator';
import { UsageCountersService } from '../usage-counters.service';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class UsageLimitGuard implements CanActivate {
  private readonly logger = new Logger(UsageLimitGuard.name);

  constructor(
    private reflector: Reflector,
    private usageCountersService: UsageCountersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string>(
      USAGE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no feature key is set on the handler, allow access
    if (!featureKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      this.logger.error(
        '[USAGE_LIMIT] User object not found in request. JWT guard may have failed.',
      );
      throw new ForbiddenException('User not authenticated');
    }

    const organizationId = user.organization_id;
    const route = `${request.method} ${request.url}`;

    this.logger.log(
      `[USAGE_LIMIT] Checking feature: ${featureKey} for org: ${organizationId} on route: ${route}`,
    );

    const result = await this.usageCountersService.checkLimit(
      organizationId,
      featureKey,
    );

    if (!result.allowed) {
      this.logger.warn(
        `[USAGE_LIMIT] Limit exceeded for feature ${featureKey}. Usage: ${result.current_usage}/${result.limit}. Org: ${organizationId}`,
      );
      const featureLabels: Record<string, string> = {
        proposal_number: 'proposal',
        user_number: 'user',
      };
      const label = featureLabels[featureKey] || featureKey;
      throw new ForbiddenException({
        statusCode: 403,
        message: `You have reached your plan's ${label} limit (${result.limit}). Please upgrade your plan to continue.`,
        error: 'USAGE_LIMIT_EXCEEDED',
        current_usage: result.current_usage,
        limit: result.limit,
      });
    }

    this.logger.log(
      `[USAGE_LIMIT] Allowed for feature ${featureKey}. Usage: ${result.current_usage}/${result.limit}. Remaining: ${result.remaining}`,
    );

    return true;
  }
}
