import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../auth/permissions.guard';
import { userCanViewFinancial, userCanViewMoney } from '../team/default-roles';
import { DashboardService } from './dashboard.service';

type AuthUser = {
  organizationId: string;
  permissions?: string[];
};

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @RequirePermissions('dashboard.view')
  getSummary(@CurrentUser() user: AuthUser) {
    const includeFinancial = userCanViewFinancial(user.permissions ?? []);
    return this.dashboardService.getSummary(user.organizationId, includeFinancial);
  }

  @Get('alerts')
  @RequirePermissions('dashboard.view')
  getAlerts(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getAlerts(user.organizationId);
  }

  @Get('charts')
  @RequirePermissions('dashboard.view')
  async getCharts(@CurrentUser() user: AuthUser) {
    const charts = await this.dashboardService.getCharts(
      user.organizationId,
      userCanViewFinancial(user.permissions ?? []),
    );
    if (!userCanViewMoney(user.permissions ?? [])) {
      return {
        ...charts,
        pendingQuotes: charts.pendingQuotes.map((q) => ({ ...q, amount: null })),
      };
    }
    return charts;
  }

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
  async getServiceOrders(@CurrentUser() user: AuthUser) {
    const charts = await this.dashboardService.getCharts(user.organizationId, false);
    return charts.serviceOrdersInProgress;
  }

  @Get('pending-quotes')
  @RequirePermissions('dashboard.view')
  async getQuotes(@CurrentUser() user: AuthUser) {
    const charts = await this.dashboardService.getCharts(user.organizationId, false);
    const quotes = charts.pendingQuotes;
    if (userCanViewMoney(user.permissions ?? [])) return quotes;
    return quotes.map((q) => ({ ...q, amount: null })) as unknown as typeof quotes;
  }

  @Get('revenue-series')
  @RequirePermissions('dashboard.view_financial')
  async getRevenueSeries(@CurrentUser() user: AuthUser) {
    const charts = await this.dashboardService.getCharts(user.organizationId, true);
    return charts.revenueSeries;
  }
}
