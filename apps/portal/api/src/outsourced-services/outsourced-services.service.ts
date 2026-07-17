import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOutsourcedServiceDto } from './dto/create-outsourced-service.dto';
import { UpdateOutsourcedServiceDto } from './dto/update-outsourced-service.dto';

@Injectable()
export class OutsourcedServicesService {
  constructor(private readonly prisma: PrismaService) {}

  create(organizationId: string, dto: CreateOutsourcedServiceDto) {
    return this.prisma.outsourcedService.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        provider: dto.provider?.trim() || null,
        category: dto.category?.trim() || null,
        costPrice: dto.costPrice ?? 0,
        salePrice: dto.salePrice ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  list(organizationId: string, search?: string, activeOnly?: boolean) {
    return this.prisma.outsourcedService.findMany({
      where: {
        organizationId,
        ...(activeOnly !== false ? { isActive: true } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { provider: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(organizationId: string, id: string) {
    const row = await this.prisma.outsourcedService.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Serviço terceirizado não encontrado');
    return row;
  }

  async update(organizationId: string, id: string, dto: UpdateOutsourcedServiceDto) {
    await this.findOne(organizationId, id);
    return this.prisma.outsourcedService.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.provider !== undefined ? { provider: dto.provider?.trim() || null } : {}),
        ...(dto.category !== undefined ? { category: dto.category?.trim() || null } : {}),
        ...(dto.costPrice !== undefined ? { costPrice: dto.costPrice } : {}),
        ...(dto.salePrice !== undefined ? { salePrice: dto.salePrice } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.outsourcedService.update({
      where: { id },
      data: { isActive: false },
    });
    return { ok: true };
  }
}
