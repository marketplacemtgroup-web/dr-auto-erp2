import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PurchaseOrder } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { FinancialService } from '../financial/financial.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListQueryInput, paginatedResponse, parseListQuery } from '../common/pagination';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ConfirmPurchaseDto } from './dto/confirm-purchase.dto';
import { ReceivePurchaseDto } from './dto/receive-purchase.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

const poInclude = {
  supplier: { select: { id: true, legalName: true, tradeName: true } },
  items: {
    include: { product: { select: { id: true, name: true, sku: true, stock: true } } },
    orderBy: { sortOrder: 'asc' as const },
  },
  serviceOrder: { select: { id: true, number: true } },
};

type PoWithItems = Prisma.PurchaseOrderGetPayload<{ include: typeof poInclude }>;

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financial: FinancialService,
    private readonly audit: AuditService,
  ) {}

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }

  private resolveSupplierName(po: { supplierName: string; supplier?: { legalName: string; tradeName: string | null } | null }) {
    return po.supplier?.tradeName || po.supplier?.legalName || po.supplierName;
  }

  private computeLineTotals(items: Array<{
    quantity: number;
    unitCost: Prisma.Decimal | number;
    discount: Prisma.Decimal | number;
  }>) {
    return items.map((item) => {
      const lineSubtotal = Number(item.unitCost) * item.quantity;
      const discount = Number(item.discount);
      const total = this.roundMoney(Math.max(lineSubtotal - discount, 0));
      return total;
    });
  }

  private allocateCosts(
    items: Array<{
      id?: string;
      quantity: number;
      unitCost: Prisma.Decimal | number;
      discount: Prisma.Decimal | number;
    }>,
    freight: number,
    otherExpenses: number,
  ) {
    const lineTotals = this.computeLineTotals(items);
    const subtotal = lineTotals.reduce((s, v) => s + v, 0);
    const allocBase = subtotal > 0 ? subtotal : items.reduce((s, i) => s + i.quantity, 0);

    return items.map((item, idx) => {
      const lineTotal = lineTotals[idx];
      const weight = subtotal > 0 ? lineTotal / allocBase : item.quantity / allocBase;
      const allocatedFreight = this.roundMoney(freight * weight);
      const allocatedExpenses = this.roundMoney(otherExpenses * weight);
      const finalLine =
        lineTotal + allocatedFreight + allocatedExpenses;
      const finalUnitCost =
        item.quantity > 0 ? this.roundMoney(finalLine / item.quantity) : 0;
      return {
        allocatedFreight,
        allocatedExpenses,
        finalUnitCost,
        total: this.roundMoney(finalLine),
      };
    });
  }

  private async recalculateOrder(organizationId: string, purchaseOrderId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, organizationId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!po) throw new NotFoundException('Compra não encontrada');

    const freight = Number(po.freight) + Number(po.insurance);
    const otherExpenses = Number(po.otherExpenses);
    const allocations = this.allocateCosts(po.items, freight, otherExpenses);

    for (let i = 0; i < po.items.length; i++) {
      const item = po.items[i];
      const alloc = allocations[i];
      await this.prisma.purchaseOrderItem.update({
        where: { id: item.id },
        data: {
          allocatedFreight: new Prisma.Decimal(alloc.allocatedFreight),
          allocatedExpenses: new Prisma.Decimal(alloc.allocatedExpenses),
          finalUnitCost: new Prisma.Decimal(alloc.finalUnitCost),
          total: new Prisma.Decimal(alloc.total),
        },
      });
    }

    const subtotal = allocations.reduce((s, a) => s + a.total, 0);
    const totalAmount = this.roundMoney(
      subtotal - Number(po.discount) + Number(po.surcharge),
    );

    return this.prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        subtotal: new Prisma.Decimal(subtotal),
        totalAmount: new Prisma.Decimal(totalAmount),
      },
      include: poInclude,
    });
  }

  private async ensureProductForItem(
    tx: Prisma.TransactionClient,
    organizationId: string,
    item: {
      description: string;
      productId: string | null;
      location: string | null;
      finalUnitCost: Prisma.Decimal;
      serviceOrderItemId?: string | null;
    },
    supplierId: string | null,
  ): Promise<string | null> {
    if (item.productId) return item.productId;

    if (item.serviceOrderItemId) {
      const soItem = await tx.serviceOrderItem.findFirst({
        where: { id: item.serviceOrderItemId, organizationId },
      });
      if (soItem?.productId) return soItem.productId;
      if (soItem?.quickPartCode) {
        const byCode = await tx.product.findFirst({
          where: {
            organizationId,
            deletedAt: null,
            sku: soItem.quickPartCode,
          },
        });
        if (byCode) return byCode.id;
      }
    }

    const name = item.description.trim();
    if (!name) return null;

    const existing = await tx.product.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        name: { equals: name, mode: 'insensitive' },
      },
    });
    if (existing) return existing.id;

    const cost = Number(item.finalUnitCost) || 0;
    const created = await tx.product.create({
      data: {
        organizationId,
        name,
        location: item.location,
        stock: 0,
        costPrice: new Prisma.Decimal(cost),
        averageCost: new Prisma.Decimal(cost),
        lastSupplierId: supplierId,
        ...(item.serviceOrderItemId
          ? {
              status: 'PROVISIONAL',
              needsReview: true,
              category: 'Produto Provisório',
              sourceServiceOrderItemId: item.serviceOrderItemId,
            }
          : {}),
      },
    });
    return created.id;
  }

  private async applyInternalCostFromPurchase(
    tx: Prisma.TransactionClient,
    organizationId: string,
    item: {
      id: string;
      serviceOrderItemId: string | null;
      finalUnitCost: Prisma.Decimal;
      description: string;
    },
    po: { supplierId: string | null; receivedDate: Date | null },
    userId?: string,
  ) {
    if (!item.serviceOrderItemId) return;
    const soItem = await tx.serviceOrderItem.findFirst({
      where: { id: item.serviceOrderItemId, organizationId },
    });
    if (!soItem) return;

    const unitCost = Number(item.finalUnitCost);
    const oldCost =
      soItem.actualUnitCost != null
        ? String(soItem.actualUnitCost)
        : soItem.unitCost != null
          ? String(soItem.unitCost)
          : null;

    await tx.serviceOrderItem.update({
      where: { id: soItem.id },
      data: {
        actualUnitCost: new Prisma.Decimal(unitCost),
        actualSupplierId: po.supplierId,
        purchaseOrderItemId: item.id,
        purchaseDate: po.receivedDate ?? new Date(),
      },
    });

    await tx.serviceOrderItemCostHistory.create({
      data: {
        organizationId,
        serviceOrderItemId: soItem.id,
        userId: userId ?? null,
        field: 'ACTUAL_UNIT_COST',
        oldValue: oldCost,
        newValue: String(unitCost),
        note: `Atualizado automaticamente na recepção da compra — ${item.description}`,
      },
    });
  }

  async list(
    organizationId: string,
    search?: string,
    status?: string,
    query: ListQueryInput = {},
  ) {
    const { page, limit, skip } = parseListQuery(query);
    const where: Prisma.PurchaseOrderWhereInput = {
      organizationId,
      ...(status ? { status: status as never } : {}),
      ...(search
        ? {
            OR: [
              { number: { contains: search, mode: 'insensitive' } },
              { supplierName: { contains: search, mode: 'insensitive' } },
              { invoiceNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.purchaseOrder.count({ where }),
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, legalName: true, tradeName: true } },
          items: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);
    return paginatedResponse(rows, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
      include: poInclude,
    });
    if (!po) throw new NotFoundException('Compra não encontrada');
    return po;
  }

  private async nextNumber(organizationId: string) {
    const count = await this.prisma.purchaseOrder.count({ where: { organizationId } });
    return `PC-${1000 + count + 1}`;
  }

  async create(
    organizationId: string,
    dto: CreatePurchaseOrderDto,
    userId?: string,
  ) {
    if (!dto.items?.length) {
      throw new BadRequestException('Informe ao menos um item na compra');
    }

    let supplierName = dto.supplierName.trim();
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, organizationId },
      });
      if (!supplier) throw new NotFoundException('Fornecedor não encontrado');
      supplierName = supplier.tradeName || supplier.legalName;
    }

    const number = dto.number?.trim() || (await this.nextNumber(organizationId));

    const po = await this.prisma.purchaseOrder.create({
      data: {
        organizationId,
        number,
        supplierId: dto.supplierId ?? null,
        supplierName,
        status: 'DRAFT',
        purchaseType: dto.purchaseType ?? 'STOCK_PRODUCTS',
        serviceOrderId: dto.serviceOrderId ?? null,
        invoiceNumber: dto.invoiceNumber?.trim() ?? null,
        invoiceKey: dto.invoiceKey?.trim() ?? null,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : null,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        freight: new Prisma.Decimal(dto.freight ?? 0),
        insurance: new Prisma.Decimal(dto.insurance ?? 0),
        otherExpenses: new Prisma.Decimal(dto.otherExpenses ?? 0),
        discount: new Prisma.Decimal(dto.discount ?? 0),
        surcharge: new Prisma.Decimal(dto.surcharge ?? 0),
        paymentTerms: dto.paymentTerms ?? undefined,
        notes: dto.notes?.trim() ?? null,
        createdByUserId: userId ?? null,
        items: {
          create: dto.items.map((item, index) => ({
            organizationId,
            productId: item.productId ?? null,
            supplierProductCode: item.supplierProductCode?.trim() ?? null,
            description: item.description.trim(),
            quantity: item.quantity,
            unitCost: new Prisma.Decimal(item.unitCost),
            discount: new Prisma.Decimal(item.discount ?? 0),
            ipi: new Prisma.Decimal(item.ipi ?? 0),
            icms: new Prisma.Decimal(item.icms ?? 0),
            movesStock: item.movesStock ?? true,
            location: item.location?.trim() ?? null,
            serviceOrderId: item.serviceOrderId ?? null,
            sortOrder: index,
          })),
        },
      },
      include: poInclude,
    });

    return this.recalculateOrder(organizationId, po.id);
  }

  async update(organizationId: string, id: string, dto: UpdatePurchaseOrderDto) {
    const po = await this.findOne(organizationId, id);
    if (po.status !== 'DRAFT') {
      throw new BadRequestException('Somente compras em rascunho podem ser editadas');
    }

    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, organizationId },
      });
      if (!supplier) throw new NotFoundException('Fornecedor não encontrado');
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
        await tx.purchaseOrderItem.createMany({
          data: dto.items.map((item, index) => ({
            organizationId,
            purchaseOrderId: id,
            productId: item.productId ?? null,
            supplierProductCode: item.supplierProductCode?.trim() ?? null,
            description: item.description.trim(),
            quantity: item.quantity,
            unitCost: new Prisma.Decimal(item.unitCost),
            discount: new Prisma.Decimal(item.discount ?? 0),
            ipi: new Prisma.Decimal(item.ipi ?? 0),
            icms: new Prisma.Decimal(item.icms ?? 0),
            movesStock: item.movesStock ?? true,
            location: item.location?.trim() ?? null,
            serviceOrderId: item.serviceOrderId ?? null,
            sortOrder: index,
          })),
        });
      }

      await tx.purchaseOrder.update({
        where: { id },
        data: {
          ...(dto.supplierId !== undefined ? { supplierId: dto.supplierId ?? null } : {}),
          ...(dto.supplierName != null ? { supplierName: dto.supplierName.trim() } : {}),
          ...(dto.purchaseType != null ? { purchaseType: dto.purchaseType } : {}),
          ...(dto.serviceOrderId !== undefined ? { serviceOrderId: dto.serviceOrderId ?? null } : {}),
          ...(dto.invoiceNumber !== undefined ? { invoiceNumber: dto.invoiceNumber?.trim() ?? null } : {}),
          ...(dto.invoiceKey !== undefined ? { invoiceKey: dto.invoiceKey?.trim() ?? null } : {}),
          ...(dto.orderDate !== undefined
            ? { orderDate: dto.orderDate ? new Date(dto.orderDate) : null }
            : {}),
          ...(dto.expectedDate !== undefined
            ? { expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null }
            : {}),
          ...(dto.freight != null ? { freight: new Prisma.Decimal(dto.freight) } : {}),
          ...(dto.insurance != null ? { insurance: new Prisma.Decimal(dto.insurance) } : {}),
          ...(dto.otherExpenses != null
            ? { otherExpenses: new Prisma.Decimal(dto.otherExpenses) }
            : {}),
          ...(dto.discount != null ? { discount: new Prisma.Decimal(dto.discount) } : {}),
          ...(dto.surcharge != null ? { surcharge: new Prisma.Decimal(dto.surcharge) } : {}),
          ...(dto.paymentTerms !== undefined ? { paymentTerms: dto.paymentTerms ?? undefined } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes?.trim() ?? null } : {}),
        },
      });
    });

    return this.recalculateOrder(organizationId, id);
  }

  async confirm(
    organizationId: string,
    id: string,
    userId?: string,
    opts?: { postToStock?: boolean; autoCreateProducts?: boolean },
  ) {
    const po = await this.findOne(organizationId, id);
    if (po.status !== 'DRAFT') {
      throw new BadRequestException('Compra já confirmada ou cancelada');
    }
    if (!po.items.length) {
      throw new BadRequestException('Compra sem itens');
    }

    await this.financial.createFromPurchase(organizationId, po);

    await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'AWAITING_RECEIPT',
        financialStatus: 'OPEN',
      },
    });

    await this.audit.log(organizationId, 'purchase.confirm', 'purchase_order', {
      userId,
      metadata: {
        purchaseOrderId: id,
        number: po.number,
        total: Number(po.totalAmount),
        postToStock: opts?.postToStock !== false,
      },
    });

    const postToStock = opts?.postToStock !== false;
    if (postToStock) {
      return this.receive(
        organizationId,
        id,
        {},
        userId,
        { autoCreateProducts: opts?.autoCreateProducts !== false },
      );
    }

    return this.findOne(organizationId, id);
  }

  async receive(
    organizationId: string,
    id: string,
    dto: ReceivePurchaseDto,
    userId?: string,
    opts?: { autoCreateProducts?: boolean },
  ) {
    const po = await this.findOne(organizationId, id);
    if (po.status === 'CANCELLED') {
      throw new BadRequestException('Compra cancelada');
    }
    if (po.status === 'DRAFT') {
      throw new BadRequestException('Confirme a compra antes de receber');
    }

    const receiveMap = new Map(
      (dto.items ?? po.items.map((i) => ({ itemId: i.id, quantity: i.quantity - i.quantityReceived })))
        .filter((r) => r.quantity > 0)
        .map((r) => [r.itemId, r.quantity]),
    );

    if (receiveMap.size === 0) {
      throw new BadRequestException('Nenhum item para receber');
    }

    const autoCreate = opts?.autoCreateProducts !== false;

    await this.prisma.$transaction(async (tx) => {
      if (autoCreate) {
        for (const item of po.items) {
          if (!item.movesStock || item.productId) continue;
          const productId = await this.ensureProductForItem(
            tx,
            organizationId,
            item,
            po.supplierId,
          );
          if (productId) {
            await tx.purchaseOrderItem.update({
              where: { id: item.id },
              data: { productId },
            });
            item.productId = productId;
          }
        }
      }

      for (const item of po.items) {
        const qty = receiveMap.get(item.id);
        if (!qty) continue;

        const pending = item.quantity - item.quantityReceived;
        if (qty > pending) {
          throw new BadRequestException(
            `Quantidade excede pendente para "${item.description}" (${pending} restante)`,
          );
        }

        if (item.movesStock && item.productId) {
          const product = await tx.product.findFirst({
            where: { id: item.productId, organizationId, deletedAt: null },
          });
          if (!product) throw new NotFoundException('Produto não encontrado');

          const unitCost = Number(item.finalUnitCost);
          const oldStock = product.stock;
          const oldAvg = Number(product.averageCost) || Number(product.costPrice) || 0;
          const newStock = oldStock + qty;
          const newAvg =
            newStock > 0
              ? this.roundMoney((oldStock * oldAvg + qty * unitCost) / newStock)
              : unitCost;

          await tx.product.update({
            where: { id: product.id },
            data: {
              stock: newStock,
              costPrice: new Prisma.Decimal(unitCost),
              averageCost: new Prisma.Decimal(newAvg),
              lastPurchaseCost: new Prisma.Decimal(unitCost),
              lastPurchaseAt: new Date(),
              lastSupplierId: po.supplierId,
              ...(item.location ? { location: item.location } : {}),
            },
          });

          await tx.stockMovement.create({
            data: {
              organizationId,
              productId: product.id,
              movementType: 'IN',
              quantity: qty,
              balanceAfter: newStock,
              reason: `Entrada compra ${po.number}`,
              purchaseOrderId: po.id,
              purchaseOrderItemId: item.id,
              supplierId: po.supplierId,
              unitCost: new Prisma.Decimal(unitCost),
              totalCost: new Prisma.Decimal(this.roundMoney(unitCost * qty)),
            },
          });
        }

        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { quantityReceived: { increment: qty } },
        });

        if (item.serviceOrderItemId) {
          await this.applyInternalCostFromPurchase(
            tx,
            organizationId,
            item,
            {
              supplierId: po.supplierId,
              receivedDate: po.receivedDate ?? new Date(),
            },
            userId,
          );
        }
      }
    });

    const refreshed = await this.findOne(organizationId, id);
    const allReceived = refreshed.items.every((i) => i.quantityReceived >= i.quantity);
    const anyReceived = refreshed.items.some((i) => i.quantityReceived > 0);
    const anyStock = refreshed.items.some((i) => i.movesStock);

    const status = allReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : refreshed.status;
    let stockStatus = refreshed.stockStatus;
    if (anyStock) {
      stockStatus = allReceived ? 'POSTED' : anyReceived ? 'PARTIAL' : stockStatus;
    } else if (!anyStock) {
      stockStatus = 'NO_STOCK';
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status,
        stockStatus,
        receivedDate: allReceived ? new Date() : refreshed.receivedDate,
      },
      include: poInclude,
    });

    await this.audit.log(organizationId, 'purchase.receive', 'purchase_order', {
      userId,
      metadata: { purchaseOrderId: id, number: po.number, status },
    });

    return updated;
  }

  async cancel(organizationId: string, id: string, userId?: string) {
    const po = await this.findOne(organizationId, id);
    if (po.status === 'CANCELLED') {
      throw new BadRequestException('Compra já cancelada');
    }

    await this.prisma.$transaction(async (tx) => {
      const openEntries = await tx.financialEntry.findMany({
        where: {
          organizationId,
          purchaseOrderId: id,
          status: 'OPEN',
        },
      });
      for (const entry of openEntries) {
        await tx.financialEntry.update({
          where: { id: entry.id },
          data: { status: 'CANCELLED' },
        });
        await tx.financialEntry.updateMany({
          where: { parentEntryId: entry.id, status: 'OPEN' },
          data: { status: 'CANCELLED' },
        });
      }

      if (po.stockStatus === 'POSTED' || po.stockStatus === 'PARTIAL') {
        for (const item of po.items) {
          if (!item.movesStock || !item.productId || item.quantityReceived <= 0) continue;

          const product = await tx.product.findFirst({
            where: { id: item.productId, organizationId },
          });
          if (!product) continue;

          const qty = item.quantityReceived;
          const nextStock = Math.max(product.stock - qty, 0);
          await tx.product.update({
            where: { id: product.id },
            data: { stock: nextStock },
          });
          await tx.stockMovement.create({
            data: {
              organizationId,
              productId: product.id,
              movementType: 'ADJUST',
              quantity: -qty,
              balanceAfter: nextStock,
              reason: `Estorno compra cancelada ${po.number}`,
              purchaseOrderId: po.id,
              purchaseOrderItemId: item.id,
              supplierId: po.supplierId,
            },
          });
        }
      }

      await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          financialStatus: 'CANCELLED',
          stockStatus: po.stockStatus === 'NOT_POSTED' ? 'NOT_POSTED' : 'NOT_POSTED',
        },
      });
    });

    await this.audit.log(organizationId, 'purchase.cancel', 'purchase_order', {
      userId,
      metadata: { purchaseOrderId: id, number: po.number },
    });

    return this.findOne(organizationId, id);
  }

  /** Compat: receber tudo de uma vez */
  markReceived(organizationId: string, id: string, userId?: string) {
    return this.receive(organizationId, id, {}, userId);
  }
}
