import { Controller, Get, Post, UseGuards } from '@nestjs/common';
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

  /** Reaplica permissões dos perfis padrão (mecânico, recepção, gerente, etc.). */
  @Post('sync-defaults')
  @RequirePermissions('users.manage', 'admin.access')
  async syncDefaults(@CurrentUser() user: { organizationId: string }) {
    await this.rolesService.syncSystemPermissions();
    await this.rolesService.syncDefaultRoles(user.organizationId);
    return { ok: true };
  }
}
