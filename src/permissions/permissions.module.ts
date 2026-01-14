import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Permission } from "./entities/permission.entity";
import { RolePermission } from "./entities/role-permission.entity";
import {
  PermissionsController,
  ProductPermissionsController,
} from "./permissions.controller";
import { PermissionsService } from "./permissions.service";
import { RolePermissionsController } from "./role-permissions.controller";
import { RolePermissionsService } from "./role-permissions.service";

@Module({
  imports: [TypeOrmModule.forFeature([Permission, RolePermission])],
  controllers: [
    PermissionsController,
    ProductPermissionsController,
    RolePermissionsController,
  ],
  providers: [PermissionsService, RolePermissionsService],
  exports: [TypeOrmModule, PermissionsService, RolePermissionsService],
})
export class PermissionsModule {}
