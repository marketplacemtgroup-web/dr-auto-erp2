import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListQueryInput, paginatedResponse, parseListQuery } from '../common/pagination';
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

  private productSearchSql(search: string) {
    const term = `%${search}%`;
    return Prisma.sql`AND (
      name ILIKE ${term}
      OR sku ILIKE ${term}
      OR location ILIKE ${term}
      OR category ILIKE ${term}
      OR brand ILIKE ${term}
    )`;
  }

  async list(
    organizationId: string,
    search?: string,
    lowStock?: boolean,
    query: ListQueryInput = {},
  ) {
    const { page, limit, skip } = parseListQuery(query);
    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { sku: { contains: search, mode: 'insensitive' as const } },
            { location: { contains: search, mode: 'insensitive' as const } },
            { category: { contains: search, mode: 'insensitive' as const } },
            { brand: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    if (lowStock) {
      const searchSql = search ? this.productSearchSql(search) : Prisma.empty;
      const [countResult, idRows] = await Promise.all([
        this.prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int AS count FROM products
          WHERE organization_id = ${organizationId}
            AND deleted_at IS NULL
            AND (stock - reserved_stock) <= min_stock
            ${searchSql}
        `,
        this.prisma.$queryRaw<[{ id: string }]>`
          SELECT id FROM products
          WHERE organization_id = ${organizationId}
            AND deleted_at IS NULL
            AND (stock - reserved_stock) <= min_stock
            ${searchSql}
          ORDER BY name ASC
          LIMIT ${limit} OFFSET ${skip}
        `,
      ]);
      const ids = idRows.map((r) => r.id);
      const rows = ids.length
        ? await this.prisma.product.findMany({
            where: { id: { in: ids } },
            orderBy: { name: 'asc' },
          })
        : [];
      return paginatedResponse(rows, countResult[0]?.count ?? 0, page, limit);
    }

    const where: Prisma.ProductWhereInput = {
      organizationId,
      ...notDeleted,
      ...searchFilter,
    };
    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
    ]);
    return paginatedResponse(rows, total, page, limit);
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
