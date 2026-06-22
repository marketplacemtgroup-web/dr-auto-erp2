import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServiceAccount } from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  isFirebaseConfigured(): boolean {
    return this.resolveFirebaseServiceAccountJson() !== null;
  }

  private resolveFirebaseServiceAccountJson(): string | null {
    const raw = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT')?.trim();
    if (raw) {
      const unquoted = raw.replace(/^"+|"+$/g, '');
      try {
        JSON.parse(unquoted);
        return unquoted;
      } catch {
        this.logger.warn('FIREBASE_SERVICE_ACCOUNT inválido (JSON malformado)');
      }
    }

    const b64 = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_BASE64')?.trim();
    if (b64) {
      try {
        const decoded = Buffer.from(b64, 'base64').toString('utf8');
        JSON.parse(decoded);
        return decoded;
      } catch {
        this.logger.warn('FIREBASE_SERVICE_ACCOUNT_BASE64 inválido');
      }
    }

    return null;
  }

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
    inbox?: { type: string; serviceOrderId?: string; quoteId?: string },
  ) {
    if (inbox) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: vehicleId },
        select: { organizationId: true, customerId: true },
      });
      if (vehicle) {
        await this.prisma.portalNotification.create({
          data: {
            organizationId: vehicle.organizationId,
            customerId: vehicle.customerId,
            vehicleId,
            serviceOrderId: inbox.serviceOrderId ?? null,
            quoteId: inbox.quoteId ?? null,
            type: inbox.type,
            title: payload.title,
            body: payload.body,
          },
        });
      }
    }

    await this.sendFcmToVehicle(vehicleId, payload, inbox?.serviceOrderId, inbox?.quoteId);

    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT') ?? 'mailto:oficinadobeto@gmail.com';

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

  async saveFcmToken(
    organizationId: string,
    vehicleId: string,
    token: string,
    platform = 'android',
  ) {
    return this.prisma.fcmToken.upsert({
      where: { token },
      create: { organizationId, vehicleId, token, platform },
      update: { vehicleId, platform, updatedAt: new Date() },
    });
  }

  private async sendFcmToVehicle(
    vehicleId: string,
    payload: { title: string; body: string; url?: string },
    serviceOrderId?: string,
    quoteId?: string,
  ) {
    const serviceAccountJson = this.resolveFirebaseServiceAccountJson();
    if (!serviceAccountJson) {
      this.logger.warn(
        `FCM ignorado: FIREBASE_SERVICE_ACCOUNT não configurado (vehicleId=${vehicleId})`,
      );
      return;
    }

    const tokens = await this.prisma.fcmToken.findMany({ where: { vehicleId } });
    if (!tokens.length) {
      this.logger.warn(`FCM ignorado: nenhum token registrado (vehicleId=${vehicleId})`);
      return;
    }

    try {
      const admin = await import('firebase-admin');
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(serviceAccountJson) as ServiceAccount),
        });
      }
      const data: Record<string, string> = {};
      if (payload.url) data.url = payload.url;
      if (serviceOrderId) data.serviceOrderId = serviceOrderId;
      if (quoteId) data.quoteId = quoteId;
      if (payload.title) data.title = payload.title;
      if (payload.body) data.body = payload.body;

      for (const row of tokens) {
        await admin.messaging().send({
          token: row.token,
          notification: { title: payload.title, body: payload.body },
          data: Object.keys(data).length ? data : undefined,
          android: {
            priority: 'high',
            notification: {
              channelId: 'portal_alerts',
              sound: 'default',
              priority: 'high',
              defaultSound: true,
              defaultVibrateTimings: true,
            },
          },
        });
      }
    } catch (err) {
      this.logger.warn(`FCM falhou: ${String(err)}`);
    }
  }
}
