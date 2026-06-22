import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { MaintenanceRemindersModule } from '../maintenance-reminders/maintenance-reminders.module';
import { CronController } from './cron.controller';

@Module({
  imports: [AttachmentsModule, MaintenanceRemindersModule],
  controllers: [CronController],
})
export class CronModule {}
