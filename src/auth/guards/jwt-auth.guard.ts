import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const route = `${request.method} ${request.url}`;
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn(`[JWT] No Authorization header found for ${route}`);
      throw new UnauthorizedException('No authorization header');
    }

    if (!authHeader.startsWith('Bearer ')) {
      this.logger.warn(`[JWT] Invalid Authorization header format for ${route}. Expected "Bearer <token>"`);
      throw new UnauthorizedException('Invalid authorization header format');
    }

    this.logger.log(`[JWT] Validating token for ${route}`);
    
    return super.canActivate(context) as Promise<boolean>;
  }

  handleRequest(err: any, user: any, info: any) {
    if (err) {
      this.logger.error(`[JWT] Authentication error: ${err.message}`);
      throw err;
    }

    if (!user) {
      const errorMsg = info?.message || 'Token validation failed';
      this.logger.error(`[JWT] Authentication failed: ${errorMsg}`);
      throw new UnauthorizedException(errorMsg);
    }

    this.logger.log(`[JWT] Authentication successful, user: ${user.user_id}`);
    return user;
  }
}
