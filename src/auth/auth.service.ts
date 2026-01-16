import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
    private jwtService: JwtService,
  ) {
    this.logger.log('[INIT] AuthService initialized');
  }

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    this.logger.log(`[LOGIN] Attempting login for: ${dto.email}`);

    // 1. Find user by email
    const user = await this.userRepository.findOne({
      where: { email: dto.email, is_deleted: false },
    });

    if (!user) {
      this.logger.warn(`[LOGIN] User not found: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Validate password using bcrypt
    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);

    if (!isPasswordValid) {
      this.logger.warn(`[LOGIN] Invalid password for: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Fetch user permissions and admin access in a single query
    const { permissions, hasAdminAccess } = await this.getUserPermissionsAndAdminAccess(user.role_id);

    // 4. Build JWT payload
    const payload: JwtPayload = {
      user_id: user.id,
      organization_id: user.organization_id,
      permissions: permissions,
      has_admin_access: hasAdminAccess,
    };

    // 6. Generate and return token
    const access_token = this.jwtService.sign(payload);

    this.logger.log(`[LOGIN] Login successful for: ${dto.email} (Admin access: ${hasAdminAccess})`);

    return { access_token };
  }

  private async getUserPermissionsAndAdminAccess(roleId: string): Promise<{ permissions: string[]; hasAdminAccess: boolean }> {
    if (!roleId) {
      return { permissions: [], hasAdminAccess: false };
    }

    // Single query to fetch all role permissions with their permission details
    const rolePermissions = await this.rolePermissionRepository.find({
      where: { role_id: roleId, is_active: true },
      relations: ['permission'],
    });

    // Extract permissions and check admin access from the same result set
    const permissions: string[] = [];
    let hasAdminAccess = false;

    for (const rp of rolePermissions) {
      if (rp.permission) {
        permissions.push(rp.permission.key);
        if (rp.permission.is_saas_admin === true) {
          hasAdminAccess = true;
        }
      }
    }

    this.logger.log(`[PERMISSIONS] Fetched ${permissions.length} permissions for role ${roleId}: ${permissions.join(', ')}`);
    this.logger.log(`[ADMIN_CHECK] Role ${roleId} has admin access: ${hasAdminAccess}`);

    return { permissions, hasAdminAccess };
  }
}
