import { Injectable } from '@nestjs/common';
import { Prisma, QuoteLineType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Mantém orçamento PENDING alinhado aos itens da OS para o portal do cliente. */
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

  async syncQuoteLines(quoteId: string, serviceOrderId: string, organizationId: string) {
    const items = await this.prisma.serviceOrderItem.findMany({
      where: { serviceOrderId, organizationId },
      orderBy: { createdAt: 'asc' },
    });

    await this.prisma.quoteLine.deleteMany({ where: { quoteId } });

    if (items.length === 0) return;

    await this.prisma.quoteLine.createMany({
      data: items.map((item, idx) => ({
        organizationId,
        quoteId,
        lineType: this.mapItemType(item.itemType),
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sortOrder: idx,
        serviceOrderItemId: item.id,
        approved: null,
      })),
    });

    const total = items.reduce(
      (sum, i) => sum + Number(i.unitPrice) * i.quantity,
      0,
    );
    await this.prisma.quote.update({
      where: { id: quoteId },
      data: { amount: new Prisma.Decimal(total) },
    });
  }

  async syncForServiceOrder(organizationId: string, serviceOrderId: string) {
    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, organizationId },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        quotes: {
          where: { status: { in: ['PENDING', 'DRAFT'] } },
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
