import { Module } from '@nestjs/common';
import { MaintenanceRemindersModule } from '../maintenance-reminders/maintenance-reminders.module';
import { ReportsModule } from '../reports/reports.module';
import { DashboardCacheService } from './dashboard-cache.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [ReportsModule, MaintenanceRemindersModule],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardCacheService],
  exports: [DashboardCacheService, DashboardService],
})
export class DashboardModule {}
