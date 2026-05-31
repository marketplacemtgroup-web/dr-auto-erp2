import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

export type OfficeEventPayload = {
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

/** Notificações persistidas no banco; ERP usa polling (compatível com Vercel serverless). */
@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  async emitOffice(
    organizationId: string,
    event: {
      type: string;
      title: string;
      message: string;
      metadata?: Record<string, unknown>;
      vehicleId?: string;
      pushTitle?: string;
      pushBody?: string;
      pushUrl?: string;
    },
  ) {
    await this.prisma.officeNotification.create({
      data: {
        organizationId,
        type: event.type,
        title: event.title,
        message: event.message,
        metadata: (event.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    if (event.vehicleId && event.pushTitle) {
      await this.push.sendToVehicle(event.vehicleId, {
        title: event.pushTitle,
        body: event.pushBody ?? event.message,
        url: event.pushUrl ?? '/',
      });
    }
  }
}
