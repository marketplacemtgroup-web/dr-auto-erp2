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
        internalCode: dto.internalCode ?? null,
        barcode: dto.barcode ?? null,
        category: dto.category ?? null,
        subcategory: dto.subcategory ?? null,
        brand: dto.brand ?? null,
        ncm: dto.ncm ?? null,
        cest: dto.cest ?? null,
        unit: dto.unit ?? 'UN',
        weight: dto.weight ?? null,
        location: dto.location ?? null,
        stock: dto.stock ?? 0,
        minStock: dto.minStock ?? 0,
        maxStock: dto.maxStock ?? null,
        markup: dto.markup ?? null,
        imageUrl: dto.imageUrl ?? null,
        notes: dto.notes ?? null,
        costPrice: dto.costPrice ?? 0,
        salePrice: dto.salePrice ?? 0,
        status: dto.status ?? 'ACTIVE',
        needsReview: dto.needsReview ?? false,
      },
    });
  }

  async generateQuickPartCode(organizationId: string): Promise<string> {
    const [items, products] = await Promise.all([
      this.prisma.serviceOrderItem.findMany({
        where: { organizationId, quickPartCode: { startsWith: 'PRV-' } },
        select: { quickPartCode: true },
      }),
      this.prisma.product.findMany({
        where: { organizationId, sku: { startsWith: 'PRV-' }, ...notDeleted },
        select: { sku: true },
      }),
    ]);
    let max = 0;
    for (const raw of [
      ...items.map((i) => i.quickPartCode),
      ...products.map((p) => p.sku),
    ]) {
      if (!raw) continue;
      const n = parseInt(raw.replace(/^PRV-/, ''), 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
    return `PRV-${String(max + 1).padStart(6, '0')}`;
  }

  async provisionQuickPartsOnApproval(
    organizationId: string,
    serviceOrderId: string,
    quoteId: string,
  ) {
    const items = await this.prisma.serviceOrderItem.findMany({
      where: { organizationId, serviceOrderId, isQuickPart: true },
    });

    for (const item of items) {
      const qty = Math.max(1, item.quantity);
      const code =
        item.quickPartCode ?? (await this.generateQuickPartCode(organizationId));

      let product =
        item.productId
          ? await this.prisma.product.findFirst({
              where: { id: item.productId, organizationId, ...notDeleted },
            })
          : null;

      if (!product) {
        product = await this.prisma.product.findFirst({
          where: {
            organizationId,
            ...notDeleted,
            OR: [
              { sku: code },
              { name: { equals: item.description, mode: 'insensitive' } },
            ],
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (!product) {
        product = await this.prisma.product.create({
          data: {
            organizationId,
            name: item.description,
            sku: code,
            brand: item.partBrand,
            category: 'Produto Provisório',
            status: 'PROVISIONAL',
            needsReview: true,
            stock: qty,
            minStock: 0,
            costPrice: item.unitCost ?? 0,
            averageCost: item.unitCost ?? 0,
            salePrice: item.unitPrice,
            sourceServiceOrderItemId: item.id,
            sourceQuoteId: quoteId,
          },
        });

        await this.stockMovement.record(
          organizationId,
          product.id,
          'IN',
          qty,
          qty,
          {
            serviceOrderId,
            reason: `Peça rápida aprovada — entrada de ${qty} un.`,
          },
        );
      } else if (product.status === 'PROVISIONAL' || product.needsReview) {
        const alreadyIn = await this.prisma.stockMovement.findFirst({
          where: {
            organizationId,
            productId: product.id,
            serviceOrderId,
            movementType: 'IN',
            reason: { contains: 'Peça rápida aprovada' },
          },
        });
        if (!alreadyIn) {
          const nextStock = product.stock + qty;
          product = await this.prisma.product.update({
            where: { id: product.id },
            data: {
              stock: nextStock,
              ...(item.unitCost != null && Number(item.unitCost) > 0
                ? {
                    costPrice: item.unitCost,
                    averageCost: item.unitCost,
                    lastPurchaseCost: item.unitCost,
                  }
                : {}),
            },
          });
          await this.stockMovement.record(
            organizationId,
            product.id,
            'IN',
            qty,
            nextStock,
            {
              serviceOrderId,
              reason: `Peça rápida aprovada — entrada de ${qty} un.`,
            },
          );
        }
      }

      await this.prisma.serviceOrderItem.update({
        where: { id: item.id },
        data: {
          productId: product.id,
          quickPartCode: item.quickPartCode ?? code,
        },
      });
    }
  }

  /**
   * Atualiza o produto provisório vinculado à peça rápida quando a oficina
   * troca marca/modelo/custo após a aprovação (sem mexer no comercial).
   */
  async syncProvisionalFromPurchasedPart(
    organizationId: string,
    productId: string,
    data: {
      name?: string | null;
      brand?: string | null;
      costPrice?: number | null;
    },
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId, ...notDeleted },
    });
    if (!product) return null;
    if (product.status !== 'PROVISIONAL' && !product.needsReview) return product;

    const nextName = data.name?.trim();
    const nextBrand = data.brand !== undefined ? data.brand?.trim() || null : undefined;
    const nextCost =
      data.costPrice !== undefined && data.costPrice != null && data.costPrice >= 0
        ? data.costPrice
        : undefined;

    return this.prisma.product.update({
      where: { id: product.id },
      data: {
        ...(nextName ? { name: nextName } : {}),
        ...(nextBrand !== undefined ? { brand: nextBrand } : {}),
        ...(nextCost !== undefined
          ? {
              costPrice: nextCost,
              averageCost: nextCost,
              lastPurchaseCost: nextCost,
            }
          : {}),
        needsReview: true,
        status: 'PROVISIONAL',
      },
    });
  }

  shouldSkipStockForProduct(product: {
    status: string;
    stock: number;
    needsReview: boolean;
  }) {
    return product.status === 'PROVISIONAL' || (product.stock === 0 && product.needsReview);
  }

  async listPendingReview(organizationId: string, query: ListQueryInput = {}) {
    const { page, limit, skip } = parseListQuery(query);
    const where: Prisma.ProductWhereInput = {
      organizationId,
      ...notDeleted,
      needsReview: true,
      status: 'PROVISIONAL',
    };
    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const enriched = await Promise.all(
      rows.map(async (product) => {
        let origin: {
          serviceOrderNumber: number | null;
          customerName: string | null;
        } = { serviceOrderNumber: null, customerName: null };

        if (product.sourceServiceOrderItemId) {
          const item = await this.prisma.serviceOrderItem.findFirst({
            where: { id: product.sourceServiceOrderItemId, organizationId },
            include: {
              serviceOrder: {
                include: { vehicle: { include: { customer: true } } },
              },
            },
          });
          if (item?.serviceOrder) {
            origin = {
              serviceOrderNumber: item.serviceOrder.number,
              customerName: item.serviceOrder.vehicle?.customer?.name ?? null,
            };
          }
        }

        return { ...product, ...origin };
      }),
    );

    return paginatedResponse(enriched, total, page, limit);
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
        ...(dto.internalCode !== undefined ? { internalCode: dto.internalCode || null } : {}),
        ...(dto.barcode !== undefined ? { barcode: dto.barcode || null } : {}),
        ...(dto.category !== undefined ? { category: dto.category || null } : {}),
        ...(dto.subcategory !== undefined ? { subcategory: dto.subcategory || null } : {}),
        ...(dto.brand !== undefined ? { brand: dto.brand || null } : {}),
        ...(dto.ncm !== undefined ? { ncm: dto.ncm || null } : {}),
        ...(dto.cest !== undefined ? { cest: dto.cest || null } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit || 'UN' } : {}),
        ...(dto.weight !== undefined ? { weight: dto.weight ?? null } : {}),
        ...(dto.location !== undefined ? { location: dto.location || null } : {}),
        ...(dto.maxStock !== undefined ? { maxStock: dto.maxStock ?? null } : {}),
        ...(dto.markup !== undefined ? { markup: dto.markup ?? null } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl || null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
        ...(dto.minStock !== undefined ? { minStock: dto.minStock } : {}),
        ...(dto.costPrice !== undefined ? { costPrice: dto.costPrice } : {}),
        ...(dto.salePrice !== undefined ? { salePrice: dto.salePrice } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.needsReview !== undefined ? { needsReview: dto.needsReview } : {}),
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
