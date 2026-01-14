import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Organization } from '../organizations/entities/organization.entity';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {
    this.logger.log(`[INIT] SeedService initialized`);
  }

  async seed() {
    this.logger.log(`[SEED] Starting seed operation`);

    // Use transaction to ensure atomicity
    return await this.dataSource.transaction(async (manager) => {
      // 1. Seed Organization
      this.logger.log(`[SEED] Inserting Organization`);
      const organization = manager.create(Organization, {
        id: 'bd90673f-799c-4d36-9a76-30ac55e310f7',
        name: 'Techware SAAS admin',
        country: undefined,
        primary_email: 'admin@techwarelab.com',
      });
      const savedOrganization = await manager.save(Organization, organization);
      this.logger.log(`[SEED] Organization inserted with ID: ${savedOrganization.id}`);

      // 2. Seed Role
      this.logger.log(`[SEED] Inserting Role`);
      const role = manager.create(Role, {
        id: 'c887f0b0-7b68-41d9-ba5a-770abb6cbde3',
        name: 'Super Admin',
        description: 'Has all the permissions',
        organization_id: 'bd90673f-799c-4d36-9a76-30ac55e310f7',
      });
      const savedRole = await manager.save(Role, role);
      this.logger.log(`[SEED] Role inserted with ID: ${savedRole.id}`);

      // 3. Seed User
      this.logger.log(`[SEED] Inserting User`);
      const user = manager.create(User, {
        id: '9c71b112-b77f-4c95-bb31-261b247fa787',
        organization_id: 'bd90673f-799c-4d36-9a76-30ac55e310f7',
        role_id: 'c887f0b0-7b68-41d9-ba5a-770abb6cbde3',
        email: 'admin@techwarelab.com',
        password_hash: '$2b$10$800GHFiCc9CYZhL5T5DQgercL4KqT.t9FM9rWgGBThrXoqmQMCv0G',
        first_name: 'Admin',
        last_name: 'Techware',
      });
      const savedUser = await manager.save(User, user);
      this.logger.log(`[SEED] User inserted with ID: ${savedUser.id}`);

      this.logger.log(`[SEED] Seed operation completed successfully`);

      return {
        success: true,
        message: 'Seed data inserted successfully',
        data: {
          organization: { id: savedOrganization.id, name: savedOrganization.name },
          role: { id: savedRole.id, name: savedRole.name },
          user: { id: savedUser.id, email: savedUser.email },
        },
      };
    });
  }
}
