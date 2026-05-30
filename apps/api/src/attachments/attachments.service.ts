import { Injectable, NotFoundException } from '@nestjs/common';
import { AttachmentEntityType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

const UPLOAD_ROOT = join(process.cwd(), 'uploads');

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const dir = join(UPLOAD_ROOT, organizationId, serviceOrderId);
    await mkdir(dir, { recursive: true });

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const stored = `${randomUUID()}-${safeName}`;
    const storagePath = join(dir, stored);
    await writeFile(storagePath, file.buffer);

    return this.prisma.attachment.create({
      data: {
        organizationId,
        entityType: AttachmentEntityType.SERVICE_ORDER,
        entityId: serviceOrderId,
        serviceOrderId,
        category: opts.category ?? 'general',
        fileName: file.originalname,
        mimeType: file.mimetype,
        storagePath: join(organizationId, serviceOrderId, stored),
        visibleToCustomer: opts.visibleToCustomer ?? false,
        showOnQuote: opts.showOnQuote ?? false,
        uploadedByUserId: opts.userId ?? null,
      },
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

    const dir = join(UPLOAD_ROOT, organizationId, 'vehicles', vehicleId);
    await mkdir(dir, { recursive: true });

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const stored = `${randomUUID()}-${safeName}`;
    await writeFile(join(dir, stored), file.buffer);

    return this.prisma.attachment.create({
      data: {
        organizationId,
        entityType: AttachmentEntityType.VEHICLE,
        entityId: vehicleId,
        category: opts.category ?? 'general',
        fileName: file.originalname,
        mimeType: file.mimetype,
        storagePath: join(organizationId, 'vehicles', vehicleId, stored),
        visibleToCustomer: false,
        showOnQuote: false,
        uploadedByUserId: opts.userId ?? null,
      },
    });
  }

  listForServiceOrder(organizationId: string, serviceOrderId: string) {
    return this.prisma.attachment.findMany({
      where: { organizationId, serviceOrderId },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
  }

  async remove(organizationId: string, id: string) {
    const row = await this.prisma.attachment.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Anexo não encontrado');
    await this.prisma.attachment.delete({ where: { id } });
    return { ok: true };
  }
}
