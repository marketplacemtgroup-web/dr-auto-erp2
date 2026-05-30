import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { AuditService } from './audit.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('admin.access', 'settings.manage')
  list(
    @CurrentUser() user: { organizationId: string },
    @Query('search') search?: string,
    @Query('resource') resource?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.list(user.organizationId, {
      search,
      resource,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
