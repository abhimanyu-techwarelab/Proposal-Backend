import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {
    this.logger.log(`[INIT] PermissionsService initialized`);
  }

  async findAllSaasAdmin(): Promise<Permission[]> {
    this.logger.log(`[FIND_ALL] Fetching all saas-admin permissions`);

    const permissions = await this.permissionRepository.find({
      where: { is_saas_admin: true },
    });

    this.logger.log(`[FIND_ALL] Found ${permissions.length} saas-admin permissions`);

    return permissions;
  }

  async findAllNonSaasAdmin(): Promise<Permission[]> {
    this.logger.log(`[FIND_ALL] Fetching all non-saas-admin permissions`);

    const permissions = await this.permissionRepository.find({
      where: { is_saas_admin: false },
    });

    this.logger.log(`[FIND_ALL] Found ${permissions.length} non-saas-admin permissions`);

    return permissions;
  }
}
