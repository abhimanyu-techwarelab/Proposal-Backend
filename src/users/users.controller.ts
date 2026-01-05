import { Controller, Post, Body, Logger } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('user')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Post('create')
  async create(@Body() dto: CreateUserDto) {
    this.logger.log(`[REQUEST] POST /user/create`);

    const startTime = Date.now();
    const result = await this.usersService.create(dto);

    this.logger.log(`[RESPONSE] 201 Created - id: ${result.id} - ${Date.now() - startTime}ms`);

    return result;
  }
}
