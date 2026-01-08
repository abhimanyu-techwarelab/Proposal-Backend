import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from './entities/role-permission.entity';
import { RolePermissionItemDto } from './dto/create-role-permission.dto';

@Injectable()
export class RolePermissionsService {
  private readonly logger = new Logger(RolePermissionsService.name);

  constructor(
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
  ) {
    this.logger.log(`[INIT] RolePermissionsService initialized`);
  }

  async createOrUpdateBulk(items: RolePermissionItemDto[]): Promise<RolePermission[]> {
    this.logger.log(`[CREATE_OR_UPDATE_BULK] Processing ${items.length} role permissions`);

    const results: RolePermission[] = [];

    for (const item of items) {
      // Check if combination exists
      const existing = await this.rolePermissionRepository.findOne({
        where: {
          role_id: item.role_id,
          permission_id: item.permission_id,
        },
      });

      if (existing) {
        // Update is_active
        existing.is_active = item.is_active;
        const updated = await this.rolePermissionRepository.save(existing);
        this.logger.log(`[UPDATE] role_id: ${item.role_id}, permission_id: ${item.permission_id}, is_active: ${item.is_active}`);
        results.push(updated);
      } else {
        // Create new
        const rolePermission = this.rolePermissionRepository.create({
          role_id: item.role_id,
          permission_id: item.permission_id,
          is_active: item.is_active,
        });
        const saved = await this.rolePermissionRepository.save(rolePermission);
        this.logger.log(`[CREATE] role_id: ${item.role_id}, permission_id: ${item.permission_id}, is_active: ${item.is_active}`);
        results.push(saved);
      }
    }

    this.logger.log(`[CREATE_OR_UPDATE_BULK] Completed processing ${results.length} role permissions`);

    return results;
  }

  async findByRoleId(roleId: string): Promise<{ role_id: string; permission_id: string; is_active: boolean }[]> {
    this.logger.log(`[FIND_BY_ROLE] Fetching active permissions for role: ${roleId}`);

    const rolePermissions = await this.rolePermissionRepository.find({
      where: { role_id: roleId, is_active: true },
      select: ['role_id', 'permission_id', 'is_active'],
    });

    this.logger.log(`[FIND_BY_ROLE] Found ${rolePermissions.length} active permissions`);

    return rolePermissions;
  }
}
