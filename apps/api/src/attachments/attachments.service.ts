import { Injectable, NotFoundException } from '@nestjs/common';
import { AttachmentEntityType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { posix } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
  ) {}

  attachmentFilePath(id: string): string {
    return `/api/attachments/${id}/file`;
  }

  async enrichForClient<T extends { id: string; entityType: AttachmentEntityType; storagePath: string }>(
    row: T,
  ) {
    const bucket = this.storage.bucketForEntity(row.entityType);
    let url: string;
    if (this.storage.isCloudStorage()) {
      url = await this.storage.createSignedUrl(bucket, row.storagePath);
    } else {
      url = `/api/uploads/${this.storage.normalizeStoragePath(row.storagePath)}`;
    }
    return { ...row, url };
  }

  async enrichMany<T extends { id: string; entityType: AttachmentEntityType; storagePath: string }>(
    rows: T[],
  ) {
    return Promise.all(rows.map((r) => this.enrichForClient(r)));
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
    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, organizationId },
    });
    if (!so) throw new NotFoundException('Ordem de serviço não encontrada');

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const stored = `${randomUUID()}-${safeName}`;
    const storagePath = posix.join(organizationId, serviceOrderId, stored);
    const bucket = this.storage.bucketForEntity(AttachmentEntityType.SERVICE_ORDER);

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

    return this.enrichForClient(row);
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
    await this.storage.remove(bucket, row.storagePath);
    await this.prisma.attachment.delete({ where: { id } });
    return { ok: true };
  }
}
