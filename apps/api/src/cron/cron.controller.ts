import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { AttachmentsPurgeService } from '../attachments/attachments-purge.service';

@Controller('cron')
export class CronController {
  constructor(private readonly attachmentsPurge: AttachmentsPurgeService) {}

  @Get('purge-attachments')
  purgeAttachments(@Headers('authorization') authorization?: string) {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) {
      throw new UnauthorizedException('CRON_SECRET não configurado');
    }
    const expected = `Bearer ${secret}`;
    if (authorization !== expected) {
      throw new UnauthorizedException('Não autorizado');
    }
    return this.attachmentsPurge.purgeDueAttachments();
  }
}
