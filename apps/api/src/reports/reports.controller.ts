import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('full')
  @RequirePermissions('dashboard.view')
  full(@CurrentUser() user: { organizationId: string }, @Query() query: ReportsQueryDto) {
    return this.reportsService.full(
      user.organizationId,
      query.from,
      query.to,
      query.compare ?? false,
    );
  }

  @Get('summary')
  @RequirePermissions('dashboard.view')
  summary(@CurrentUser() user: { organizationId: string }, @Query() query: ReportsQueryDto) {
    return this.reportsService.summary(user.organizationId, query.from, query.to);
  }

  @Get('bi')
  @RequirePermissions('dashboard.view')
  bi(@CurrentUser() user: { organizationId: string }, @Query() query: ReportsQueryDto) {
    return this.reportsService.bi(user.organizationId, query.from, query.to);
  }

  @Get('export/:type')
  @RequirePermissions('dashboard.view')
  export(
    @CurrentUser() user: { organizationId: string },
    @Param('type') type: string,
    @Query() query: ReportsQueryDto,
  ) {
    return this.reportsService.exportData(user.organizationId, type, query.from, query.to);
  }
}
