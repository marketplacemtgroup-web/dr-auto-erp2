import { Injectable } from '@nestjs/common';
import { Prisma, QuoteLineType, ServiceOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const SUPPLEMENT_OS_STATUSES: ServiceOrderStatus[] = [
  'IN_PROGRESS',
  'APPROVED',
  'AWAITING_PART',
];

/** Mantém orçamento alinhado aos itens da OS para o portal do cliente. */
@Injectable()
export class QuotesSyncService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextQuoteNumber(organizationId: string) {
    const last = await this.prisma.quote.findFirst({
      where: { organizationId, number: { not: null } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    return (last?.number ?? 1000) + 1;
  }

  private mapItemType(itemType: string): QuoteLineType {
    if (itemType === 'PART') return 'PART';
    return 'SERVICE';
  }

  private lineTotal(line: { unitPrice: Prisma.Decimal; quantity: number; discount: Prisma.Decimal }) {
    return Number(line.unitPrice) * line.quantity - Number(line.discount);
  }

  async hasPendingLines(quoteId: string) {
    const count = await this.prisma.quoteLine.count({
      where: { quoteId, approved: null },
    });
    return count > 0;
  }

  async isSupplementQuote(quoteId: string) {
    const [approved, pending] = await Promise.all([
      this.prisma.quoteLine.count({ where: { quoteId, approved: true } }),
      this.prisma.quoteLine.count({ where: { quoteId, approved: null } }),
    ]);
    return approved > 0 && pending > 0;
  }

  /** Upsert linhas por serviceOrderItemId, preservando approved. */
  async syncQuoteLines(quoteId: string, serviceOrderId: string, organizationId: string) {
    const items = await this.prisma.serviceOrderItem.findMany({
      where: { serviceOrderId, organizationId },
      orderBy: { createdAt: 'asc' },
    });

    const existingLines = await this.prisma.quoteLine.findMany({
      where: { quoteId },
    });
    const byItemId = new Map(
      existingLines
        .filter((l) => l.serviceOrderItemId)
        .map((l) => [l.serviceOrderItemId!, l]),
    );
    const itemIds = new Set(items.map((i) => i.id));

    const toDelete = existingLines.filter(
      (l) => l.serviceOrderItemId && !itemIds.has(l.serviceOrderItemId),
    );
    if (toDelete.length) {
      await this.prisma.quoteLine.deleteMany({
        where: { id: { in: toDelete.map((l) => l.id) } },
      });
    }

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const existing = byItemId.get(item.id);
      const lineData = {
        lineType: this.mapItemType(item.itemType),
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        sortOrder: idx,
        serviceOrderItemId: item.id,
      };

      if (existing) {
        await this.prisma.quoteLine.update({
          where: { id: existing.id },
          data: lineData,
        });
      } else {
        await this.prisma.quoteLine.create({
          data: {
            organizationId,
            quoteId,
            ...lineData,
            approved: null,
          },
        });
      }
    }

    const lines = await this.prisma.quoteLine.findMany({ where: { quoteId } });
    const total = lines.reduce((sum, l) => sum + this.lineTotal(l), 0);
    await this.prisma.quote.update({
      where: { id: quoteId },
      data: { amount: new Prisma.Decimal(total) },
    });

    const hasPending = lines.some((l) => l.approved === null);
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    if (quote?.status === 'APPROVED' && hasPending) {
      await this.prisma.quote.update({
        where: { id: quoteId },
        data: { status: 'PENDING' },
      });
    }
  }

  /**
   * Reabre orçamento aprovado para complemento (mesma OS, mesmo número).
   */
  async reopenForSupplement(
    organizationId: string,
    quoteId: string,
    userId?: string,
  ) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, organizationId },
      include: { serviceOrder: true, lines: true },
    });
    if (!quote) return null;
    if (quote.status !== 'APPROVED') {
      return null;
    }

    const so = quote.serviceOrder;
    if (!SUPPLEMENT_OS_STATUSES.includes(so.status)) {
      return null;
    }

    const pendingNullCount = await this.prisma.quoteLine.count({
      where: { quoteId, approved: null },
    });
    if (pendingNullCount === 0) {
      return null;
    }

    const pendingQuote = await this.prisma.quote.findFirst({
      where: {
        organizationId,
        serviceOrderId: so.id,
        status: 'PENDING',
      },
    });
    if (pendingQuote && pendingQuote.id !== quoteId) {
      return pendingQuote.id;
    }

    await this.prisma.$transaction([
      this.prisma.quote.update({
        where: { id: quoteId },
        data: { status: 'PENDING' },
      }),
      this.prisma.quoteLine.updateMany({
        where: { quoteId, approved: null },
        data: { approved: true },
      }),
      this.prisma.serviceOrderStatusHistory.create({
        data: {
          organizationId,
          serviceOrderId: so.id,
          fromStatus: so.status,
          toStatus: so.status,
          userId: userId ?? null,
          notes: 'Complemento de orçamento solicitado',
        },
      }),
    ]);

    return quoteId;
  }

  /** Antes de sincronizar itens: reabre orçamento aprovado se a OS está em execução. */
  async ensureSupplementBeforeItemSync(organizationId: string, serviceOrderId: string) {
    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, organizationId },
      include: {
        quotes: {
          where: { status: { in: ['PENDING', 'APPROVED'] } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!so || !SUPPLEMENT_OS_STATUSES.includes(so.status)) return;

    const pending = so.quotes.find((q) => q.status === 'PENDING');
    if (pending) return;

    const approved = so.quotes.find((q) => q.status === 'APPROVED');
    if (approved) {
      await this.reopenForSupplement(organizationId, approved.id);
    }
  }

  async syncForServiceOrder(organizationId: string, serviceOrderId: string) {
    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, organizationId },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        quotes: {
          where: { status: { in: ['PENDING', 'DRAFT', 'APPROVED'] } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!so) return;

    const total = so.items.reduce(
      (sum, i) => sum + Number(i.unitPrice) * i.quantity,
      0,
    );
    if (total <= 0) return;

    const pending = so.quotes.find((q) => q.status === 'PENDING');
    const draft = so.quotes.find((q) => q.status === 'DRAFT');
    const approved = so.quotes.find((q) => q.status === 'APPROVED');

    if (pending) {
      await this.syncQuoteLines(pending.id, serviceOrderId, organizationId);
      return pending.id;
    }

    if (draft) {
      const quoteNumber = draft.number ?? (await this.nextQuoteNumber(organizationId));
      await this.prisma.$transaction([
        this.prisma.quote.update({
          where: { id: draft.id },
          data: {
            status: 'PENDING',
            amount: new Prisma.Decimal(total),
            number: quoteNumber,
          },
        }),
        this.prisma.serviceOrder.update({
          where: { id: so.id },
          data: { status: 'AWAITING_APPROVAL' },
        }),
      ]);
      await this.syncQuoteLines(draft.id, serviceOrderId, organizationId);
      return draft.id;
    }

    if (approved && SUPPLEMENT_OS_STATUSES.includes(so.status)) {
      await this.syncQuoteLines(approved.id, serviceOrderId, organizationId);
      const hasPending = await this.hasPendingLines(approved.id);
      if (hasPending) {
        await this.reopenForSupplement(organizationId, approved.id);
      }
      return approved.id;
    }

    const quoteNumber = await this.nextQuoteNumber(organizationId);
    const nextStatus =
      so.status === 'RECEIVED' ||
      so.status === 'DIAGNOSIS' ||
      so.status === 'AWAITING_QUOTE'
        ? 'AWAITING_APPROVAL'
        : so.status;
    const [quote] = await this.prisma.$transaction([
      this.prisma.quote.create({
        data: {
          organizationId,
          serviceOrderId: so.id,
          number: quoteNumber,
          amount: new Prisma.Decimal(total),
          status: 'PENDING',
        },
      }),
      this.prisma.serviceOrder.update({
        where: { id: so.id },
        data: { status: nextStatus },
      }),
    ]);

    await this.syncQuoteLines(quote.id, serviceOrderId, organizationId);
    return quote.id;
  }

  async syncForVehicle(organizationId: string, vehicleId: string) {
    const orders = await this.prisma.serviceOrder.findMany({
      where: {
        organizationId,
        vehicleId,
        totalAmount: { gt: 0 },
        status: {
          in: [
            'AWAITING_APPROVAL',
            'AWAITING_QUOTE',
            'DIAGNOSIS',
            'RECEIVED',
            'IN_PROGRESS',
            'APPROVED',
            'AWAITING_PART',
          ],
        },
      },
      select: { id: true },
    });

    for (const so of orders) {
      await this.syncForServiceOrder(organizationId, so.id);
    }
  }
}
