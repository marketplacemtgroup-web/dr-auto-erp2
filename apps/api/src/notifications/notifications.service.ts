import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  listUnread(organizationId: string, limit = 20) {
    return this.prisma.officeNotification.findMany({
      where: { organizationId, readAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  markRead(organizationId: string, id: string) {
    return this.prisma.officeNotification.updateMany({
      where: { id, organizationId },
      data: { readAt: new Date() },
    });
  }

  markAllRead(organizationId: string) {
    return this.prisma.officeNotification.updateMany({
      where: { organizationId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
