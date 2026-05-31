import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceCatalogDto } from './dto/create-service-catalog.dto';
import { UpdateServiceCatalogDto } from './dto/update-service-catalog.dto';

@Injectable()
export class ServiceCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  create(organizationId: string, dto: CreateServiceCatalogDto) {
    return this.prisma.serviceCatalog.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        category: dto.category ?? null,
        estimatedMinutes: dto.estimatedMinutes ?? null,
        defaultPrice: dto.defaultPrice ?? 0,
        warrantyDays: dto.warrantyDays ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  list(organizationId: string, search?: string, activeOnly?: boolean) {
    return this.prisma.serviceCatalog.findMany({
      where: {
        organizationId,
        ...(activeOnly !== false ? { isActive: true } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(organizationId: string, id: string) {
    const row = await this.prisma.serviceCatalog.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Serviço não encontrado');
    return row;
  }

  async update(organizationId: string, id: string, dto: UpdateServiceCatalogDto) {
    await this.findOne(organizationId, id);
    return this.prisma.serviceCatalog.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.category !== undefined ? { category: dto.category || null } : {}),
        ...(dto.estimatedMinutes !== undefined
          ? { estimatedMinutes: dto.estimatedMinutes ?? null }
          : {}),
        ...(dto.defaultPrice !== undefined ? { defaultPrice: dto.defaultPrice } : {}),
        ...(dto.warrantyDays !== undefined ? { warrantyDays: dto.warrantyDays ?? null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.serviceCatalog.update({
      where: { id },
      data: { isActive: false },
    });
    return { ok: true };
  }
}
