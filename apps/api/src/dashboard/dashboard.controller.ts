import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../auth/permissions.guard';
import { userCanViewMoney } from '../team/default-roles';
import { DashboardService } from './dashboard.service';

type AuthUser = {
  organizationId: string;
  permissions?: string[];
};

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @RequirePermissions('dashboard.view')
  getOperationalKpis(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getOperationalKpis(user.organizationId);
  }

  @Get('kpis/financial')
  @RequirePermissions('dashboard.view_financial')
  getFinancialKpis(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getFinancialKpis(user.organizationId);
  }

  @Get('service-orders-in-progress')
  @RequirePermissions('dashboard.view')
  getServiceOrders(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getServiceOrdersInProgress(user.organizationId);
  }

  @Get('pending-quotes')
  @RequirePermissions('dashboard.view')
  async getQuotes(@CurrentUser() user: AuthUser) {
    const quotes = await this.dashboardService.getPendingQuotes(user.organizationId);
    if (userCanViewMoney(user.permissions ?? [])) return quotes;
    return quotes.map((q) => ({ ...q, amount: null }));
  }

  @Get('revenue-series')
  @RequirePermissions('dashboard.view_financial')
  getRevenueSeries(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getRevenueSeries(user.organizationId);
  }
}
