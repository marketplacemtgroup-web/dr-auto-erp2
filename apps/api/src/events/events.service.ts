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
      portalNotificationType?: string;
      serviceOrderId?: string;
      quoteId?: string;
      /** Quando false, grava só no ERP (sem push/inbox do cliente). Padrão: true se houver pushTitle. */
      customerPush?: boolean;
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

    const vehicleId = event.vehicleId;
    const sendCustomer =
      event.customerPush !== false && Boolean(vehicleId && event.pushTitle);
    if (sendCustomer && vehicleId && event.pushTitle) {
      await this.push.sendToVehicle(
        vehicleId,
        {
          title: event.pushTitle,
          body: event.pushBody ?? event.message,
          url: event.pushUrl ?? '/',
        },
        event.portalNotificationType
          ? {
              type: event.portalNotificationType,
              serviceOrderId: event.serviceOrderId,
              quoteId: event.quoteId,
            }
          : undefined,
      );
    }
  }

  /** Push + inbox do portal (sem notificação no ERP). */
  async emitCustomer(
    vehicleId: string,
    event: {
      pushTitle: string;
      pushBody: string;
      pushUrl?: string;
      portalNotificationType: string;
      serviceOrderId?: string;
      quoteId?: string;
    },
  ) {
    await this.push.sendToVehicle(
      vehicleId,
      {
        title: event.pushTitle,
        body: event.pushBody,
        url: event.pushUrl ?? '/',
      },
      {
        type: event.portalNotificationType,
        serviceOrderId: event.serviceOrderId,
        quoteId: event.quoteId,
      },
    );
  }
}
