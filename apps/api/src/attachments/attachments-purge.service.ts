import { Injectable, Logger } from '@nestjs/common';
import { AttachmentEntityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AttachmentsService } from './attachments.service';

@Injectable()
export class AttachmentsPurgeService {
  private readonly logger = new Logger(AttachmentsPurgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attachments: AttachmentsService,
  ) {}

  async purgeDueAttachments(batchSize = 20) {
    const now = new Date();
    const orders = await this.prisma.serviceOrder.findMany({
      where: {
        attachmentsPurgeAt: { lte: now },
        attachmentsPurgedAt: null,
        deletedAt: null,
      },
      take: batchSize,
      select: { id: true, organizationId: true, number: true },
    });

    let purgedOrders = 0;
    let purgedAttachments = 0;

    for (const order of orders) {
      const attachments = await this.prisma.attachment.findMany({
        where: {
          organizationId: order.organizationId,
          serviceOrderId: order.id,
          entityType: AttachmentEntityType.SERVICE_ORDER,
        },
        select: { id: true },
      });

      for (const attachment of attachments) {
        await this.attachments.remove(order.organizationId, attachment.id);
        purgedAttachments++;
      }

      await this.prisma.serviceOrder.update({
        where: { id: order.id },
        data: { attachmentsPurgedAt: now },
      });

      purgedOrders++;
      this.logger.log(
        `Anexos da OS #${order.number} (${order.id}) removidos: ${attachments.length}`,
      );
    }

    return { purgedOrders, purgedAttachments, batchSize };
  }
}
