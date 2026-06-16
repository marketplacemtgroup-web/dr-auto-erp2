import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { StockMovementService } from './stock-movement.service';
import { notDeleted } from '../common/soft-delete';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockMovement: StockMovementService,
  ) {}

  create(organizationId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        sku: dto.sku ?? null,
        category: dto.category ?? null,
        brand: dto.brand ?? null,
        ncm: dto.ncm ?? null,
        location: dto.location ?? null,
        stock: dto.stock ?? 0,
        minStock: dto.minStock ?? 0,
        costPrice: dto.costPrice ?? 0,
        salePrice: dto.salePrice ?? 0,
      },
    });
  }

  async list(organizationId: string, search?: string, lowStock?: boolean) {
    const rows = await this.prisma.product.findMany({
      where: {
        organizationId,
        ...notDeleted,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { location: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
                { brand: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
    if (lowStock) {
      return rows.filter(
        (p) => this.stockMovement.availableStock(p.stock, p.reservedStock) <= p.minStock,
      );
    }
    return rows;
  }

  async findOne(organizationId: string, id: string) {
    const row = await this.prisma.product.findFirst({
      where: { id, organizationId, ...notDeleted },
    });
    if (!row) throw new NotFoundException('Produto não encontrado');
    return row;
  }

  async update(organizationId: string, id: string, dto: UpdateProductDto) {
    await this.findOne(organizationId, id);
    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.sku !== undefined ? { sku: dto.sku || null } : {}),
        ...(dto.category !== undefined ? { category: dto.category || null } : {}),
        ...(dto.brand !== undefined ? { brand: dto.brand || null } : {}),
        ...(dto.ncm !== undefined ? { ncm: dto.ncm || null } : {}),
        ...(dto.location !== undefined ? { location: dto.location || null } : {}),
        ...(dto.minStock !== undefined ? { minStock: dto.minStock } : {}),
        ...(dto.costPrice !== undefined ? { costPrice: dto.costPrice } : {}),
        ...(dto.salePrice !== undefined ? { salePrice: dto.salePrice } : {}),
      },
    });
  }

  async adjustStock(organizationId: string, id: string, dto: AdjustStockDto) {
    const product = await this.findOne(organizationId, id);
    const next = product.stock + dto.delta;
    if (next < 0) {
      throw new BadRequestException('Estoque não pode ficar negativo');
    }
    const updated = await this.prisma.product.update({
      where: { id },
      data: { stock: next },
    });
    await this.stockMovement.record(
      organizationId,
      id,
      'ADJUST',
      Math.abs(dto.delta),
      next,
      { reason: dto.reason ?? `Ajuste manual (${dto.delta > 0 ? '+' : ''}${dto.delta})` },
    );
    return updated;
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  listMovements(organizationId: string, productId?: string) {
    return this.stockMovement.list(organizationId, productId);
  }
}
