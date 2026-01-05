import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {
    this.logger.log(`[INIT] OrganizationsService initialized`);
  }

  async create(dto: CreateOrganizationDto): Promise<Organization> {
    this.logger.log(`[CREATE] Creating organization: ${dto.name}`);

    const organization = this.organizationRepository.create({
      name: dto.name,
      country: dto.country,
    });

    const savedOrganization = await this.organizationRepository.save(organization);

    this.logger.log(`[CREATE] Organization created with ID: ${savedOrganization.id}`);

    return savedOrganization;
  }
}
