import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AttachmentEntityType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { posix } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
    private readonly events: EventsService,
  ) {}

  attachmentFilePath(id: string): string {
    return `/api/attachments/${id}/file`;
  }

  async enrichForClient<T extends { id: string; entityType: AttachmentEntityType; storagePath: string }>(
    row: T,
  ) {
    const bucket = this.storage.bucketForEntity(row.entityType);
    let url = '';
    try {
      if (this.storage.isCloudStorage()) {
        url = await this.storage.createSignedUrl(bucket, row.storagePath);
      } else {
        url = `/api/uploads/${this.storage.normalizeStoragePath(row.storagePath)}`;
      }
    } catch {
      /* arquivo ausente no storage (ex.: upload local antes do Supabase) */
    }
    return { ...row, url };
  }

  async enrichMany<T extends { id: string; entityType: AttachmentEntityType; storagePath: string }>(
    rows: T[],
  ) {
    return Promise.all(rows.map((r) => this.enrichForClient(r)));
  }

  private buildServiceOrderStoragePath(organizationId: string, serviceOrderId: string, fileName: string) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const stored = `${randomUUID()}-${safeName}`;
    return {
      storagePath: posix.join(organizationId, serviceOrderId, stored),
      bucket: this.storage.bucketForEntity(AttachmentEntityType.SERVICE_ORDER),
    };
  }

  private async findServiceOrder(organizationId: string, serviceOrderId: string) {
    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, organizationId, deletedAt: null },
    });
    if (!so) {
      this.logger.warn(
        `OS não encontrada: id=${serviceOrderId} org=${organizationId}`,
      );
      throw new NotFoundException(
        'Ordem de serviço não encontrada para sua oficina. Abra a OS pelo ERP (não pelo id do Supabase) ou reenvie após novo login.',
      );
    }
    return so;
  }

  async prepareServiceOrderUpload(
    organizationId: string,
    serviceOrderId: string,
    dto: {
      fileName: string;
      mimeType: string;
      category?: string;
      visibleToCustomer?: boolean;
      showOnQuote?: boolean;
    },
  ) {
    const so = await this.findServiceOrder(organizationId, serviceOrderId);

    const { storagePath, bucket } = this.buildServiceOrderStoragePath(
      organizationId,
      serviceOrderId,
      dto.fileName,
    );
    const signed = await this.storage.createSignedUploadUrl(bucket, storagePath);

    return {
      uploadUrl: signed.signedUrl,
      storagePath,
      bucket,
      token: signed.token,
      method: 'PUT' as const,
      headers: { 'Content-Type': dto.mimeType },
    };
  }

  async confirmServiceOrderUpload(
    organizationId: string,
    serviceOrderId: string,
    userId: string | undefined,
    dto: {
      storagePath: string;
      fileName: string;
      mimeType: string;
      category?: string;
      visibleToCustomer?: boolean;
      showOnQuote?: boolean;
    },
  ) {
    await this.findServiceOrder(organizationId, serviceOrderId);

    const storagePath = this.storage.normalizeStoragePath(dto.storagePath);
    const expectedPrefix = `${organizationId}/${serviceOrderId}/`;
    if (!storagePath.startsWith(expectedPrefix)) {
      throw new NotFoundException('Caminho de upload inválido');
    }

    const row = await this.prisma.attachment.create({
      data: {
        organizationId,
        entityType: AttachmentEntityType.SERVICE_ORDER,
        entityId: serviceOrderId,
        serviceOrderId,
        category: dto.category ?? 'general',
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        storagePath,
        visibleToCustomer: dto.visibleToCustomer ?? false,
        showOnQuote: dto.showOnQuote ?? false,
        uploadedByUserId: userId ?? null,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    if (row.visibleToCustomer) {
      await this.notifyCustomerAttachment(organizationId, serviceOrderId);
    }

    return this.enrichForClient(row);
  }

  async uploadForServiceOrder(
    organizationId: string,
    serviceOrderId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    opts: {
      category?: string;
      visibleToCustomer?: boolean;
      showOnQuote?: boolean;
      userId?: string;
    },
  ) {
    await this.findServiceOrder(organizationId, serviceOrderId);

    const { storagePath, bucket } = this.buildServiceOrderStoragePath(
      organizationId,
      serviceOrderId,
      file.originalname,
    );

    await this.storage.upload(bucket, storagePath, file.buffer, file.mimetype);

    const row = await this.prisma.attachment.create({
      data: {
        organizationId,
        entityType: AttachmentEntityType.SERVICE_ORDER,
        entityId: serviceOrderId,
        serviceOrderId,
        category: opts.category ?? 'general',
        fileName: file.originalname,
        mimeType: file.mimetype,
        storagePath,
        visibleToCustomer: opts.visibleToCustomer ?? false,
        showOnQuote: opts.showOnQuote ?? false,
        uploadedByUserId: opts.userId ?? null,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    if (row.visibleToCustomer) {
      await this.notifyCustomerAttachment(organizationId, serviceOrderId);
    }

    return this.enrichForClient(row);
  }

  private async notifyCustomerAttachment(organizationId: string, serviceOrderId: string) {
    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, organizationId, deletedAt: null },
      select: { id: true, number: true, vehicleId: true },
    });
    if (!so?.vehicleId) return;

    await this.events.emitCustomer(so.vehicleId, {
      pushTitle: 'Nova foto na sua OS',
      pushBody: `OS #${so.number} — veja o que a oficina enviou`,
      pushUrl: `/os/${so.id}`,
      portalNotificationType: 'anexo',
      serviceOrderId: so.id,
    });
  }

  async uploadForVehicle(
    organizationId: string,
    vehicleId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    opts: { category?: string; userId?: string },
  ) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, organizationId },
    });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const stored = `${randomUUID()}-${safeName}`;
    const storagePath = posix.join(organizationId, 'vehicles', vehicleId, stored);
    const bucket = this.storage.bucketForEntity(AttachmentEntityType.VEHICLE);

    await this.storage.upload(bucket, storagePath, file.buffer, file.mimetype);

    const row = await this.prisma.attachment.create({
      data: {
        organizationId,
        entityType: AttachmentEntityType.VEHICLE,
        entityId: vehicleId,
        category: opts.category ?? 'general',
        fileName: file.originalname,
        mimeType: file.mimetype,
        storagePath,
        visibleToCustomer: false,
        showOnQuote: false,
        uploadedByUserId: opts.userId ?? null,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    return this.enrichForClient(row);
  }

  async listForServiceOrder(organizationId: string, serviceOrderId: string) {
    const rows = await this.prisma.attachment.findMany({
      where: { organizationId, serviceOrderId },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
    return this.enrichMany(rows);
  }

  async resolveDownloadUrl(
    organizationId: string,
    id: string,
  ): Promise<{ url: string; mimeType: string; fileName: string }> {
    const row = await this.prisma.attachment.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Anexo não encontrado');

    const bucket = this.storage.bucketForEntity(row.entityType);
    const url = await this.storage.createSignedUrl(bucket, row.storagePath);
    return { url, mimeType: row.mimeType, fileName: row.fileName };
  }

  async resolvePortalUrl(attachment: {
    entityType: AttachmentEntityType;
    storagePath: string;
  }): Promise<string> {
    const bucket = this.storage.bucketForEntity(attachment.entityType);
    return this.storage.createSignedUrl(bucket, attachment.storagePath);
  }

  async remove(organizationId: string, id: string) {
    const row = await this.prisma.attachment.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Anexo não encontrado');

    const bucket = this.storage.bucketForEntity(row.entityType);
    try {
      await this.storage.remove(bucket, row.storagePath);
    } catch (err) {
      this.logger.warn(
        `Arquivo ${row.storagePath} não removido do storage: ${err instanceof Error ? err.message : err}`,
      );
    }
    await this.prisma.attachment.delete({ where: { id } });
    return { ok: true };
  }
}
