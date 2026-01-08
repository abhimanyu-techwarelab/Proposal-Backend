import { Controller, Post, Get, Put, Delete, Body, Param, Query, Logger, BadRequestException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('roles')
export class RolesController {
  private readonly logger = new Logger(RolesController.name);

  constructor(private readonly rolesService: RolesService) {}

  @Post('create')
  async create(@Body() dto: CreateRoleDto) {
    this.logger.log(`[REQUEST] POST /roles/create`);

    const startTime = Date.now();
    const result = await this.rolesService.create(dto);

    this.logger.log(`[RESPONSE] 201 Created - id: ${result.id} - ${Date.now() - startTime}ms`);

    return result;
  }

  @Get()
  async findAll(
    @Query('organization_id') organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.logger.log(`[REQUEST] GET /roles - organization_id: ${organizationId}, page: ${page}, limit: ${limit}`);

    if (!organizationId) {
      throw new BadRequestException('organization_id is required');
    }

    const startTime = Date.now();
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;

    const result = await this.rolesService.findAll(organizationId, pageNum, limitNum);

    if (Array.isArray(result)) {
      this.logger.log(`[RESPONSE] 200 OK - count: ${result.length} - ${Date.now() - startTime}ms`);
    } else {
      this.logger.log(`[RESPONSE] 200 OK - count: ${result.data.length}, total: ${result.total} - ${Date.now() - startTime}ms`);
    }

    return result;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.log(`[REQUEST] GET /roles/${id}`);

    const startTime = Date.now();
    const result = await this.rolesService.findOne(id);

    this.logger.log(`[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`);

    return result;
  }

  @Put('update/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    this.logger.log(`[REQUEST] PUT /roles/update/${id}`);

    const startTime = Date.now();
    const result = await this.rolesService.update(id, dto);

    this.logger.log(`[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`);

    return result;
  }

  @Delete('delete/:id')
  async delete(@Param('id') id: string) {
    this.logger.log(`[REQUEST] DELETE /roles/delete/${id}`);

    const startTime = Date.now();
    const result = await this.rolesService.softDelete(id);

    this.logger.log(`[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`);

    return result;
  }
}
