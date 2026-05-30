import { Injectable } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Observable, Subject } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

export type OfficeEventPayload = {
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

@Injectable()
export class EventsService {
  private readonly channels = new Map<string, Subject<MessageEvent>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  subscribe(organizationId: string): Observable<MessageEvent> {
    if (!this.channels.has(organizationId)) {
      this.channels.set(organizationId, new Subject<MessageEvent>());
    }
    return this.channels.get(organizationId)!.asObservable();
  }

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
    const row = await this.prisma.officeNotification.create({
      data: {
        organizationId,
        type: event.type,
        title: event.title,
        message: event.message,
        metadata: (event.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    const payload: OfficeEventPayload = {
      type: event.type,
      title: event.title,
      message: event.message,
      metadata: {
        ...(event.metadata ?? {}),
        notificationId: row.id,
      },
      createdAt: row.createdAt.toISOString(),
    };

    this.channels.get(organizationId)?.next({ data: payload });

    if (event.vehicleId && event.pushTitle) {
      await this.push.sendToVehicle(event.vehicleId, {
        title: event.pushTitle,
        body: event.pushBody ?? event.message,
        url: event.pushUrl ?? '/',
      });
    }
  }
}
