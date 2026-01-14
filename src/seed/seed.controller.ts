import { Controller, Post, Logger } from '@nestjs/common';
import { SeedService } from './seed.service';

@Controller()
export class SeedController {
  private readonly logger = new Logger(SeedController.name);

  constructor(private readonly seedService: SeedService) {}

  @Post('seed')
  async seed() {
    this.logger.log(`[REQUEST] POST /seed`);
    const startTime = Date.now();
    const result = await this.seedService.seed();
    this.logger.log(`[RESPONSE] 200 OK - ${Date.now() - startTime}ms`);
    return result;
  }
}
