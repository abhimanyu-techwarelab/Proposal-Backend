import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { AddUserToOrganizationDto } from './dto/add-user-to-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.logger.log(`[INIT] OrganizationsService initialized`);
  }

  async create(dto: CreateOrganizationDto): Promise<Organization> {
    this.logger.log(`[CREATE] Creating organization: ${dto.name}`);
    this.logger.log(`[CREATE] Fetching user: ${dto.user_id}`);

    const user = await this.userRepository.findOne({
      where: { id: dto.user_id, is_deleted: false },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.user_id} not found`);
    }

    this.logger.log(`[CREATE] User found with email: ${user.email}`);

    const organization = this.organizationRepository.create({
      name: dto.name,
      country: dto.country,
      primary_email: user.email,
    });

    const savedOrganization = await this.organizationRepository.save(organization);

    // Update user's organization_id
    user.organization_id = savedOrganization.id;
    await this.userRepository.save(user);

    this.logger.log(`[CREATE] Organization created with ID: ${savedOrganization.id}, primary_email: ${user.email}`);
    this.logger.log(`[CREATE] User ${dto.user_id} assigned to organization ${savedOrganization.id}`);

    return savedOrganization;
  }

  async softDelete(id: string): Promise<Organization> {
    this.logger.log(`[SOFT_DELETE] Soft deleting organization: ${id}`);

    const organization = await this.organizationRepository.findOne({
      where: { id, is_deleted: false },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    organization.is_deleted = true;
    const updatedOrganization = await this.organizationRepository.save(organization);

    // Soft delete all users under this organization
    await this.userRepository.update(
      { organization_id: id, is_deleted: false },
      { is_deleted: true },
    );

    this.logger.log(`[SOFT_DELETE] Organization and its users soft deleted: ${id}`);

    return updatedOrganization;
  }

  async addUserToOrganization(dto: AddUserToOrganizationDto): Promise<User> {
    this.logger.log(`[ADD_USER] Adding user ${dto.user_id} to organization ${dto.organization_id}`);

    const organization = await this.organizationRepository.findOne({
      where: { id: dto.organization_id, is_deleted: false },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${dto.organization_id} not found`);
    }

    const user = await this.userRepository.findOne({
      where: { id: dto.user_id, is_deleted: false },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.user_id} not found`);
    }

    user.organization_id = dto.organization_id;
    const updatedUser = await this.userRepository.save(user);

    this.logger.log(`[ADD_USER] User ${dto.user_id} added to organization ${dto.organization_id}`);

    return updatedUser;
  }

  async update(id: string, dto: UpdateOrganizationDto): Promise<Organization> {
    this.logger.log(`[UPDATE] Updating organization: ${id}`);

    const organization = await this.organizationRepository.findOne({
      where: { id, is_deleted: false },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    Object.assign(organization, dto);
    const updatedOrganization = await this.organizationRepository.save(organization);

    this.logger.log(`[UPDATE] Organization updated: ${id}`);

    return updatedOrganization;
  }

  async findAll(page?: number, limit?: number): Promise<Organization[] | { data: Organization[]; total: number; page: number; limit: number; totalPages: number }> {
    this.logger.log(`[FIND_ALL] Fetching all active organizations - page: ${page}, limit: ${limit}`);

    if (page !== undefined && limit !== undefined) {
      const skip = (page - 1) * limit;

      const [organizations, total] = await this.organizationRepository.findAndCount({
        where: { is_deleted: false },
        skip,
        take: limit,
      });

      this.logger.log(`[FIND_ALL] Found ${organizations.length} of ${total} organizations (page ${page})`);

      return {
        data: organizations,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const organizations = await this.organizationRepository.find({
      where: { is_deleted: false },
    });

    this.logger.log(`[FIND_ALL] Found ${organizations.length} organizations`);

    return organizations;
  }

  async findOne(id: string): Promise<Organization> {
    this.logger.log(`[FIND_ONE] Fetching organization: ${id}`);

    const organization = await this.organizationRepository.findOne({
      where: { id, is_deleted: false },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    this.logger.log(`[FIND_ONE] Found organization: ${id}`);

    return organization;
  }

  async count(): Promise<{
    count: number;
    countryWise: { country: string; count: number; percentage: number }[];
    monthWise: number[];
  }> {
    this.logger.log(`[COUNT] Counting all active organizations with statistics`);

    const count = await this.organizationRepository.count({
      where: { is_deleted: false },
    });

    // Country-wise count
    const countryStats = await this.organizationRepository
      .createQueryBuilder('org')
      .select('org.country', 'country')
      .addSelect('COUNT(*)', 'count')
      .where('org.is_deleted = :isDeleted', { isDeleted: false })
      .andWhere('org.country IS NOT NULL')
      .groupBy('org.country')
      .orderBy('count', 'DESC')
      .getRawMany();

    const countryWise = countryStats.map((stat) => ({
      country: stat.country,
      count: parseInt(stat.count, 10),
      percentage: count > 0 ? Math.round((parseInt(stat.count, 10) / count) * 100) : 0,
    }));

    // Month-wise count for the current year
    const currentYear = new Date().getFullYear();
    const monthStats = await this.organizationRepository
      .createQueryBuilder('org')
      .select('EXTRACT(MONTH FROM org.created_at)', 'month')
      .addSelect('COUNT(*)', 'count')
      .where('org.is_deleted = :isDeleted', { isDeleted: false })
      .andWhere('EXTRACT(YEAR FROM org.created_at) = :year', { year: currentYear })
      .groupBy('EXTRACT(MONTH FROM org.created_at)')
      .getRawMany();

    // Initialize all 12 months with 0
    const monthWise: number[] = Array(12).fill(0);
    monthStats.forEach((stat) => {
      const monthIndex = parseInt(stat.month, 10) - 1;
      monthWise[monthIndex] = parseInt(stat.count, 10);
    });

    this.logger.log(`[COUNT] Total: ${count}, Countries: ${countryWise.length}, Year: ${currentYear}`);

    return { count, countryWise, monthWise };
  }
}
