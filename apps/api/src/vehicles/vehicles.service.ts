import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ServiceOrderStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListQueryInput, paginatedResponse, parseListQuery } from '../common/pagination';
import { notDeleted } from '../common/soft-delete';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { TransferVehicleDto } from './dto/transfer-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

const finishedStatuses: ServiceOrderStatus[] = ['FINISHED', 'DELIVERED'];

/** OS abertas: RECEIVED…AWAITING_PAYMENT (sem FINISHED/DELIVERED/CANCELLED). */
const OPEN_ORDER_STATUSES: ServiceOrderStatus[] = [
  'RECEIVED',
  'DIAGNOSIS',
  'AWAITING_QUOTE',
  'AWAITING_APPROVAL',
  'APPROVED',
  'IN_PROGRESS',
  'AWAITING_PART',
  'AWAITING_PAYMENT',
];

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(organizationId: string, dto: CreateVehicleDto) {
    const plate = dto.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (plate.length !== 7) {
      throw new BadRequestException('Placa deve ter 7 caracteres (ex.: ABC1D23)');
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, organizationId, ...notDeleted },
    });
    if (!customer) {
      throw new BadRequestException('Cliente não encontrado. Selecione um cliente válido.');
    }

    const existing = await this.prisma.vehicle.findFirst({
      where: { organizationId, plate, ...notDeleted },
    });
    if (existing) throw new ConflictException('Placa já cadastrada');

    return this.prisma.vehicle.create({
      data: {
        organizationId,
        customerId: dto.customerId,
        plate,
        brand: dto.brand ?? null,
        model: dto.model ?? null,
        year: dto.year ?? null,
        color: dto.color ?? null,
        vehicleKind: dto.vehicleKind ?? 'CAR',
        chassis: dto.chassis ?? null,
        renavam: dto.renavam ?? null,
        fuelType: dto.fuelType ?? null,
        currentKm: dto.currentKm ?? null,
        notes: dto.notes ?? null,
      },
      include: { customer: true },
    });
  }

  async list(organizationId: string, search?: string, query: ListQueryInput = {}) {
    const { page, limit, skip } = parseListQuery(query);
    const where: Prisma.VehicleWhereInput = {
      organizationId,
      ...notDeleted,
      ...(search
        ? {
            OR: [
              { plate: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
              { model: { contains: search, mode: 'insensitive' } },
              { customer: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.findMany({
        where,
        include: { customer: true },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);
    return paginatedResponse(rows, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: {
        customer: true,
        serviceOrders: {
          orderBy: { updatedAt: 'desc' },
          take: 50,
          include: {
            vehicle: {
              select: {
                plate: true,
                brand: true,
                model: true,
                customer: { select: { name: true } },
              },
            },
            quotes: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');

    const [quotes, attachments, timeline] = await Promise.all([
      this.prisma.quote.findMany({
        where: { organizationId, serviceOrder: { vehicleId: id } },
        include: { serviceOrder: { select: { number: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.attachment.findMany({
        where: {
          organizationId,
          entityType: 'VEHICLE',
          entityId: id,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.serviceOrderStatusHistory.findMany({
        where: {
          organizationId,
          serviceOrder: { vehicleId: id },
        },
        include: {
          serviceOrder: { select: { number: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    const orders = vehicle.serviceOrders;
    const finished = orders.filter((o) => finishedStatuses.includes(o.status));
    const totalSpent = finished.reduce((s, o) => s + Number(o.totalAmount), 0);
    const lastService = orders[0]?.updatedAt ?? null;
    const lastKm = orders.find((o) => o.entryKm != null)?.entryKm ?? vehicle.currentKm;

    const kpis = {
      orderCount: orders.length,
      totalSpent,
      lastService,
      lastKm,
      openOrders: orders.filter(
        (o) => !finishedStatuses.includes(o.status) && o.status !== 'CANCELLED',
      ).length,
      pendingQuotes: quotes.filter((q) => q.status === 'PENDING').length,
    };

    return {
      ...vehicle,
      kpis,
      quotes,
      attachments,
      timeline,
      serviceOrders: orders,
    };
  }

  async update(organizationId: string, id: string, dto: UpdateVehicleDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, organizationId, ...notDeleted },
      select: { id: true, customerId: true },
    });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');

    if (dto.customerId !== undefined && dto.customerId !== vehicle.customerId) {
      throw new BadRequestException(
        'Para alterar o cliente, use Transferir titularidade na ficha do veículo.',
      );
    }

    let plate: string | undefined;
    if (dto.plate) {
      plate = dto.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (plate.length !== 7) {
        throw new BadRequestException('Placa deve ter 7 caracteres (ex.: ABC1D23)');
      }
      const existing = await this.prisma.vehicle.findFirst({
        where: { organizationId, plate, ...notDeleted, NOT: { id } },
      });
      if (existing) throw new ConflictException('Placa já cadastrada');
    }
    return this.prisma.vehicle.update({
      where: { id },
      data: {
        ...(plate !== undefined ? { plate } : {}),
        ...(dto.brand !== undefined ? { brand: dto.brand || null } : {}),
        ...(dto.model !== undefined ? { model: dto.model || null } : {}),
        ...(dto.year !== undefined ? { year: dto.year ?? null } : {}),
        ...(dto.color !== undefined ? { color: dto.color || null } : {}),
        ...(dto.vehicleKind !== undefined ? { vehicleKind: dto.vehicleKind } : {}),
        ...(dto.chassis !== undefined ? { chassis: dto.chassis || null } : {}),
        ...(dto.renavam !== undefined ? { renavam: dto.renavam || null } : {}),
        ...(dto.fuelType !== undefined ? { fuelType: dto.fuelType || null } : {}),
        ...(dto.currentKm !== undefined ? { currentKm: dto.currentKm ?? null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
      },
      include: { customer: true },
    });
  }

  async transferOwnership(
    organizationId: string,
    id: string,
    dto: TransferVehicleDto,
    userId: string,
  ) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: { customer: { select: { id: true, name: true } } },
    });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');

    if (dto.customerId === vehicle.customerId) {
      throw new BadRequestException('O novo titular deve ser diferente do atual.');
    }

    const toCustomer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, organizationId, ...notDeleted },
      select: { id: true, name: true },
    });
    if (!toCustomer) {
      throw new BadRequestException('Cliente não encontrado. Selecione um cliente válido.');
    }

    const openOrders = await this.prisma.serviceOrder.count({
      where: {
        organizationId,
        vehicleId: id,
        ...notDeleted,
        status: { in: OPEN_ORDER_STATUSES },
      },
    });

    const today = new Date();
    const dateLabel = today.toLocaleDateString('pt-BR');
    const reasonPart = dto.reason?.trim()
      ? ` Motivo: ${dto.reason.trim()}.`
      : '';
    const noteLine =
      `[${dateLabel}] Titularidade: ${vehicle.customer.name} → ${toCustomer.name}.${reasonPart} OS em andamento: ${openOrders}. Histórico permanece neste veículo.`;
    const notes = vehicle.notes ? `${vehicle.notes}\n${noteLine}` : noteLine;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.vehicle.update({
        where: { id },
        data: {
          customerId: toCustomer.id,
          notes,
        },
        include: { customer: true },
      });
      await tx.portalAccessToken.deleteMany({ where: { vehicleId: id } });
      return row;
    });

    await this.audit.log(organizationId, 'vehicle.transfer_ownership', 'vehicle', {
      userId,
      reason: dto.reason?.trim() || undefined,
      metadata: {
        vehicleId: id,
        plate: vehicle.plate,
        fromCustomerId: vehicle.customer.id,
        fromCustomerName: vehicle.customer.name,
        toCustomerId: toCustomer.id,
        toCustomerName: toCustomer.name,
        openOrders,
      },
    });

    return {
      ...updated,
      transfer: {
        fromCustomer: vehicle.customer,
        toCustomer,
        openOrders,
        portalTokensRevoked: true,
      },
    };
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.vehicle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }
}
