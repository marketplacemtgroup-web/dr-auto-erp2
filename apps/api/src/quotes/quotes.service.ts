import { BadRequestException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { Prisma, ServiceOrderStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { ApproveLinesDto } from './dto/approve-lines.dto';
import { QuotesSyncService } from './quotes-sync.service';
import { EventsService } from '../events/events.service';
import { PortalCustomerNotifyService } from '../events/portal-customer-notify.service';
import { notDeleted } from '../common/soft-delete';
import { CAR_CHECKLIST_TEMPLATE } from '../service-orders/checklist-template';
import { ServiceOrdersService } from '../service-orders/service-orders.service';

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
    private readonly portalNotify: PortalCustomerNotifyService,
    @Inject(forwardRef(() => ServiceOrdersService))
    private readonly serviceOrders: ServiceOrdersService,
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
      await this.portalNotify.notifyQuotePending(quote.id, 'new');
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
      await this.portalNotify.notifyQuotePending(quote.id, 'new');
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

  private lineTotal(line: {
    unitPrice: Prisma.Decimal;
    quantity: number;
    discount: Prisma.Decimal;
  }) {
    return Number(line.unitPrice) * line.quantity - Number(line.discount);
  }

  private approvedLinesAmount(lines: Array<{ unitPrice: Prisma.Decimal; quantity: number; discount: Prisma.Decimal; approved: boolean | null }>) {
    return lines
      .filter((l) => l.approved === true)
      .reduce((sum, l) => sum + this.lineTotal(l), 0);
  }

  async reopenForSupplement(organizationId: string, quoteId: string, userId?: string) {
    const quote = await this.findOne(organizationId, quoteId);
    if (quote.status !== 'APPROVED') {
      throw new BadRequestException('Somente orçamentos aprovados podem ser reabertos para complemento');
    }

    const allowed: ServiceOrderStatus[] = ['IN_PROGRESS', 'APPROVED', 'AWAITING_PART'];
    if (!allowed.includes(quote.serviceOrder.status)) {
      throw new BadRequestException(
        'Complemento não permitido para o status atual da ordem de serviço',
      );
    }

    const reopenedId = await this.quotesSync.reopenForSupplement(
      organizationId,
      quoteId,
      userId,
    );
    if (!reopenedId) {
      if (quote.serviceOrder.status === 'FINISHED' || quote.serviceOrder.status === 'DELIVERED' || quote.serviceOrder.status === 'CANCELLED') {
        throw new BadRequestException(
          'Complemento não permitido: a ordem de serviço já foi finalizada, entregue ou cancelada.',
        );
      }
      const otherPending = await this.prisma.quote.findFirst({
        where: { organizationId, serviceOrderId: quote.serviceOrderId, status: 'PENDING', id: { not: quoteId } },
      });
      if (otherPending) {
        throw new BadRequestException(
          'Já existe um orçamento pendente nesta OS. Use o orçamento aberto ou conclua a aprovação antes.',
        );
      }
      throw new BadRequestException(
        'Não foi possível reabrir o orçamento. Confira se ele está aprovado e a OS em andamento.',
      );
    }

    await this.quotesSync.syncQuoteLines(
      reopenedId,
      quote.serviceOrderId,
      organizationId,
    );

    const updated = await this.findOne(organizationId, reopenedId);
    if (updated.status !== 'PENDING') {
      throw new BadRequestException('Não foi possível reabrir o orçamento para complemento');
    }
    return updated;
  }

  async approveFromOffice(
    organizationId: string,
    quoteId: string,
    userId?: string,
    dto?: ApproveLinesDto,
  ) {
    const quote = await this.findOne(organizationId, quoteId);
    if (quote.status === 'APPROVED') return quote;

    const lines = quote.lines;
    const hasPriorApproved = lines.some((l) => l.approved === true);
    const pendingLines = lines.filter((l) => l.approved === null);

    if (dto?.lines?.length) {
      for (const line of dto.lines) {
        const existing = lines.find((l) => l.id === line.lineId);
        if (!existing || existing.approved !== null) continue;
        await this.prisma.quoteLine.update({
          where: { id: line.lineId },
          data: { approved: line.approved },
        });
      }
    } else if (pendingLines.length > 0) {
      await this.prisma.quoteLine.updateMany({
        where: { quoteId, approved: null },
        data: { approved: true },
      });
    } else {
      await this.prisma.quoteLine.updateMany({
        where: { quoteId },
        data: { approved: true },
      });
    }

    const refreshedLines = await this.prisma.quoteLine.findMany({ where: { quoteId } });
    const stillPending = refreshedLines.some((l) => l.approved === null);
    if (stillPending) {
      throw new BadRequestException('Ainda há itens aguardando aprovação');
    }

    const approvedAmount = this.approvedLinesAmount(refreshedLines);
    const osStatus =
      hasPriorApproved || quote.serviceOrder.status === 'IN_PROGRESS'
        ? 'IN_PROGRESS'
        : 'IN_PROGRESS';

    const [updated] = await this.prisma.$transaction([
      this.prisma.quote.update({
        where: { id: quoteId },
        data: {
          status: 'APPROVED',
          amount: new Prisma.Decimal(approvedAmount),
        },
      }),
      this.prisma.serviceOrder.update({
        where: { id: quote.serviceOrderId },
        data: {
          status: osStatus,
          totalAmount: new Prisma.Decimal(approvedAmount),
        },
      }),
      this.prisma.serviceOrderStatusHistory.create({
        data: {
          organizationId,
          serviceOrderId: quote.serviceOrderId,
          fromStatus: quote.serviceOrder.status,
          toStatus: osStatus,
          userId: userId ?? null,
          notes: hasPriorApproved
            ? 'Complemento de orçamento aprovado manualmente pela oficina'
            : 'Orçamento aprovado manualmente pela oficina — OS liberada',
        },
      }),
    ]);

    await this.serviceOrders.deductPartsStockForExecution(
      organizationId,
      quote.serviceOrderId,
    );

    await this.events.emitOffice(organizationId, {
      type: 'quote.approved',
      title: hasPriorApproved ? 'Complemento aprovado' : 'Orçamento aprovado',
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

  private async removeRejectedSupplementItems(
    organizationId: string,
    serviceOrderId: string,
    quoteId: string,
  ) {
    const rejected = await this.prisma.quoteLine.findMany({
      where: { quoteId, approved: false, serviceOrderItemId: { not: null } },
    });
    for (const line of rejected) {
      if (!line.serviceOrderItemId) continue;
      const item = await this.prisma.serviceOrderItem.findFirst({
        where: { id: line.serviceOrderItemId, serviceOrderId, organizationId },
      });
      if (!item) continue;
      await this.prisma.serviceOrderItem.delete({ where: { id: item.id } });
    }
    await this.prisma.quoteLine.deleteMany({
      where: { quoteId, approved: false },
    });
  }

  async rejectFromOffice(organizationId: string, quoteId: string, userId?: string) {
    const quote = await this.findOne(organizationId, quoteId);
    if (quote.status === 'REJECTED') return quote;

    const hasPriorApproved = quote.lines.some((l) => l.approved === true);
    const hasPending = quote.lines.some((l) => l.approved === null);

    if (hasPriorApproved && hasPending) {
      await this.prisma.quoteLine.updateMany({
        where: { quoteId, approved: null },
        data: { approved: false },
      });
      await this.removeRejectedSupplementItems(
        organizationId,
        quote.serviceOrderId,
        quoteId,
      );
      await this.quotesSync.syncQuoteLines(
        quoteId,
        quote.serviceOrderId,
        organizationId,
      );

      const approvedAmount = this.approvedLinesAmount(
        await this.prisma.quoteLine.findMany({ where: { quoteId } }),
      );

      const [updated] = await this.prisma.$transaction([
        this.prisma.quote.update({
          where: { id: quoteId },
          data: {
            status: 'APPROVED',
            amount: new Prisma.Decimal(approvedAmount),
          },
        }),
        this.prisma.serviceOrder.update({
          where: { id: quote.serviceOrderId },
          data: {
            status: 'IN_PROGRESS',
            totalAmount: new Prisma.Decimal(approvedAmount),
          },
        }),
        this.prisma.serviceOrderStatusHistory.create({
          data: {
            organizationId,
            serviceOrderId: quote.serviceOrderId,
            fromStatus: quote.serviceOrder.status,
            toStatus: 'IN_PROGRESS',
            userId: userId ?? null,
            notes: 'Itens novos do complemento recusados pela oficina',
          },
        }),
      ]);

      await this.events.emitOffice(organizationId, {
        type: 'quote.rejected',
        title: 'Complemento recusado',
        message: `OS #${quote.serviceOrder.number} — itens novos recusados`,
        metadata: {
          quoteId,
          serviceOrderId: quote.serviceOrderId,
          serviceOrderNumber: quote.serviceOrder.number,
        },
        vehicleId: quote.serviceOrder.vehicleId,
      });

      return this.findOne(organizationId, updated.id);
    }

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
    const becamePending =
      dto.status === 'PENDING' && existing.status !== 'PENDING';
    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.terms !== undefined ? { terms: dto.terms || null } : {}),
        ...(dto.paymentAgreement !== undefined
          ? { paymentAgreement: dto.paymentAgreement || null }
          : {}),
        ...(dto.freeTextEnabled !== undefined ? { freeTextEnabled: dto.freeTextEnabled } : {}),
        ...(dto.freeTextContent !== undefined
          ? { freeTextContent: dto.freeTextContent || null }
          : {}),
        ...(dto.freeTextAmount !== undefined
          ? {
              freeTextAmount:
                dto.freeTextAmount != null ? dto.freeTextAmount : null,
            }
          : {}),
        ...(dto.validUntil !== undefined
          ? { validUntil: dto.validUntil ? new Date(dto.validUntil) : null }
          : {}),
      },
      include: quoteInclude,
    });
    if (
      (dto.freeTextEnabled ?? updated.freeTextEnabled) &&
      Number(dto.freeTextAmount ?? updated.freeTextAmount ?? 0) > 0
    ) {
      await this.prisma.quote.update({
        where: { id },
        data: {
          amount: Number(dto.freeTextAmount ?? updated.freeTextAmount),
        },
      });
    }
    if (dto.status === 'PENDING' || updated.status === 'PENDING') {
      await this.quotesSync.syncForServiceOrder(organizationId, existing.serviceOrderId);
      if (becamePending) {
        await this.portalNotify.notifyQuotePending(id, 'new');
      }
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
      const isSupplement = await this.quotesSync.isSupplementQuote(quoteId);
      await this.events.emitOffice(organizationId, {
        type: isSupplement ? 'quote.supplement' : 'quote.sent',
        title: isSupplement ? 'Complemento disponível para o cliente' : 'Orçamento disponível para o cliente',
        message: `OS #${so.number} — link gerado`,
        metadata: { quoteId, serviceOrderId: so.id, serviceOrderNumber: so.number },
        vehicleId: so.vehicleId,
        pushTitle: isSupplement ? 'Itens adicionais no orçamento' : 'Novo orçamento',
        pushBody: isSupplement
          ? `Novos itens na OS #${so.number} — confira e aprove`
          : `Confira o orçamento da OS #${so.number}`,
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
