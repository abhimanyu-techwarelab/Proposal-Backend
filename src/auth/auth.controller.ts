import { Controller, Post, Body, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    this.logger.log(`[REQUEST] POST /auth/login - email: ${dto.email}`);

    const startTime = Date.now();
    const result = await this.authService.login(dto);

    this.logger.log(`[RESPONSE] 200 OK - ${Date.now() - startTime}ms`);

    return result;
  }
}
