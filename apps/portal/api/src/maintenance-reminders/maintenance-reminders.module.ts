import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { MaintenanceRemindersController } from './maintenance-reminders.controller';
import { MaintenanceRemindersService } from './maintenance-reminders.service';

@Module({
  imports: [EventsModule],
  controllers: [MaintenanceRemindersController],
  providers: [MaintenanceRemindersService],
  exports: [MaintenanceRemindersService],
})
export class MaintenanceRemindersModule {}
