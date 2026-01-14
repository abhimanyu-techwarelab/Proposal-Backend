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

    // 3. Fetch user permissions via role_permissions join
    const permissions = await this.getUserPermissions(user.role_id);
    
    // 4. Check if user has any admin permissions
    const hasAdminAccess = await this.checkAdminAccess(user.role_id);

    // 5. Build JWT payload
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

  private async getUserPermissions(roleId: string): Promise<string[]> {
    if (!roleId) {
      return [];
    }

    const rolePermissions = await this.rolePermissionRepository.find({
      where: { role_id: roleId, is_active: true },
      relations: ['permission'],
    });

    const permissions = rolePermissions
      .filter((rp) => rp.permission) // Ensure permission exists
      .map((rp) => rp.permission.key);
    
    this.logger.log(`[PERMISSIONS] Fetched ${permissions.length} permissions for role ${roleId}: ${permissions.join(', ')}`);
    
    return permissions;
  }

  private async checkAdminAccess(roleId: string): Promise<boolean> {
    if (!roleId) {
      return false;
    }

    const rolePermissions = await this.rolePermissionRepository.find({
      where: { role_id: roleId, is_active: true },
      relations: ['permission'],
    });

    // Check if user has any permission with is_saas_admin = true
    const hasAdminAccess = rolePermissions.some(
      (rp) => rp.permission && rp.permission.is_saas_admin === true
    );

    this.logger.log(`[ADMIN_CHECK] Role ${roleId} has admin access: ${hasAdminAccess}`);
    
    return hasAdminAccess;
  }
}
