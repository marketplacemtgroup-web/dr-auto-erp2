import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ServiceOrderStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QuotesSyncService } from './quotes-sync.service';
import { EventsService } from '../events/events.service';
import { notDeleted } from '../common/soft-delete';
import { CAR_CHECKLIST_TEMPLATE } from '../service-orders/checklist-template';

const quoteInclude = {
  serviceOrder: {
    include: {
      vehicle: { include: { customer: true } },
      items: { orderBy: { createdAt: 'asc' as const } },
    },
  },
  lines: { orderBy: { sortOrder: 'asc' as const } },
  accessTokens: { orderBy: { createdAt: 'desc' as const }, take: 3 },
};

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotesSync: QuotesSyncService,
    private readonly events: EventsService,
  ) {}

  private async nextServiceOrderNumber(organizationId: string) {
    const last = await this.prisma.serviceOrder.findFirst({
      where: { organizationId },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    return (last?.number ?? 1000) + 1;
  }

  private async nextQuoteNumber(organizationId: string) {
    const last = await this.prisma.quote.findFirst({
      where: { organizationId, number: { not: null } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    return (last?.number ?? 1000) + 1;
  }

  private async findPendingQuoteForVehicle(organizationId: string, vehicleId: string) {
    return this.prisma.quote.findFirst({
      where: {
        organizationId,
        status: 'PENDING',
        ...notDeleted,
        serviceOrder: {
          vehicleId,
          status: { in: ['AWAITING_APPROVAL', 'AWAITING_QUOTE'] },
          ...notDeleted,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async createQuoteForVehicle(
    organizationId: string,
    vehicleId: string,
    opts: { complaint?: string; status?: string; amount?: number },
  ) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, organizationId, ...notDeleted },
    });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');

    const existing = await this.findPendingQuoteForVehicle(organizationId, vehicleId);
    if (existing) {
      return this.findOne(organizationId, existing.id);
    }

    const status = opts.status ?? 'PENDING';
    const branch = await this.prisma.branch.findFirst({
      where: { organizationId, isMain: true },
    });

    const osNumber = await this.nextServiceOrderNumber(organizationId);
    const quoteNumber = await this.nextQuoteNumber(organizationId);
    const amount = opts.amount ?? 0;

  // Sem $transaction interativo — compatível com Supabase pooler (PgBouncer).
    const so = await this.prisma.serviceOrder.create({
      data: {
        organizationId,
        vehicleId,
        branchId: branch?.id,
        number: osNumber,
        status: ServiceOrderStatus.AWAITING_APPROVAL,
        enteredAt: new Date(),
        complaint: opts.complaint?.trim() || null,
        totalAmount: new Prisma.Decimal(amount),
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
            toStatus: ServiceOrderStatus.AWAITING_APPROVAL,
            notes: 'OS aberta a partir do orçamento',
          },
        },
      },
    });

    let quote;
    try {
      quote = await this.prisma.quote.create({
        data: {
          organizationId,
          serviceOrderId: so.id,
          number: quoteNumber,
          amount: new Prisma.Decimal(amount),
          status: status as never,
        },
        include: quoteInclude,
      });
    } catch (err) {
      await this.prisma.serviceOrder.delete({ where: { id: so.id } }).catch(() => undefined);
      throw err;
    }

    if (status === 'PENDING') {
      await this.quotesSync.syncForServiceOrder(organizationId, quote.serviceOrderId);
      return this.findOne(organizationId, quote.id);
    }
    return quote;
  }

  async create(organizationId: string, dto: CreateQuoteDto) {
    if (!dto.serviceOrderId && !dto.vehicleId) {
      throw new BadRequestException('Informe o veículo ou a ordem de serviço');
    }

    if (dto.vehicleId) {
      return this.createQuoteForVehicle(organizationId, dto.vehicleId, {
        complaint: dto.complaint,
        status: dto.status,
        amount: dto.amount,
      });
    }

    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: dto.serviceOrderId!, organizationId },
    });
    if (!so) throw new NotFoundException('Ordem de serviço não encontrada');

    const status = dto.status ?? 'PENDING';
    const amount = dto.amount ?? Number(so.totalAmount);

    const quoteNumber = await this.nextQuoteNumber(organizationId);
    const quote = await this.prisma.quote.create({
      data: {
        organizationId,
        serviceOrderId: dto.serviceOrderId!,
        number: quoteNumber,
        amount: new Prisma.Decimal(amount),
        status,
      },
      include: quoteInclude,
    });

    if (status === 'PENDING') {
      await this.prisma.serviceOrder.update({
        where: { id: dto.serviceOrderId! },
        data: { status: 'AWAITING_APPROVAL' },
      });
      await this.quotesSync.syncForServiceOrder(organizationId, dto.serviceOrderId!);
      return this.findOne(organizationId, quote.id);
    }

    return quote;
  }

  list(
    organizationId: string,
    search?: string,
    status?: string,
    includeApproved = false,
  ) {
    return this.prisma.quote.findMany({
      where: {
        organizationId,
        ...notDeleted,
        ...(status
          ? { status: status as never }
          : includeApproved
            ? {}
            : { status: { not: 'APPROVED' as never } }),
        ...(search
          ? {
              OR: [
                {
                  serviceOrder: {
                    vehicle: { plate: { contains: search, mode: 'insensitive' } },
                  },
                },
                {
                  serviceOrder: {
                    vehicle: {
                      customer: { name: { contains: search, mode: 'insensitive' } },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: quoteInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const row = await this.prisma.quote.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: quoteInclude,
    });
    if (!row) throw new NotFoundException('Orçamento não encontrado');
    return row;
  }

  async approveFromOffice(organizationId: string, quoteId: string, userId?: string) {
    const quote = await this.findOne(organizationId, quoteId);
    if (quote.status === 'APPROVED') return quote;

    await this.prisma.quoteLine.updateMany({
      where: { quoteId },
      data: { approved: true },
    });

    const amount = Number(quote.amount);
    const [updated] = await this.prisma.$transaction([
      this.prisma.quote.update({
        where: { id: quoteId },
        data: { status: 'APPROVED' },
      }),
      this.prisma.serviceOrder.update({
        where: { id: quote.serviceOrderId },
        data: {
          status: 'IN_PROGRESS',
          totalAmount: new Prisma.Decimal(amount),
        },
      }),
      this.prisma.serviceOrderStatusHistory.create({
        data: {
          organizationId,
          serviceOrderId: quote.serviceOrderId,
          fromStatus: quote.serviceOrder.status,
          toStatus: 'IN_PROGRESS',
          userId: userId ?? null,
          notes: 'Orçamento aprovado manualmente pela oficina — OS liberada',
        },
      }),
    ]);

    await this.events.emitOffice(organizationId, {
      type: 'quote.approved',
      title: 'Orçamento aprovado',
      message: `OS #${quote.serviceOrder.number} — aprovado pela oficina`,
      metadata: {
        quoteId,
        serviceOrderId: quote.serviceOrderId,
        serviceOrderNumber: quote.serviceOrder.number,
      },
      vehicleId: quote.serviceOrder.vehicleId,
    });

    return this.findOne(organizationId, updated.id);
  }

  async rejectFromOffice(organizationId: string, quoteId: string, userId?: string) {
    const quote = await this.findOne(organizationId, quoteId);
    if (quote.status === 'REJECTED') return quote;

    const [updated] = await this.prisma.$transaction([
      this.prisma.quote.update({
        where: { id: quoteId },
        data: { status: 'REJECTED' },
      }),
      this.prisma.serviceOrder.update({
        where: { id: quote.serviceOrderId },
        data: { status: 'AWAITING_QUOTE' },
      }),
      this.prisma.serviceOrderStatusHistory.create({
        data: {
          organizationId,
          serviceOrderId: quote.serviceOrderId,
          fromStatus: quote.serviceOrder.status,
          toStatus: 'AWAITING_QUOTE',
          userId: userId ?? null,
          notes: 'Orçamento recusado manualmente pela oficina',
        },
      }),
    ]);

    await this.events.emitOffice(organizationId, {
      type: 'quote.rejected',
      title: 'Orçamento recusado',
      message: `OS #${quote.serviceOrder.number} — recusado pela oficina`,
      metadata: {
        quoteId,
        serviceOrderId: quote.serviceOrderId,
        serviceOrderNumber: quote.serviceOrder.number,
      },
      vehicleId: quote.serviceOrder.vehicleId,
    });

    return this.findOne(organizationId, updated.id);
  }

  async update(organizationId: string, id: string, dto: UpdateQuoteDto) {
    const existing = await this.findOne(organizationId, id);
    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.terms !== undefined ? { terms: dto.terms || null } : {}),
        ...(dto.paymentAgreement !== undefined
          ? { paymentAgreement: dto.paymentAgreement || null }
          : {}),
        ...(dto.validUntil !== undefined
          ? { validUntil: dto.validUntil ? new Date(dto.validUntil) : null }
          : {}),
      },
      include: quoteInclude,
    });
    if (dto.status === 'PENDING' || updated.status === 'PENDING') {
      await this.quotesSync.syncForServiceOrder(organizationId, existing.serviceOrderId);
      return this.findOne(organizationId, id);
    }
    return updated;
  }

  async createShareLink(organizationId: string, quoteId: string, daysValid = 30) {
    const quote = await this.findOne(organizationId, quoteId);
    if (quote.status !== 'PENDING') {
      throw new NotFoundException('Somente orçamentos pendentes podem receber link');
    }

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysValid);

    await this.prisma.quoteAccessToken.create({
      data: {
        organizationId,
        quoteId,
        token,
        expiresAt,
      },
    });

    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: quote.serviceOrderId },
      include: { vehicle: { include: { customer: true } } },
    });

    if (so) {
      await this.events.emitOffice(organizationId, {
        type: 'quote.sent',
        title: 'Orçamento disponível para o cliente',
        message: `OS #${so.number} — link gerado`,
        metadata: { quoteId, serviceOrderId: so.id, serviceOrderNumber: so.number },
        vehicleId: so.vehicleId,
        pushTitle: 'Novo orçamento',
        pushBody: `Confira o orçamento da OS #${so.number}`,
        pushUrl: `/orcamento/${token}`,
        portalNotificationType: 'orcamento',
        serviceOrderId: so.id,
        quoteId,
      });
    }

    const customerName = so?.vehicle.customer.name ?? null;
    const plate = so?.vehicle.plate ?? null;
    const quoteNum = quote.number ? `#${quote.number}` : '';

    return {
      token,
      expiresAt,
      path: `/orcamento/${token}`,
      whatsappMessage: customerName
        ? `Olá, ${customerName}! Segue o orçamento${quoteNum}${plate ? ` do veículo ${plate}` : ''} da oficina: {url}\n\nAbra o link para ver os itens, aprovar ou salvar em PDF.`
        : `Segue o orçamento${quoteNum} da oficina: {url}\n\nAbra o link para ver os itens, aprovar ou salvar em PDF.`,
    };
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.quote.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }
}
