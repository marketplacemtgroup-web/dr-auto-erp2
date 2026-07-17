import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsPurgeService } from './attachments-purge.service';
import { AttachmentsService } from './attachments.service';

@Module({
  controllers: [AttachmentsController],
  providers: [AttachmentsService, AttachmentsPurgeService],
  exports: [AttachmentsService, AttachmentsPurgeService],
})
export class AttachmentsModule {}
