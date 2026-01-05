import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

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

    const user = this.userRepository.create({
      email: dto.email,
      password_hash: dto.password_hash,
      first_name: dto.first_name,
      last_name: dto.last_name,
    });

    const savedUser = await this.userRepository.save(user);

    this.logger.log(`[CREATE] User created with ID: ${savedUser.id}`);

    return savedUser;
  }
}
