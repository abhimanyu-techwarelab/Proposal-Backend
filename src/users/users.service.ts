import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.logger.log(`[INIT] UsersService initialized`);
  }

  async create(dto: CreateUserDto): Promise<User> {
    this.logger.log(`[CREATE] Creating user: ${dto.email}`);

    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email, is_deleted: false },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash the password before saving
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(dto.password, saltRounds);

    const user = this.userRepository.create({
      email: dto.email,
      password_hash,
      first_name: dto.first_name,
      last_name: dto.last_name,
      organization_id: dto.organization_id,
    });

    const savedUser = await this.userRepository.save(user);

    this.logger.log(`[CREATE] User created with ID: ${savedUser.id}`);

    // Exclude password_hash from response
    const { password_hash: _, ...userWithoutPassword } = savedUser;
    return userWithoutPassword as User;
  }

  async findAll(organizationId: string, page?: number, limit?: number): Promise<User[] | { data: User[]; total: number; page: number; limit: number; totalPages: number }> {
    this.logger.log(`[FIND_ALL] Fetching users for organization: ${organizationId} - page: ${page}, limit: ${limit}`);

    if (page !== undefined && limit !== undefined) {
      const skip = (page - 1) * limit;

      const [users, total] = await this.userRepository.findAndCount({
        where: { organization_id: organizationId, is_deleted: false },
        select: ['id', 'organization_id', 'role_id', 'email', 'first_name', 'last_name', 'is_deleted', 'created_at', 'updated_at'],
        skip,
        take: limit,
      });

      this.logger.log(`[FIND_ALL] Found ${users.length} of ${total} users (page ${page})`);

      return {
        data: users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const users = await this.userRepository.find({
      where: { organization_id: organizationId, is_deleted: false },
      select: ['id', 'organization_id', 'role_id', 'email', 'first_name', 'last_name', 'is_deleted', 'created_at', 'updated_at'],
    });

    this.logger.log(`[FIND_ALL] Found ${users.length} users`);

    return users;
  }

  async findOne(id: string): Promise<User> {
    this.logger.log(`[FIND_ONE] Fetching user: ${id}`);

    const user = await this.userRepository.findOne({
      where: { id, is_deleted: false },
      select: ['id', 'organization_id', 'role_id', 'email', 'first_name', 'last_name', 'is_deleted', 'created_at', 'updated_at'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.logger.log(`[FIND_ONE] Found user: ${id}`);

    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    this.logger.log(`[UPDATE] Updating user: ${id}`);

    const user = await this.userRepository.findOne({
      where: { id, is_deleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if new email already exists
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: dto.email, is_deleted: false },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    Object.assign(user, dto);
    const updatedUser = await this.userRepository.save(user);

    this.logger.log(`[UPDATE] User updated: ${id}`);

    // Exclude password_hash from response
    const { password_hash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword as User;
  }

  async softDelete(id: string): Promise<User> {
    this.logger.log(`[SOFT_DELETE] Soft deleting user: ${id}`);

    const user = await this.userRepository.findOne({
      where: { id, is_deleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.is_deleted = true;
    const deletedUser = await this.userRepository.save(user);

    this.logger.log(`[SOFT_DELETE] User soft deleted: ${id}`);

    // Exclude password_hash from response
    const { password_hash: _, ...userWithoutPassword } = deletedUser;
    return userWithoutPassword as User;
  }
}
