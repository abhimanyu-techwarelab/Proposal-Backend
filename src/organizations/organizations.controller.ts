import { Controller, Get, Post, Put, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { AddUserToOrganizationDto } from './dto/add-user-to-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Controller('organizations')
export class OrganizationsController {
  private readonly logger = new Logger(OrganizationsController.name);

  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post('create')
  async create(@Body() dto: CreateOrganizationDto) {
    this.logger.log(`[REQUEST] POST /organizations/create`);

    const startTime = Date.now();
    const result = await this.organizationsService.create(dto);

    this.logger.log(`[RESPONSE] 201 Created - id: ${result.id} - ${Date.now() - startTime}ms`);

    return result;
  }

  @Delete('delete/:id')
  async delete(@Param('id') id: string) {
    this.logger.log(`[REQUEST] DELETE /organizations/delete/${id}`);

    const startTime = Date.now();
    const result = await this.organizationsService.softDelete(id);

    this.logger.log(`[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`);

    return result;
  }

  @Post('add-user')
  async addUser(@Body() dto: AddUserToOrganizationDto) {
    this.logger.log(`[REQUEST] POST /organizations/add-user`);

    const startTime = Date.now();
    const result = await this.organizationsService.addUserToOrganization(dto);

    this.logger.log(`[RESPONSE] 200 OK - user: ${result.id} added to org: ${result.organization_id} - ${Date.now() - startTime}ms`);

    return result;
  }

  @Put('update/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    this.logger.log(`[REQUEST] PUT /organizations/update/${id}`);

    const startTime = Date.now();
    const result = await this.organizationsService.update(id, dto);

    this.logger.log(`[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`);

    return result;
  }

  @Get('count')
  async count() {
    this.logger.log(`[REQUEST] GET /organizations/count`);

    const startTime = Date.now();
    const result = await this.organizationsService.count();

    this.logger.log(`[RESPONSE] 200 OK - count: ${result.count} - ${Date.now() - startTime}ms`);

    return result;
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.logger.log(`[REQUEST] GET /organizations - page: ${page}, limit: ${limit}`);

    const startTime = Date.now();
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;

    const result = await this.organizationsService.findAll(pageNum, limitNum);

    if (Array.isArray(result)) {
      this.logger.log(`[RESPONSE] 200 OK - count: ${result.length} - ${Date.now() - startTime}ms`);
    } else {
      this.logger.log(`[RESPONSE] 200 OK - count: ${result.data.length}, total: ${result.total} - ${Date.now() - startTime}ms`);
    }

    return result;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.log(`[REQUEST] GET /organizations/${id}`);

    const startTime = Date.now();
    const result = await this.organizationsService.findOne(id);

    this.logger.log(`[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`);

    return result;
  }
}
