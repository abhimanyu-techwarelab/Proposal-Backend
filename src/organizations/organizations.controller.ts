import { Controller, Post, Body, Logger } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

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
}
