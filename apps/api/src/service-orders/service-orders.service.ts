import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  ServiceOrderItemCostField,
  ServiceOrderItemType,
  ServiceOrderStatus,
} from '@prisma/client';
import { QuotesSyncService } from '../quotes/quotes-sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementService } from '../products/stock-movement.service';
import { ProductsService } from '../products/products.service';
import { CAR_CHECKLIST_TEMPLATE, checklistMatchesTemplate } from './checklist-template';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { CreateServiceOrderItemDto } from './dto/create-service-order-item.dto';
import { UpdateServiceOrderItemDto } from './dto/update-service-order-item.dto';
import { UpdateInternalCostDto } from './dto/update-internal-cost.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { AuditService } from '../audit/audit.service';
import { ListQueryInput, paginatedResponse, parseListQuery } from '../common/pagination';
import { notDeleted } from '../common/soft-delete';
import { isCommissionEligibleItemType } from '../common/item-type.util';
import { EventsService } from '../events/events.service';
import { PortalCustomerNotifyService } from '../events/portal-customer-notify.service';
import { FinancialService } from '../financial/financial.service';
import { CommissionEngineService } from '../team/commission-engine.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { MaintenanceRemindersService } from '../maintenance-reminders/maintenance-reminders.service';

/** Fase de orçamento/análise — peças não baixam estoque físico. */
const QUOTE_PHASE_STATUSES: ServiceOrderStatus[] = [
  'RECEIVED',
  'DIAGNOSIS',
  'AWAITING_QUOTE',
  'AWAITING_APPROVAL',
];

const CLOSED_OS_STATUSES: ServiceOrderStatus[] = [
  'FINISHED',
  'DELIVERED',
  'AWAITING_PAYMENT',
];

const EXECUTION_STATUSES: ServiceOrderStatus[] = ['IN_PROGRESS', 'APPROVED', 'AWAITING_PART'];

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

const employeeSelect = { select: { id: true, name: true, photoUrl: true } };

const supplierSelect = { select: { id: true, legalName: true, tradeName: true } };

export const soInclude = {
  vehicle: { include: { customer: true } },
  branch: true,
  consultant: { include: { user: true } },
  mechanic: { include: { user: true } },
  generalResponsible: employeeSelect,
  checklistBy: employeeSelect,
  diagnosisBy: employeeSelect,
  quoteBy: employeeSelect,
  executionBy: employeeSelect,
  coExecutionBy: employeeSelect,
  finalizedBy: employeeSelect,
  items: {
    include: {
      product: true,
      catalogItem: true,
      outsourcedService: { select: { id: true, name: true, provider: true } },
      executor: employeeSelect,
      coExecutor: employeeSelect,
      soldBy: employeeSelect,
      appliedBy: employeeSelect,
      separatedBy: employeeSelect,
      suggestedSupplier: supplierSelect,
      actualSupplier: supplierSelect,
      purchaseOrderItem: {
        include: {
          purchaseOrder: { select: { id: true, number: true, invoiceNumber: true } },
        },
      },
      costHistory: {
        orderBy: { createdAt: 'desc' as const },
        take: 30,
        include: { user: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
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
    private readonly products: ProductsService,
    private readonly audit: AuditService,
    private readonly events: EventsService,
    private readonly portalNotify: PortalCustomerNotifyService,
    private readonly financial: FinancialService,
    private readonly commissionEngine: CommissionEngineService,
    private readonly appointments: AppointmentsService,
    private readonly maintenanceReminders: MaintenanceRemindersService,
  ) {}

  private async maybeRegenerateCommissions(
    organizationId: string,
    serviceOrderId: string,
    status: ServiceOrderStatus,
  ) {
    if (!CLOSED_OS_STATUSES.includes(status)) return;
    await this.commissionEngine.regenerateForServiceOrder(organizationId, serviceOrderId);
  }

  private async previewItemCommission(
    organizationId: string,
    params: {
      itemType: 'SERVICE' | 'PART' | 'SCANNER' | 'THIRD_PARTY';
      quantity: number;
      unitPrice: number;
      discount?: number;
      catalogItemId?: string | null;
      productId?: string | null;
      executorId?: string | null;
      coExecutorId?: string | null;
      coExecutorSplitPct?: number | null;
      soldById?: string | null;
      executionById?: string | null;
    },
  ) {
    if (!isCommissionEligibleItemType(params.itemType)) return null;

    if (params.itemType === 'SERVICE') {
      const primaryId = params.executorId ?? params.executionById;
      if (!primaryId) return null;
      return this.commissionEngine.previewForServiceItem({
        organizationId,
        quantity: params.quantity,
        unitPrice: params.unitPrice,
        discount: params.discount ?? 0,
        catalogItemId: params.catalogItemId ?? null,
        executorId: params.executorId ?? null,
        coExecutorId: params.coExecutorId ?? null,
        coExecutorSplitPct: params.coExecutorSplitPct ?? null,
        executionById: params.executionById ?? null,
      });
    }

    const employeeId = params.soldById;
    if (!employeeId) return null;
    return this.commissionEngine.previewForItem(organizationId, employeeId, {
      itemType: params.itemType as ServiceOrderItemType,
      quantity: params.quantity,
      unitPrice: params.unitPrice,
      discount: params.discount ?? 0,
      catalogItemId: params.catalogItemId,
      productId: params.productId,
    });
  }

  async previewItemCommissionForOrder(
    organizationId: string,
    serviceOrderId: string,
    dto: {
      itemType: 'SERVICE' | 'PART' | 'SCANNER' | 'THIRD_PARTY';
      quantity: number;
      unitPrice: number;
      discount?: number;
      catalogItemId?: string | null;
      productId?: string | null;
      executorId?: string | null;
      coExecutorId?: string | null;
      coExecutorSplitPct?: number | null;
      soldById?: string | null;
    },
  ) {
    const so = await this.findOne(organizationId, serviceOrderId);
    if (!so) throw new NotFoundException('Ordem de serviço não encontrada');

    if (dto.itemType === 'SERVICE') {
      const shares = this.commissionEngine.resolveServiceExecutors(
        {
          executorId: dto.executorId ?? null,
          coExecutorId: dto.coExecutorId ?? null,
          coExecutorSplitPct: dto.coExecutorSplitPct ?? null,
        },
        { executionById: so.executionById },
      );
      const breakdown: Array<{
        employeeId: string;
        sharePct: number;
        amount: number;
      }> = [];
      for (const share of shares) {
        const amount = await this.commissionEngine.previewForItem(
          organizationId,
          share.employeeId,
          {
            itemType: 'SERVICE',
            quantity: dto.quantity,
            unitPrice: dto.unitPrice,
            discount: dto.discount ?? 0,
            catalogItemId: dto.catalogItemId ?? null,
            sharePct: share.sharePct,
          },
        );
        if (amount > 0) {
          breakdown.push({
            employeeId: share.employeeId,
            sharePct: share.sharePct,
            amount,
          });
        }
      }
      const total = Math.round(breakdown.reduce((s, b) => s + b.amount, 0) * 100) / 100;
      return { total, breakdown };
    }

    const total =
      (await this.previewItemCommission(organizationId, {
        ...dto,
        executionById: so.executionById,
      })) ?? 0;
    const employeeId = dto.soldById;
    return {
      total,
      breakdown:
        employeeId && total > 0
          ? [{ employeeId, sharePct: 100, amount: total }]
          : [],
    };
  }

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

  async list(
    organizationId: string,
    search?: string,
    scheduledOnly?: boolean,
    status?: string,
    query: ListQueryInput = {},
  ) {
    const { page, limit, skip } = parseListQuery(query);
    const where: Prisma.ServiceOrderWhereInput = {
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
    };
    const [total, rows] = await Promise.all([
      this.prisma.serviceOrder.count({ where }),
      this.prisma.serviceOrder.findMany({
        where,
        include: {
          vehicle: { include: { customer: true } },
          branch: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);
    return paginatedResponse(rows, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    let row = await this.prisma.serviceOrder.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: soInclude,
    });
    if (!row) throw new NotFoundException('Ordem de serviço não encontrada');

    const needsChecklist =
      row.checklistItems.length === 0 ||
      !checklistMatchesTemplate(row.checklistItems.map((item) => item.label));

    if (needsChecklist) {
      await this.prisma.serviceOrderChecklistItem.deleteMany({
        where: { serviceOrderId: id, organizationId },
      });
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

    const attachments = row!.attachments;
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
      const enteringExecution =
        EXECUTION_STATUSES.includes(dto.status as ServiceOrderStatus) &&
        QUOTE_PHASE_STATUSES.includes(current.status as ServiceOrderStatus);
      if (enteringExecution) {
        await this.deductPartsStockForExecution(organizationId, id);
      }

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
        portalNotificationType: ready ? 'finalizacao' : 'status',
        serviceOrderId: id,
      });
    }

    const diagnosisChanged =
      dto.diagnosis !== undefined && dto.diagnosis !== current.diagnosis;
    const notesChanged =
      dto.customerVisibleNotes !== undefined &&
      dto.customerVisibleNotes !== current.customerVisibleNotes;
    const statusChanging =
      dto.status !== undefined && dto.status !== current.status;

    if ((diagnosisChanged || notesChanged) && !statusChanging) {
      const pushBody = diagnosisChanged
        ? `OS #${current.number} — diagnóstico atualizado`
        : `OS #${current.number} — nova observação da oficina`;
      await this.events.emitCustomer(current.vehicleId, {
        pushTitle: 'Atualização da OS',
        pushBody,
        pushUrl: `/os/${id}`,
        portalNotificationType: 'status',
        serviceOrderId: id,
      });
    }

    const complaintChanged =
      dto.complaint !== undefined &&
      (dto.complaint?.trim() || null) !== (current.complaint?.trim() || null);
    const entryKmChanged =
      dto.entryKm !== undefined && dto.entryKm !== current.entryKm;
    const estimatedAtChanged =
      dto.estimatedAt !== undefined &&
      (() => {
        const next =
          dto.estimatedAt === null || dto.estimatedAt === undefined
            ? null
            : new Date(dto.estimatedAt).getTime();
        const prev = current.estimatedAt
          ? new Date(current.estimatedAt).getTime()
          : null;
        return next !== prev;
      })();

    if (!statusChanging && !diagnosisChanged && !notesChanged) {
      if (complaintChanged) {
        await this.portalNotify.notifyServiceOrderFieldUpdate(id, 'complaint');
      } else if (estimatedAtChanged) {
        await this.portalNotify.notifyServiceOrderFieldUpdate(id, 'estimatedAt');
      } else if (entryKmChanged) {
        await this.portalNotify.notifyServiceOrderFieldUpdate(id, 'entryKm');
      }
    }

    const nextExecutionById =
      dto.executionById !== undefined ? dto.executionById || null : current.executionById;
    const nextCoExecutionById =
      dto.coExecutionById !== undefined
        ? dto.coExecutionById || null
        : current.coExecutionById;
    if (
      nextExecutionById &&
      nextCoExecutionById &&
      nextExecutionById === nextCoExecutionById
    ) {
      throw new BadRequestException(
        'O mecânico auxiliar não pode ser o mesmo da execução principal',
      );
    }

    const updated = await this.prisma.serviceOrder.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        // Grava a data de fechamento apenas na primeira vez que a OS é
        // concluída/entregue — mantém o reconhecimento de lucro estável.
        ...(dto.status !== undefined &&
        CLOSED_OS_STATUSES.includes(dto.status as ServiceOrderStatus) &&
        !current.closedAt
          ? { closedAt: new Date() }
          : {}),
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
        ...(dto.generalResponsibleId !== undefined
          ? { generalResponsibleId: dto.generalResponsibleId || null }
          : {}),
        ...(dto.checklistById !== undefined
          ? { checklistById: dto.checklistById || null }
          : {}),
        ...(dto.diagnosisById !== undefined
          ? { diagnosisById: dto.diagnosisById || null }
          : {}),
        ...(dto.quoteById !== undefined ? { quoteById: dto.quoteById || null } : {}),
        ...(dto.executionById !== undefined
          ? { executionById: dto.executionById || null }
          : {}),
        ...(dto.coExecutionById !== undefined
          ? { coExecutionById: dto.coExecutionById || null }
          : {}),
        ...(dto.finalizedById !== undefined
          ? { finalizedById: dto.finalizedById || null }
          : {}),
        ...(dto.complaint !== undefined ? { complaint: dto.complaint || null } : {}),
        ...(dto.diagnosis !== undefined ? { diagnosis: dto.diagnosis || null } : {}),
        ...(dto.internalNotes !== undefined
          ? { internalNotes: dto.internalNotes || null }
          : {}),
        ...(dto.customerVisibleNotes !== undefined
          ? { customerVisibleNotes: dto.customerVisibleNotes || null }
          : {}),
        ...(dto.paymentAgreement !== undefined
          ? { paymentAgreement: dto.paymentAgreement || null }
          : {}),
        ...(dto.estimatedAt !== undefined
          ? {
              estimatedAt:
                dto.estimatedAt === null ? null : new Date(dto.estimatedAt),
            }
          : {}),
        ...(dto.revisionIntervalKm !== undefined
          ? { revisionIntervalKm: dto.revisionIntervalKm ?? null }
          : {}),
        ...(dto.revisionIntervalMonths !== undefined
          ? { revisionIntervalMonths: dto.revisionIntervalMonths ?? null }
          : {}),
        ...(dto.oilChangeIntervalKm !== undefined
          ? { oilChangeIntervalKm: dto.oilChangeIntervalKm ?? null }
          : {}),
        ...(dto.oilChangeIntervalMonths !== undefined
          ? { oilChangeIntervalMonths: dto.oilChangeIntervalMonths ?? null }
          : {}),
      },
      include: soInclude,
    });

    if (dto.status === 'DELIVERED' && current.status !== 'DELIVERED') {
      try {
        await this.financial.createFromServiceOrder(organizationId, id);
      } catch {
        // OS sem valor ou outro bloqueio — status da entrega segue normalmente
      }
      await this.commissionEngine.generateForServiceOrder(
        organizationId,
        id,
        'OS_ENTREGUE',
      );
    }

    if (
      (dto.status === 'FINISHED' || dto.status === 'DELIVERED') &&
      dto.status !== current.status
    ) {
      await this.commissionEngine.generateForServiceOrder(
        organizationId,
        id,
        'OS_FINALIZADA',
      );
      await this.appointments.completeByServiceOrder(id);

      const soForReminder = await this.prisma.serviceOrder.findFirst({
        where: { id },
        include: { vehicle: true },
      });
      if (soForReminder) {
        const hasIntervals =
          soForReminder.revisionIntervalKm ||
          soForReminder.revisionIntervalMonths ||
          soForReminder.oilChangeIntervalKm ||
          soForReminder.oilChangeIntervalMonths;
        if (hasIntervals) {
          const existing = await this.prisma.maintenanceReminder.count({
            where: { serviceOrderId: id },
          });
          if (existing === 0) {
            await this.maintenanceReminders.createFromServiceOrder(
              organizationId,
              soForReminder,
            );
          }
        }
      }
    }

    if (dto.status === 'CANCELLED' && current.status !== 'CANCELLED') {
      await this.commissionEngine.cancelForServiceOrder(organizationId, id);
      await this.releaseReservedStockForOrder(organizationId, id);
    }

    if (dto.entryKm !== undefined && dto.entryKm != null) {
      await this.prisma.vehicle.update({
        where: { id: current.vehicleId },
        data: { currentKm: dto.entryKm },
      });
    }

    const teamTouched =
      dto.generalResponsibleId !== undefined ||
      dto.checklistById !== undefined ||
      dto.diagnosisById !== undefined ||
      dto.quoteById !== undefined ||
      dto.executionById !== undefined ||
      dto.coExecutionById !== undefined ||
      dto.finalizedById !== undefined;
    if (teamTouched) {
      await this.maybeRegenerateCommissions(organizationId, id, updated.status);
    }

    return updated;
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
    await this.appointments.cancelByServiceOrder(id);
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
    const outsourcedServiceId: string | null = dto.outsourcedServiceId ?? null;
    let outsourcedUnitCost: number | null = null;
    const isQuickPart = dto.isQuickPart === true;

    if (isQuickPart) {
      if (dto.productId) {
        throw new BadRequestException('Peça rápida não pode estar vinculada a um produto do estoque');
      }
      itemType = 'PART';
      if (!description) {
        throw new BadRequestException('Informe a descrição da peça rápida');
      }
    }

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

    if (outsourcedServiceId) {
      const outsourced = await this.prisma.outsourcedService.findFirst({
        where: { id: outsourcedServiceId, organizationId, isActive: true },
      });
      if (!outsourced) throw new NotFoundException('Serviço terceirizado não encontrado');
      description = description || outsourced.name;
      unitPrice = unitPrice ?? Number(outsourced.salePrice);
      itemType = 'THIRD_PARTY';
      outsourcedUnitCost =
        dto.unitCost != null && dto.unitCost >= 0
          ? dto.unitCost
          : Number(outsourced.costPrice) || 0;
    }

    const executorId =
      dto.executorId ?? (itemType === 'SERVICE' ? so.executionById : null);
    const coExecutorId =
      dto.coExecutorId ?? (itemType === 'SERVICE' ? null : null);
    const coExecutorSplitPct =
      coExecutorId != null ? (dto.coExecutorSplitPct ?? 50) : null;
    if (executorId && coExecutorId && executorId === coExecutorId) {
      throw new BadRequestException(
        'O co-executor não pode ser o mesmo que o executor principal',
      );
    }
    const expectedCommission = await this.previewItemCommission(organizationId, {
      itemType,
      quantity: qty,
      unitPrice: Number(unitPrice),
      discount: dto.discount ?? 0,
      catalogItemId,
      productId: dto.productId ?? null,
      executorId,
      coExecutorId,
      coExecutorSplitPct,
      soldById: dto.soldById ?? null,
      executionById: so.executionById,
    });

    if (dto.productId) {
      const product = await this.prisma.product.findFirst({
        where: { id: dto.productId, organizationId, ...notDeleted },
      });
      if (!product) throw new NotFoundException('Produto não encontrado');

      const snapshotCost =
        dto.unitCost != null && dto.unitCost >= 0
          ? dto.unitCost
          : Number(product.averageCost) || Number(product.costPrice) || 0;
      const inQuotePhase = QUOTE_PHASE_STATUSES.includes(so.status as ServiceOrderStatus);
      const skipStock = this.products.shouldSkipStockForProduct(product);

      if (itemType === 'PART' && inQuotePhase && !skipStock) {
        const available = this.stockMovement.availableStock(
          product.stock,
          product.reservedStock,
        );
        if (available < qty) {
          throw new BadRequestException(
            `Estoque insuficiente. Disponível: ${available}, solicitado: ${qty}`,
          );
        }
        await this.prisma.product.update({
          where: { id: dto.productId },
          data: { reservedStock: product.reservedStock + qty },
        });
      }

      if (itemType === 'PART' && !inQuotePhase && !skipStock) {
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

      if (itemType === 'PART') {
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
            unitCost: snapshotCost > 0 ? new Prisma.Decimal(snapshotCost) : null,
            discount: dto.discount ?? 0,
            executorId,
            soldById: dto.soldById ?? null,
            appliedById: dto.appliedById ?? null,
            separatedById: dto.separatedById ?? null,
            expectedCommission,
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
    }

    if (isQuickPart) {
      const quickPartCode =
        dto.quickPartCode?.trim() ||
        (await this.products.generateQuickPartCode(organizationId));
      const snapshotCost =
        dto.unitCost != null && dto.unitCost >= 0 ? dto.unitCost : 0;

      await this.prisma.serviceOrderItem.create({
        data: {
          organizationId,
          serviceOrderId: so.id,
          description,
          itemType: 'PART',
          quantity: qty,
          unitPrice,
          unitCost: snapshotCost > 0 ? new Prisma.Decimal(snapshotCost) : null,
          discount: dto.discount ?? 0,
          executorId,
          soldById: dto.soldById ?? null,
          appliedById: dto.appliedById ?? null,
          separatedById: dto.separatedById ?? null,
          expectedCommission,
          isQuickPart: true,
          quickPartCode,
          partBrand: dto.partBrand?.trim() || null,
          suggestedSupplierId: dto.suggestedSupplierId ?? null,
          internalNotes: dto.internalNotes?.trim() || null,
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

    await this.prisma.serviceOrderItem.create({
      data: {
        organizationId,
        serviceOrderId: so.id,
        productId: dto.productId ?? null,
        catalogItemId,
        outsourcedServiceId,
        description,
        itemType,
        quantity: qty,
        unitPrice,
        unitCost:
          outsourcedUnitCost != null && outsourcedUnitCost > 0
            ? new Prisma.Decimal(outsourcedUnitCost)
            : null,
        discount: dto.discount ?? 0,
        executorId,
        coExecutorId: itemType === 'SERVICE' ? coExecutorId : null,
        coExecutorSplitPct: itemType === 'SERVICE' ? coExecutorSplitPct : null,
        soldById: dto.soldById ?? null,
        appliedById: dto.appliedById ?? null,
        separatedById: dto.separatedById ?? null,
        expectedCommission,
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

  async updateItem(
    organizationId: string,
    serviceOrderId: string,
    itemId: string,
    dto: UpdateServiceOrderItemDto,
    userId?: string,
  ) {
    const item = await this.prisma.serviceOrderItem.findFirst({
      where: { id: itemId, serviceOrderId, organizationId },
    });
    if (!item) throw new NotFoundException('Item não encontrado');

    const commerciallyLocked = await this.isItemCommerciallyLocked(
      organizationId,
      item.id,
      item.commercialLockedAt,
    );
    if (commerciallyLocked) {
      const commercialTouched =
        dto.description !== undefined ||
        dto.quantity !== undefined ||
        dto.unitPrice !== undefined ||
        dto.discount !== undefined ||
        dto.itemType !== undefined ||
        dto.unitCost !== undefined ||
        dto.outsourcedServiceId !== undefined;
      if (commercialTouched) {
        throw new BadRequestException(
          'Item com valor aprovado pelo cliente. Use "Ajustar custo interno" para alterar custos operacionais.',
        );
      }
    }

    const so = (await this.findOne(organizationId, serviceOrderId))!;
    const totalBefore = Number(so.totalAmount);
    const inQuotePhase = QUOTE_PHASE_STATUSES.includes(so.status as ServiceOrderStatus);

    if (
      inQuotePhase &&
      item.productId &&
      item.itemType === 'PART' &&
      dto.quantity !== undefined &&
      dto.quantity !== item.quantity
    ) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (product && !this.products.shouldSkipStockForProduct(product)) {
        const delta = dto.quantity - item.quantity;
        if (delta > 0) {
          const available = this.stockMovement.availableStock(
            product.stock,
            product.reservedStock,
          );
          if (available < delta) {
            throw new BadRequestException(
              `Estoque insuficiente. Disponível: ${available}, solicitado: ${delta}`,
            );
          }
        }
        await this.prisma.product.update({
          where: { id: item.productId },
          data: {
            reservedStock: Math.max(0, product.reservedStock + delta),
          },
        });
      }
    }

    if (
      !inQuotePhase &&
      item.productId &&
      item.itemType === 'PART' &&
      dto.quantity !== undefined &&
      dto.quantity !== item.quantity
    ) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (product && this.products.shouldSkipStockForProduct(product)) {
        // provisório — sem baixa física automática
      } else if (product) {
        const delta = dto.quantity - item.quantity;
        if (delta > 0) {
          const available = this.stockMovement.availableStock(
            product.stock,
            product.reservedStock,
          );
          if (available < delta) {
            throw new BadRequestException(
              `Estoque insuficiente. Disponível: ${available}, solicitado: ${delta}`,
            );
          }
        }
        const nextStock = product.stock - delta;
        await this.prisma.product.update({
          where: { id: item.productId },
          data: { stock: nextStock },
        });
        await this.stockMovement.record(
          organizationId,
          item.productId,
          delta > 0 ? 'OUT_OS' : 'RETURN',
          Math.abs(delta),
          nextStock,
          {
            serviceOrderId,
            reason:
              delta > 0
                ? `Ajuste OS #${so.number} — aumento de quantidade`
                : `Ajuste OS #${so.number} — redução de quantidade`,
          },
        );
      }
    }

    const nextQty = dto.quantity ?? item.quantity;
    const nextDiscount = dto.discount !== undefined ? dto.discount : Number(item.discount ?? 0);
    const nextExecutorId =
      dto.executorId !== undefined ? dto.executorId : item.executorId;
    const nextCoExecutorId =
      dto.coExecutorId !== undefined ? dto.coExecutorId : item.coExecutorId;
    const nextCoExecutorSplitPct =
      dto.coExecutorSplitPct !== undefined
        ? dto.coExecutorSplitPct
        : item.coExecutorSplitPct;
    const effectiveCoExecutorId = nextCoExecutorId || null;
    const effectiveCoSplit =
      effectiveCoExecutorId != null ? (nextCoExecutorSplitPct ?? 50) : null;
    const effectiveExecutorId = nextExecutorId ?? so.executionById;
    if (
      effectiveExecutorId &&
      effectiveCoExecutorId &&
      effectiveExecutorId === effectiveCoExecutorId
    ) {
      throw new BadRequestException(
        'O co-executor não pode ser o mesmo que o executor principal',
      );
    }
    const nextSoldById = dto.soldById !== undefined ? dto.soldById : item.soldById;
    let itemType = dto.itemType ?? item.itemType;
    let nextDescription = dto.description !== undefined ? dto.description.trim() : item.description;
    let nextUnitPrice = dto.unitPrice !== undefined ? dto.unitPrice : Number(item.unitPrice);
    let nextOutsourcedServiceId = item.outsourcedServiceId;
    let nextUnitCost: Prisma.Decimal | null = item.unitCost;

    if (dto.unitCost !== undefined) {
      nextUnitCost =
        dto.unitCost != null && dto.unitCost >= 0
          ? new Prisma.Decimal(dto.unitCost)
          : null;
    }

    if (dto.outsourcedServiceId !== undefined) {
      if (!dto.outsourcedServiceId) {
        nextOutsourcedServiceId = null;
        nextUnitCost = null;
      } else {
        const outsourced = await this.prisma.outsourcedService.findFirst({
          where: { id: dto.outsourcedServiceId, organizationId, isActive: true },
        });
        if (!outsourced) throw new NotFoundException('Serviço terceirizado não encontrado');
        nextOutsourcedServiceId = outsourced.id;
        itemType = 'THIRD_PARTY';
        if (dto.unitCost === undefined) {
          nextUnitCost = new Prisma.Decimal(Number(outsourced.costPrice) || 0);
        }
        if (dto.description === undefined) nextDescription = outsourced.name;
        if (dto.unitPrice === undefined) nextUnitPrice = Number(outsourced.salePrice);
      }
    }

    if (dto.itemType !== undefined && dto.itemType !== 'THIRD_PARTY' && item.outsourcedServiceId) {
      nextOutsourcedServiceId = null;
      nextUnitCost = null;
    }

    const expectedCommission = await this.previewItemCommission(organizationId, {
      itemType,
      quantity: nextQty,
      unitPrice: nextUnitPrice,
      discount: nextDiscount,
      catalogItemId: item.catalogItemId,
      productId: item.productId,
      executorId: nextExecutorId,
      coExecutorId: effectiveCoExecutorId,
      coExecutorSplitPct: effectiveCoSplit,
      soldById: nextSoldById,
      executionById: so.executionById,
    });

    const outsourcedTouched =
      dto.outsourcedServiceId !== undefined ||
      (dto.itemType !== undefined && dto.itemType !== 'THIRD_PARTY' && !!item.outsourcedServiceId);

    await this.prisma.serviceOrderItem.update({
      where: { id: itemId },
      data: {
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : dto.outsourcedServiceId !== undefined
            ? { description: nextDescription }
            : {}),
        ...(dto.itemType !== undefined || dto.outsourcedServiceId !== undefined
          ? { itemType }
          : {}),
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        ...(dto.unitPrice !== undefined
          ? { unitPrice: dto.unitPrice }
          : dto.outsourcedServiceId !== undefined
            ? { unitPrice: nextUnitPrice }
            : {}),
        ...(dto.unitCost !== undefined || outsourcedTouched
          ? {
              unitCost:
                nextUnitCost != null && Number(nextUnitCost) > 0 ? nextUnitCost : null,
            }
          : {}),
        ...(dto.discount !== undefined ? { discount: dto.discount } : {}),
        ...(dto.executorId !== undefined ? { executorId: dto.executorId } : {}),
        ...(dto.coExecutorId !== undefined
          ? {
              coExecutorId: dto.coExecutorId || null,
              coExecutorSplitPct: dto.coExecutorId ? (dto.coExecutorSplitPct ?? 50) : null,
            }
          : {}),
        ...(dto.coExecutorSplitPct !== undefined && (nextCoExecutorId || item.coExecutorId)
          ? { coExecutorSplitPct: dto.coExecutorSplitPct }
          : {}),
        ...(dto.soldById !== undefined ? { soldById: dto.soldById } : {}),
        ...(dto.appliedById !== undefined ? { appliedById: dto.appliedById } : {}),
        ...(dto.separatedById !== undefined ? { separatedById: dto.separatedById } : {}),
        ...(outsourcedTouched ? { outsourcedServiceId: nextOutsourcedServiceId } : {}),
        expectedCommission,
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
          item: dto.description ?? item.description,
        },
      });
    }
    const teamItemTouched =
      dto.executorId !== undefined ||
      dto.coExecutorId !== undefined ||
      dto.coExecutorSplitPct !== undefined ||
      dto.soldById !== undefined ||
      dto.appliedById !== undefined;
    if (teamItemTouched) {
      await this.maybeRegenerateCommissions(
        organizationId,
        serviceOrderId,
        refreshed.status,
      );
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
    const inQuotePhase = QUOTE_PHASE_STATUSES.includes(so.status as ServiceOrderStatus);

    if (item.productId && item.itemType === 'PART' && inQuotePhase) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (product) {
        await this.prisma.product.update({
          where: { id: item.productId },
          data: {
            reservedStock: Math.max(0, product.reservedStock - item.quantity),
          },
        });
      }
    }

    if (item.productId && item.itemType === 'PART' && !inQuotePhase) {
      const alreadyDeducted = await this.hasStockDeductionForPart(
        organizationId,
        serviceOrderId,
        item.productId,
      );
      if (alreadyDeducted) {
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

  /** Libera reserva de estoque das peças ainda não baixadas fisicamente. */
  private async releaseReservedStockForOrder(
    organizationId: string,
    serviceOrderId: string,
  ) {
    const items = await this.prisma.serviceOrderItem.findMany({
      where: {
        serviceOrderId,
        organizationId,
        itemType: 'PART',
        productId: { not: null },
      },
    });
    for (const item of items) {
      if (!item.productId) continue;
      const deducted = await this.hasStockDeductionForPart(
        organizationId,
        serviceOrderId,
        item.productId,
      );
      if (deducted) continue;
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product) continue;
      await this.prisma.product.update({
        where: { id: item.productId },
        data: {
          reservedStock: Math.max(0, product.reservedStock - item.quantity),
        },
      });
    }
  }

  private async hasStockDeductionForPart(
    organizationId: string,
    serviceOrderId: string,
    productId: string,
  ) {
    const movement = await this.prisma.stockMovement.findFirst({
      where: {
        organizationId,
        productId,
        serviceOrderId,
        movementType: 'OUT_OS',
      },
    });
    return movement != null;
  }

  /** Baixa estoque das peças da OS ao entrar em execução (após fase de orçamento). */
  async deductPartsStockForExecution(organizationId: string, serviceOrderId: string) {
    const so = await this.findOne(organizationId, serviceOrderId);
    if (!so) throw new NotFoundException('Ordem de serviço não encontrada');

    const partItems = so.items.filter(
      (item) => item.itemType === 'PART' && item.productId,
    );

    for (const item of partItems) {
      const productId = item.productId!;
      const product = await this.prisma.product.findFirst({
        where: { id: productId, organizationId, ...notDeleted },
      });
      if (!product) continue;
      if (this.products.shouldSkipStockForProduct(product)) continue;

      const alreadyDeducted = await this.hasStockDeductionForPart(
        organizationId,
        serviceOrderId,
        productId,
      );
      if (alreadyDeducted) continue;

      const available = this.stockMovement.availableStock(
        product.stock,
        product.reservedStock,
      );
      if (available < item.quantity) {
        throw new BadRequestException(
          `Estoque insuficiente para "${item.description}". Disponível: ${available}, necessário: ${item.quantity}`,
        );
      }

      const nextStock = product.stock - item.quantity;
      const nextReserved = Math.max(0, product.reservedStock - item.quantity);
      await this.prisma.product.update({
        where: { id: productId },
        data: { stock: nextStock, reservedStock: nextReserved },
      });
      await this.stockMovement.record(
        organizationId,
        productId,
        'OUT_OS',
        item.quantity,
        nextStock,
        { serviceOrderId: so.id, reason: `Saída OS #${so.number} — início da execução` },
      );
      await this.prisma.serviceOrderItem.update({
        where: { id: item.id },
        data: { stockDeductedAt: new Date() },
      });
    }
  }

  async lockCommercialItems(organizationId: string, quoteId: string) {
    const approvedLines = await this.prisma.quoteLine.findMany({
      where: { quoteId, approved: true, serviceOrderItemId: { not: null } },
    });
    const now = new Date();
    for (const line of approvedLines) {
      if (!line.serviceOrderItemId) continue;
      await this.prisma.serviceOrderItem.updateMany({
        where: { id: line.serviceOrderItemId, organizationId },
        data: { commercialLockedAt: now },
      });
    }
  }

  async postQuoteApprovalHooks(
    organizationId: string,
    serviceOrderId: string,
    quoteId: string,
    userId?: string,
  ) {
    await this.lockCommercialItems(organizationId, quoteId);
    await this.products.provisionQuickPartsOnApproval(
      organizationId,
      serviceOrderId,
      quoteId,
    );
    await this.deductPartsStockForExecution(organizationId, serviceOrderId);
    if (userId) {
      await this.audit.log(organizationId, 'quote.post_approval_hooks', 'service_order', {
        userId,
        metadata: { serviceOrderId, quoteId },
      });
    }
  }

  private async isItemCommerciallyLocked(
    organizationId: string,
    itemId: string,
    commercialLockedAt: Date | null,
  ) {
    if (commercialLockedAt) return true;
    const approvedLine = await this.prisma.quoteLine.findFirst({
      where: { organizationId, serviceOrderItemId: itemId, approved: true },
    });
    return approvedLine != null;
  }

  async updateInternalCost(
    organizationId: string,
    serviceOrderId: string,
    itemId: string,
    dto: UpdateInternalCostDto,
    userId?: string,
  ) {
    const item = await this.prisma.serviceOrderItem.findFirst({
      where: { id: itemId, serviceOrderId, organizationId },
    });
    if (!item) throw new NotFoundException('Item não encontrado');
    if (item.itemType !== 'PART' && item.itemType !== 'THIRD_PARTY') {
      throw new BadRequestException('Ajuste de custo interno disponível apenas para peças e terceirizados');
    }

    const historyRows: Prisma.ServiceOrderItemCostHistoryCreateManyInput[] = [];
    const note = dto.note?.trim() || null;

    const track = (
      field: ServiceOrderItemCostField,
      oldVal: string | null,
      newVal: string | null,
    ) => {
      if (oldVal === newVal) return;
      historyRows.push({
        organizationId,
        serviceOrderItemId: itemId,
        userId: userId ?? null,
        field,
        oldValue: oldVal,
        newValue: newVal,
        note,
      });
    };

    const oldCost =
      item.actualUnitCost != null
        ? String(item.actualUnitCost)
        : item.unitCost != null
          ? String(item.unitCost)
          : null;
    const newCost =
      dto.actualUnitCost !== undefined
        ? dto.actualUnitCost != null
          ? String(dto.actualUnitCost)
          : null
        : oldCost;
    if (dto.actualUnitCost !== undefined) {
      track('ACTUAL_UNIT_COST', oldCost, newCost);
    }

    if (dto.actualBrand !== undefined) {
      track('ACTUAL_BRAND', item.actualBrand, dto.actualBrand?.trim() || null);
    }
    if (dto.actualSupplierId !== undefined) {
      track(
        'ACTUAL_SUPPLIER',
        item.actualSupplierId,
        dto.actualSupplierId || null,
      );
    }
    if (dto.purchaseOrderItemId !== undefined) {
      track(
        'PURCHASE_ORDER_ITEM',
        item.purchaseOrderItemId,
        dto.purchaseOrderItemId || null,
      );
    }
    if (dto.purchaseDate !== undefined) {
      track(
        'PURCHASE_DATE',
        item.purchaseDate?.toISOString() ?? null,
        dto.purchaseDate || null,
      );
    }
    if (dto.purchasePaymentMethod !== undefined) {
      track(
        'PURCHASE_PAYMENT_METHOD',
        item.purchasePaymentMethod,
        dto.purchasePaymentMethod?.trim() || null,
      );
    }
    if (dto.internalNotes !== undefined) {
      track(
        'INTERNAL_NOTES',
        item.internalNotes,
        dto.internalNotes?.trim() || null,
      );
    }

    await this.prisma.serviceOrderItem.update({
      where: { id: itemId },
      data: {
        ...(dto.actualUnitCost !== undefined
          ? {
              actualUnitCost:
                dto.actualUnitCost != null && dto.actualUnitCost >= 0
                  ? new Prisma.Decimal(dto.actualUnitCost)
                  : null,
            }
          : {}),
        ...(dto.actualBrand !== undefined
          ? { actualBrand: dto.actualBrand?.trim() || null }
          : {}),
        ...(dto.actualSupplierId !== undefined
          ? { actualSupplierId: dto.actualSupplierId || null }
          : {}),
        ...(dto.purchaseOrderItemId !== undefined
          ? { purchaseOrderItemId: dto.purchaseOrderItemId || null }
          : {}),
        ...(dto.purchaseDate !== undefined
          ? {
              purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
            }
          : {}),
        ...(dto.purchasePaymentMethod !== undefined
          ? {
              purchasePaymentMethod: dto.purchasePaymentMethod?.trim() || null,
            }
          : {}),
        ...(dto.internalNotes !== undefined
          ? { internalNotes: dto.internalNotes?.trim() || null }
          : {}),
      },
    });

    if (historyRows.length) {
      await this.prisma.serviceOrderItemCostHistory.createMany({ data: historyRows });
      await this.audit.log(organizationId, 'service_order.item_internal_cost', 'service_order', {
        userId,
        metadata: {
          serviceOrderId,
          itemId,
          description: item.description,
          changes: historyRows.length,
        },
      });
    }

    return this.findOne(organizationId, serviceOrderId);
  }

  private async recalculateTotal(serviceOrderId: string) {
    const so = await this.prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      include: {
        quotes: {
          where: { status: 'APPROVED', deletedAt: null },
          include: { lines: true },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!so) return;

    const approvedQuote = so.quotes[0];
    if (approvedQuote?.lines.some((l) => l.approved === true)) {
      const total = approvedQuote.lines
        .filter((l) => l.approved === true)
        .reduce(
          (sum, l) =>
            sum + Math.max(0, Number(l.unitPrice) * l.quantity - Number(l.discount ?? 0)),
          0,
        );
      await this.prisma.serviceOrder.update({
        where: { id: serviceOrderId },
        data: { totalAmount: new Prisma.Decimal(total) },
      });
      return;
    }

    const items = await this.prisma.serviceOrderItem.findMany({
      where: { serviceOrderId },
    });
    const total = items.reduce(
      (sum, i) =>
        sum + Math.max(0, Number(i.unitPrice) * i.quantity - Number(i.discount ?? 0)),
      0,
    );
    await this.prisma.serviceOrder.update({
      where: { id: serviceOrderId },
      data: { totalAmount: new Prisma.Decimal(total) },
    });
  }
}
