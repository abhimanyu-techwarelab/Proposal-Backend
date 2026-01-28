import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { RolesService } from '../roles/roles.service';
import { PermissionsService } from '../permissions/permissions.service';
import { RolePermissionsService } from '../permissions/role-permissions.service';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private rolesService: RolesService,
    private permissionsService: PermissionsService,
    private rolePermissionsService: RolePermissionsService,
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
      address: dto.address,
      organization_size: dto.organization_size,
      primary_email: user.email,
    });

    const savedOrganization = await this.organizationRepository.save(organization);

    // Update user's organization_id
    user.organization_id = savedOrganization.id;
    await this.userRepository.save(user);

    this.logger.log(`[CREATE] Organization created with ID: ${savedOrganization.id}, primary_email: ${user.email}`);
    this.logger.log(`[CREATE] User ${dto.user_id} assigned to organization ${savedOrganization.id}`);

    try {
      // Create "Super Admin" role for the organization
      this.logger.log(`[CREATE] Creating Super Admin role for organization ${savedOrganization.id}`);
      const superAdminRole = await this.rolesService.create({
        name: 'Super Admin',
        organization_id: savedOrganization.id,
        description: 'Has all the permissions for the organization',
      });
      this.logger.log(`[CREATE] Super Admin role created with ID: ${superAdminRole.id}`);

      // Fetch all permissions where is_saas_admin=false
      this.logger.log(`[CREATE] Fetching all non-saas-admin permissions`);
      const permissions = await this.permissionsService.findAllNonSaasAdmin();
      this.logger.log(`[CREATE] Found ${permissions.length} non-saas-admin permissions`);

      // Create role_permissions entries for all those permissions
      if (permissions.length > 0) {
        this.logger.log(`[CREATE] Assigning ${permissions.length} permissions to Super Admin role`);
        const rolePermissionItems = permissions.map((permission) => ({
          role_id: superAdminRole.id,
          permission_id: permission.id,
          is_active: true,
        }));

        await this.rolePermissionsService.createOrUpdateBulk(rolePermissionItems);
        this.logger.log(`[CREATE] All permissions assigned to Super Admin role`);
      }

      // Assign the Super Admin role to the user
      this.logger.log(`[CREATE] Assigning Super Admin role to user ${dto.user_id}`);
      user.role_id = superAdminRole.id;
      await this.userRepository.save(user);
      this.logger.log(`[CREATE] Super Admin role assigned to user ${dto.user_id}`);
    } catch (error) {
      this.logger.error(`[CREATE] Error creating Super Admin role or assigning permissions: ${error.message || error}`);
      this.logger.error(`[CREATE] Stack trace: ${error.stack || 'No stack trace available'}`);
      
      // If it's already a NestJS exception, re-throw it
      if (error.statusCode || error.status) {
        throw error;
      }
      
      // Otherwise, wrap it in a more descriptive error
      throw new InternalServerErrorException(
        `Failed to create Super Admin role for organization: ${error.message || 'Unknown error'}`
      );
    }

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
