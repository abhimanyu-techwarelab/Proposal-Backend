import { Controller, Get, Logger } from '@nestjs/common';
import { PermissionsService } from './permissions.service';

@Controller('saas-admin')
export class PermissionsController {
  private readonly logger = new Logger(PermissionsController.name);

  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('permissions')
  async findAll() {
    this.logger.log(`[REQUEST] GET /saas-admin/permissions`);

    const startTime = Date.now();
    const result = await this.permissionsService.findAllSaasAdmin();

    this.logger.log(`[RESPONSE] 200 OK - count: ${result.length} - ${Date.now() - startTime}ms`);

    return result;
  }
}
