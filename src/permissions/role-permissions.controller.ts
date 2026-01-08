import { Controller, Put, Get, Body, Query, Logger } from '@nestjs/common';
import { RolePermissionsService } from './role-permissions.service';
import { RolePermissionItemDto } from './dto/create-role-permission.dto';

@Controller('role-permissions')
export class RolePermissionsController {
  private readonly logger = new Logger(RolePermissionsController.name);

  constructor(private readonly rolePermissionsService: RolePermissionsService) {}

  @Put('create')
  async create(@Body() items: RolePermissionItemDto[]) {
    this.logger.log(`[REQUEST] PUT /role-permissions/create - ${items.length} items`);

    const startTime = Date.now();
    const result = await this.rolePermissionsService.createOrUpdateBulk(items);

    this.logger.log(`[RESPONSE] 200 OK - processed: ${result.length} - ${Date.now() - startTime}ms`);

    return result;
  }

  @Get()
  async findByRole(@Query('role_id') roleId: string) {
    this.logger.log(`[REQUEST] GET /role-permissions?role_id=${roleId}`);

    const startTime = Date.now();
    const result = await this.rolePermissionsService.findByRoleId(roleId);

    this.logger.log(`[RESPONSE] 200 OK - count: ${result.length} - ${Date.now() - startTime}ms`);

    return result;
  }
}
