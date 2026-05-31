import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('current')
  getCurrent(@CurrentUser() user: { organizationId: string }) {
    return this.organizationsService.getOrganization(user.organizationId);
  }

  @Get('branches')
  getBranches(@CurrentUser() user: { organizationId: string }) {
    return this.organizationsService.listBranches(user.organizationId);
  }

  @Patch('current')
  @RequirePermissions('settings.manage')
  updateCurrent(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Body() dto: UpdateOrganizationSettingsDto,
  ) {
    return this.organizationsService.updateSettings(user.organizationId, user.userId, dto);
  }

  @Get('admin/stats')
  @RequirePermissions('admin.access')
  getAdminStats(@CurrentUser() user: { organizationId: string }) {
    return this.organizationsService.getAdminStats(user.organizationId);
  }
}
