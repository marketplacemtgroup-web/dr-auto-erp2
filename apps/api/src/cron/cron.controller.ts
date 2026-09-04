import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { AttachmentsPurgeService } from '../attachments/attachments-purge.service';
import { DashboardCacheService } from '../dashboard/dashboard-cache.service';
import { FinancialService } from '../financial/financial.service';
import { MaintenanceRemindersService } from '../maintenance-reminders/maintenance-reminders.service';

@Controller('cron')
export class CronController {
  constructor(
    private readonly attachmentsPurge: AttachmentsPurgeService,
    private readonly maintenanceReminders: MaintenanceRemindersService,
    private readonly dashboardCache: DashboardCacheService,
    private readonly financial: FinancialService,
  ) {}

  private assertCronAuth(authorization?: string) {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) {
      throw new UnauthorizedException('CRON_SECRET não configurado');
    }
    const expected = `Bearer ${secret}`;
    if (authorization !== expected) {
      throw new UnauthorizedException('Não autorizado');
    }
  }

  @Get('purge-attachments')
  purgeAttachments(@Headers('authorization') authorization?: string) {
    this.assertCronAuth(authorization);
    return this.attachmentsPurge.purgeDueAttachments();
  }

  @Get('maintenance-reminders')
  processMaintenanceReminders(@Headers('authorization') authorization?: string) {
    this.assertCronAuth(authorization);
    return this.maintenanceReminders.processDueNotifications();
  }

  @Get('dashboard-cache-refresh')
  refreshDashboardCache(@Headers('authorization') authorization?: string) {
    this.assertCronAuth(authorization);
    return this.dashboardCache.refreshStaleBatch();
  }

  /** Marca lançamentos com vencimento passado como OVERDUE (todas as orgs). */
  @Get('sync-overdue-financial')
  syncOverdueFinancial(@Headers('authorization') authorization?: string) {
    this.assertCronAuth(authorization);
    return this.financial.syncOverdueStatuses(undefined, { force: true });
  }
}
