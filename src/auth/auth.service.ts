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

    // 4. Build JWT payload
    const payload: JwtPayload = {
      user_id: user.id,
      organization_id: user.organization_id,
      permissions: permissions,
    };

    // 5. Generate and return token
    const access_token = this.jwtService.sign(payload);

    this.logger.log(`[LOGIN] Login successful for: ${dto.email}`);

    return { access_token };
  }

  private async getUserPermissions(roleId: string): Promise<string[]> {
    if (!roleId) {
      return [];
    }

    const rolePermissions = await this.rolePermissionRepository.find({
      where: { role_id: roleId },
      relations: ['permission'],
    });

    return rolePermissions.map((rp) => rp.permission.key);
  }
}
