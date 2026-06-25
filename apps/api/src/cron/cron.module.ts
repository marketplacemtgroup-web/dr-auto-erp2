import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { MaintenanceRemindersModule } from '../maintenance-reminders/maintenance-reminders.module';
import { CronController } from './cron.controller';

@Module({
  imports: [AttachmentsModule, MaintenanceRemindersModule, DashboardModule],
  controllers: [CronController],
})
export class CronModule {}
