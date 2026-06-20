import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { CronController } from './cron.controller';

@Module({
  imports: [AttachmentsModule],
  controllers: [CronController],
})
export class CronModule {}
