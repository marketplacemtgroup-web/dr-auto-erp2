import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  getVapidPublicKey(): string | null {
    return this.config.get<string>('VAPID_PUBLIC_KEY') ?? null;
  }

  async saveSubscription(
    organizationId: string,
    vehicleId: string,
    data: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string },
  ) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: {
        organizationId,
        vehicleId,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent: data.userAgent ?? null,
      },
      update: {
        vehicleId,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent: data.userAgent ?? null,
      },
    });
  }

  async sendToVehicle(
    vehicleId: string,
    payload: { title: string; body: string; url?: string },
  ) {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT') ?? 'mailto:suporte@scalibur.local';

    if (!publicKey || !privateKey) {
      return;
    }

    let webpush: typeof import('web-push');
    try {
      webpush = await import('web-push');
    } catch {
      this.logger.warn('web-push não instalado; notificações push desativadas');
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const subs = await this.prisma.pushSubscription.findMany({ where: { vehicleId } });
    const body = JSON.stringify(payload);

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
      } catch (err) {
        this.logger.warn(`Push falhou (${sub.id}): ${String(err)}`);
        await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => null);
      }
    }
  }
}
