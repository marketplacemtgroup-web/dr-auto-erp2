import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @RequirePermissions('dashboard.view')
  summary(@CurrentUser() user: { organizationId: string }) {
    return this.reportsService.summary(user.organizationId);
  }

  @Get('bi')
  @RequirePermissions('dashboard.view')
  bi(@CurrentUser() user: { organizationId: string }) {
    return this.reportsService.bi(user.organizationId);
  }

  @Get('export/:type')
  @RequirePermissions('dashboard.view')
  export(
    @CurrentUser() user: { organizationId: string },
    @Param('type') type: string,
  ) {
    return this.reportsService.exportData(user.organizationId, type);
  }
}
