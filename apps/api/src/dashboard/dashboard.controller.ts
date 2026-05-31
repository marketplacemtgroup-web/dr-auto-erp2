import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../auth/permissions.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @RequirePermissions('dashboard.view')
  getKpis(@CurrentUser() user: { organizationId: string }) {
    return this.dashboardService.getKpis(user.organizationId);
  }

  @Get('service-orders-in-progress')
  @RequirePermissions('dashboard.view')
  getServiceOrders(@CurrentUser() user: { organizationId: string }) {
    return this.dashboardService.getServiceOrdersInProgress(user.organizationId);
  }

  @Get('pending-quotes')
  @RequirePermissions('dashboard.view')
  getQuotes(@CurrentUser() user: { organizationId: string }) {
    return this.dashboardService.getPendingQuotes(user.organizationId);
  }

  @Get('revenue-series')
  @RequirePermissions('dashboard.view')
  getRevenueSeries(@CurrentUser() user: { organizationId: string }) {
    return this.dashboardService.getRevenueSeries(user.organizationId);
  }
}
