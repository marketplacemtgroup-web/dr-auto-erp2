import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('users.manage')
  list(@CurrentUser() user: { organizationId: string }) {
    return this.rolesService.listRoles(user.organizationId);
  }

  @Get('permissions')
  @RequirePermissions('users.manage')
  permissions() {
    return this.rolesService.listPermissions();
  }
}
