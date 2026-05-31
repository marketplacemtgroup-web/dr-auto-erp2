import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ServiceOrderStatus } from '@prisma/client';
import { QuotesSyncService } from '../quotes/quotes-sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementService } from '../products/stock-movement.service';
import { CAR_CHECKLIST_TEMPLATE } from './checklist-template';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { CreateServiceOrderItemDto } from './dto/create-service-order-item.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { AttachmentsService } from '../attachments/attachments.service';
import { AuditService } from '../audit/audit.service';
import { notDeleted } from '../common/soft-delete';
import { EventsService } from '../events/events.service';

const STATUS_PT: Record<string, string> = {
  RECEIVED: 'Recebido',
  DIAGNOSIS: 'Em diagnóstico',
  AWAITING_QUOTE: 'Aguardando orçamento',
  AWAITING_APPROVAL: 'Aguardando aprovação',
  APPROVED: 'Aprovado',
  IN_PROGRESS: 'Em execução',
  AWAITING_PART: 'Aguardando peça',
  PAUSED: 'Pausado',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  FINISHED: 'Finalizado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export const soInclude = {
  vehicle: { include: { customer: true } },
  branch: true,
  consultant: { include: { user: true } },
  mechanic: { include: { user: true } },
  items: { include: { product: true }, orderBy: { createdAt: 'asc' as const } },
  quotes: {
    orderBy: { createdAt: 'desc' as const },
    include: { lines: { orderBy: { sortOrder: 'asc' as const } } },
  },
  statusHistory: {
    orderBy: { createdAt: 'desc' as const },
    include: { user: { select: { id: true, name: true } } },
  },
  checklistItems: { orderBy: { sortOrder: 'asc' as const } },
  attachments: { orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class ServiceOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotesSync: QuotesSyncService,
    private readonly stockMovement: StockMovementService,
    private readonly audit: AuditService,
    private readonly events: EventsService,
    private readonly attachments: AttachmentsService,
  ) {}

  async create(organizationId: string, dto: CreateServiceOrderDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, organizationId, ...notDeleted },
    });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');

    const last = await this.prisma.serviceOrder.findFirst({
      where: { organizationId },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const number = (last?.number ?? 1000) + 1;

    let branchId = dto.branchId;
    if (!branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { organizationId, isMain: true },
      });
      branchId = branch?.id;
    }

    const status = dto.status ?? 'RECEIVED';

    const so = await this.prisma.serviceOrder.create({
      data: {
        organizationId,
        vehicleId: dto.vehicleId,
        branchId,
        number,
        status,
        enteredAt: new Date(),
        complaint: dto.complaint?.trim() ?? null,
        estimatedAt: dto.estimatedAt ? new Date(dto.estimatedAt) : null,
        totalAmount: dto.totalAmount ?? 0,
        checklistItems: {
          create: CAR_CHECKLIST_TEMPLATE.map((item, idx) => ({
            organizationId,
            category: item.category,
            label: item.label,
            sortOrder: idx,
          })),
        },
        statusHistory: {
          create: {
            organizationId,
            toStatus: status,
            notes: 'OS aberta',
          },
        },
      },
      include: soInclude,
    });

    return so;
  }

  list(organizationId: string, search?: string, scheduledOnly?: boolean, status?: string) {
    return this.prisma.serviceOrder.findMany({
      where: {
        organizationId,
        ...notDeleted,
        ...(status ? { status: status as ServiceOrderStatus } : {}),
        ...(scheduledOnly ? { estimatedAt: { not: null } } : {}),
        ...(search
          ? {
              OR: [
                { vehicle: { plate: { contains: search, mode: 'insensitive' } } },
                { vehicle: { customer: { name: { contains: search, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      },
      include: {
        vehicle: { include: { customer: true } },
        branch: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    let row = await this.prisma.serviceOrder.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: soInclude,
    });
    if (!row) throw new NotFoundException('Ordem de serviço não encontrada');

    if (row.checklistItems.length === 0) {
      await this.prisma.serviceOrderChecklistItem.createMany({
        data: CAR_CHECKLIST_TEMPLATE.map((item, idx) => ({
          organizationId,
          serviceOrderId: id,
          category: item.category,
          label: item.label,
          sortOrder: idx,
        })),
      });
      row = await this.prisma.serviceOrder.findFirst({
        where: { id, organizationId },
        include: soInclude,
      })!;
    }

    const attachments = await this.attachments.enrichMany(row!.attachments);
    return { ...row!, attachments };
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateServiceOrderDto,
    userId?: string,
  ) {
    const current = await this.findOne(organizationId, id);
    if (!current) throw new NotFoundException('Ordem de serviço não encontrada');

    if (dto.status !== undefined && dto.status !== current.status) {
      await this.prisma.serviceOrderStatusHistory.create({
        data: {
          organizationId,
          serviceOrderId: id,
          fromStatus: current.status,
          toStatus: dto.status,
          userId: userId ?? null,
          reason: dto.statusReason ?? null,
        },
      });
      await this.audit.log(organizationId, 'service_order.status_change', 'service_order', {
        userId,
        metadata: {
          serviceOrderId: id,
          number: current.number,
          from: current.status,
          to: dto.status,
        },
      });

      const label = STATUS_PT[dto.status] ?? dto.status;
      const ready = dto.status === 'FINISHED' || dto.status === 'DELIVERED';
      await this.events.emitOffice(organizationId, {
        type: 'service_order.status',
        title: ready ? 'Veículo pronto' : 'Status da OS atualizado',
        message: `OS #${current.number}: ${label}`,
        metadata: {
          serviceOrderId: id,
          serviceOrderNumber: current.number,
          status: dto.status,
        },
        vehicleId: current.vehicleId,
        pushTitle: ready ? 'Seu veículo está pronto!' : 'Atualização da OS',
        pushBody: ready
          ? `OS #${current.number} — pode retirar na oficina`
          : `OS #${current.number}: ${label}`,
        pushUrl: `/os/${id}`,
      });
    }

    return this.prisma.serviceOrder.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.serviceType !== undefined ? { serviceType: dto.serviceType || null } : {}),
        ...(dto.entryChannel !== undefined ? { entryChannel: dto.entryChannel || null } : {}),
        ...(dto.bay !== undefined ? { bay: dto.bay || null } : {}),
        ...(dto.entryKm !== undefined ? { entryKm: dto.entryKm ?? null } : {}),
        ...(dto.enteredAt !== undefined
          ? { enteredAt: dto.enteredAt === null ? null : new Date(dto.enteredAt) }
          : {}),
        ...(dto.consultantMemberId !== undefined
          ? { consultantMemberId: dto.consultantMemberId || null }
          : {}),
        ...(dto.mechanicMemberId !== undefined
          ? { mechanicMemberId: dto.mechanicMemberId || null }
          : {}),
        ...(dto.complaint !== undefined ? { complaint: dto.complaint || null } : {}),
        ...(dto.diagnosis !== undefined ? { diagnosis: dto.diagnosis || null } : {}),
        ...(dto.internalNotes !== undefined
          ? { internalNotes: dto.internalNotes || null }
          : {}),
        ...(dto.customerVisibleNotes !== undefined
          ? { customerVisibleNotes: dto.customerVisibleNotes || null }
          : {}),
        ...(dto.estimatedAt !== undefined
          ? {
              estimatedAt:
                dto.estimatedAt === null ? null : new Date(dto.estimatedAt),
            }
          : {}),
      },
      include: soInclude,
    });
  }

  async updateChecklist(organizationId: string, serviceOrderId: string, dto: UpdateChecklistDto) {
    await this.findOne(organizationId, serviceOrderId);
    for (const item of dto.items) {
      await this.prisma.serviceOrderChecklistItem.updateMany({
        where: { id: item.id, serviceOrderId, organizationId },
        data: {
          result: item.result ?? null,
          notes: item.notes ?? null,
        },
      });
    }
    return this.findOne(organizationId, serviceOrderId);
  }

  async remove(organizationId: string, id: string, userId?: string) {
    const row = (await this.findOne(organizationId, id))!;
    const number = row.number;
    await this.prisma.serviceOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit.log(organizationId, 'service_order.delete', 'service_order', {
      userId,
      metadata: { serviceOrderId: id, number },
    });
    return { ok: true };
  }

  async addItem(
    organizationId: string,
    serviceOrderId: string,
    dto: CreateServiceOrderItemDto,
    userId?: string,
  ) {
    const so = await this.findOne(organizationId, serviceOrderId);
    if (!so) throw new NotFoundException('Ordem de serviço não encontrada');
    const totalBefore = Number(so.totalAmount);
    const qty = dto.quantity ?? 1;

    let description = dto.description.trim();
    let unitPrice = dto.unitPrice;
    let itemType = dto.itemType ?? 'SERVICE';
    let catalogItemId: string | null = dto.catalogItemId ?? null;

    if (dto.catalogItemId) {
      const catalog = await this.prisma.serviceCatalog.findFirst({
        where: { id: dto.catalogItemId, organizationId, isActive: true },
      });
      if (!catalog) throw new NotFoundException('Serviço do catálogo não encontrado');
      description = description || catalog.name;
      unitPrice = unitPrice ?? Number(catalog.defaultPrice);
      itemType = 'SERVICE';
      catalogItemId = catalog.id;
    }

    if (dto.productId) {
      const product = await this.prisma.product.findFirst({
        where: { id: dto.productId, organizationId, ...notDeleted },
      });
      if (!product) throw new NotFoundException('Produto não encontrado');

      if (itemType === 'PART') {
        const available = this.stockMovement.availableStock(
          product.stock,
          product.reservedStock,
        );
        if (available < qty) {
          throw new BadRequestException(
            `Estoque insuficiente. Disponível: ${available}, solicitado: ${qty}`,
          );
        }
        const nextStock = product.stock - qty;
        await this.prisma.product.update({
          where: { id: dto.productId },
          data: { stock: nextStock },
        });
        await this.stockMovement.record(
          organizationId,
          dto.productId,
          'OUT_OS',
          qty,
          nextStock,
          { serviceOrderId: so.id, reason: `Saída OS #${so.number}` },
        );
      }
    }

    await this.prisma.serviceOrderItem.create({
      data: {
        organizationId,
        serviceOrderId: so.id,
        productId: dto.productId ?? null,
        catalogItemId,
        description,
        itemType,
        quantity: qty,
        unitPrice,
      },
    });

    await this.recalculateTotal(serviceOrderId);
    await this.quotesSync.syncForServiceOrder(organizationId, serviceOrderId);
    const refreshed = (await this.findOne(organizationId, serviceOrderId))!;
    const totalAfter = Number(refreshed.totalAmount);
    if (totalBefore !== totalAfter) {
      await this.audit.log(organizationId, 'service_order.amount_change', 'service_order', {
        userId,
        metadata: {
          serviceOrderId,
          number: so.number,
          from: totalBefore,
          to: totalAfter,
          item: description,
        },
      });
    }
    return refreshed;
  }

  async removeItem(
    organizationId: string,
    serviceOrderId: string,
    itemId: string,
    userId?: string,
  ) {
    const item = await this.prisma.serviceOrderItem.findFirst({
      where: { id: itemId, serviceOrderId, organizationId },
    });
    if (!item) throw new NotFoundException('Item não encontrado');

    const so = (await this.findOne(organizationId, serviceOrderId))!;
    const totalBefore = Number(so.totalAmount);

    if (item.productId && item.itemType === 'PART') {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (product) {
        const nextStock = product.stock + item.quantity;
        await this.prisma.product.update({
          where: { id: item.productId },
          data: { stock: nextStock },
        });
        await this.stockMovement.record(
          organizationId,
          item.productId,
          'RETURN',
          item.quantity,
          nextStock,
          { serviceOrderId, reason: 'Devolução — item removido da OS' },
        );
      }
    }

    await this.prisma.serviceOrderItem.delete({ where: { id: itemId } });
    await this.recalculateTotal(serviceOrderId);
    await this.quotesSync.syncForServiceOrder(organizationId, serviceOrderId);
    const refreshed = (await this.findOne(organizationId, serviceOrderId))!;
    const totalAfter = Number(refreshed.totalAmount);
    if (totalBefore !== totalAfter) {
      await this.audit.log(organizationId, 'service_order.amount_change', 'service_order', {
        userId,
        metadata: {
          serviceOrderId,
          number: so.number,
          from: totalBefore,
          to: totalAfter,
          removedItem: item.description,
        },
      });
    }
    return refreshed;
  }

  private async recalculateTotal(serviceOrderId: string) {
    const items = await this.prisma.serviceOrderItem.findMany({
      where: { serviceOrderId },
    });
    const total = items.reduce(
      (sum, i) => sum + Number(i.unitPrice) * i.quantity,
      0,
    );
    await this.prisma.serviceOrder.update({
      where: { id: serviceOrderId },
      data: { totalAmount: new Prisma.Decimal(total) },
    });
  }
}
