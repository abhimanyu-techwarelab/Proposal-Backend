import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Role } from "./entities/role.entity";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>
  ) {
    this.logger.log(`[INIT] RolesService initialized`);
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    this.logger.log(`[CREATE] Creating role: ${dto.name}`);

    // Check if role name already exists within the organization (case insensitive)
    const existingRole = await this.roleRepository
      .createQueryBuilder("role")
      .where("LOWER(role.name) = LOWER(:name)", { name: dto.name })
      .andWhere("role.organization_id = :organizationId", { organizationId: dto.organization_id })
      .andWhere("role.is_deleted = :isDeleted", { isDeleted: false })
      .getOne();

    if (existingRole) {
      this.logger.warn(`[CREATE] Role with name "${dto.name}" already exists in organization ${dto.organization_id}`);
      throw new ConflictException(
        `Role with name "${dto.name}" already exists in this organization`
      );
    }

    const role = this.roleRepository.create({
      name: dto.name,
      organization_id: dto.organization_id,
      description: dto.description,
    });

    const savedRole = await this.roleRepository.save(role);

    this.logger.log(`[CREATE] Role created with ID: ${savedRole.id}`);

    return savedRole;
  }

  async findAll(
    organizationId: string,
    page?: number,
    limit?: number
  ): Promise<
    | Role[]
    | {
        data: Role[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }
  > {
    this.logger.log(
      `[FIND_ALL] Fetching roles for organization: ${organizationId} - page: ${page}, limit: ${limit}`
    );

    if (page !== undefined && limit !== undefined) {
      const skip = (page - 1) * limit;

      const [roles, total] = await this.roleRepository.findAndCount({
        where: { organization_id: organizationId, is_deleted: false },
        skip,
        take: limit,
      });

      this.logger.log(
        `[FIND_ALL] Found ${roles.length} of ${total} roles (page ${page})`
      );

      return {
        data: roles,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const roles = await this.roleRepository.find({
      where: { organization_id: organizationId, is_deleted: false },
    });

    this.logger.log(`[FIND_ALL] Found ${roles.length} roles`);

    return roles;
  }

  async findOne(id: string): Promise<Role> {
    this.logger.log(`[FIND_ONE] Fetching role: ${id}`);

    const role = await this.roleRepository.findOne({
      where: { id, is_deleted: false },
    });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    this.logger.log(`[FIND_ONE] Found role: ${id}`);

    return role;
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    this.logger.log(`[UPDATE] Updating role: ${id}`);

    const role = await this.roleRepository.findOne({
      where: { id, is_deleted: false },
    });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    // Check if new name already exists (case insensitive)
    if (dto.name) {
      const existingRole = await this.roleRepository
        .createQueryBuilder("role")
        .where("LOWER(role.name) = LOWER(:name)", { name: dto.name })
        .andWhere("role.is_deleted = :isDeleted", { isDeleted: false })
        .andWhere("role.id != :id", { id })
        .getOne();

      if (existingRole) {
        this.logger.warn(
          `[UPDATE] Role with name "${dto.name}" already exists`
        );
        throw new ConflictException(
          `Role with name "${dto.name}" already exists`
        );
      }
    }

    Object.assign(role, dto);
    const updatedRole = await this.roleRepository.save(role);

    this.logger.log(`[UPDATE] Role updated: ${id}`);

    return updatedRole;
  }

  async softDelete(id: string): Promise<Role> {
    this.logger.log(`[SOFT_DELETE] Soft deleting role: ${id}`);

    const role = await this.roleRepository.findOne({
      where: { id, is_deleted: false },
    });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    role.is_deleted = true;
    const deletedRole = await this.roleRepository.save(role);

    this.logger.log(`[SOFT_DELETE] Role soft deleted: ${id}`);

    return deletedRole;
  }
}
