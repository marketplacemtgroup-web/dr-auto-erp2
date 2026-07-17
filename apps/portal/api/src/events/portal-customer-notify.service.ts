import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from './events.service';

export type QuoteNotifyKind = 'new' | 'supplement' | 'updated';

/** Push + inbox do portal do cliente (sem notificação no ERP). */
@Injectable()
export class PortalCustomerNotifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async notifyQuotePending(quoteId: string, kind: QuoteNotifyKind) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, deletedAt: null },
      include: {
        serviceOrder: {
          select: { id: true, number: true, vehicleId: true },
        },
      },
    });
    if (!quote || quote.status !== 'PENDING' || !quote.serviceOrder.vehicleId) return;

    const pendingLines = await this.prisma.quoteLine.count({
      where: { quoteId, approved: null },
    });
    if (pendingLines === 0) return;

    const n = quote.serviceOrder.number;
    const copy: Record<QuoteNotifyKind, { title: string; body: string }> = {
      new: {
        title: 'Novo orçamento',
        body: `Confira o orçamento da OS #${n} no app`,
      },
      supplement: {
        title: 'Itens adicionais no orçamento',
        body: `Novos itens na OS #${n} — confira e aprove`,
      },
      updated: {
        title: 'Orçamento atualizado',
        body: `O orçamento da OS #${n} foi atualizado`,
      },
    };
    const msg = copy[kind];

    await this.events.emitCustomer(quote.serviceOrder.vehicleId, {
      pushTitle: msg.title,
      pushBody: msg.body,
      pushUrl: `/orcamentos/${quoteId}`,
      portalNotificationType: 'orcamento',
      serviceOrderId: quote.serviceOrder.id,
      quoteId,
    });
  }

  async notifyServiceOrderFieldUpdate(
    serviceOrderId: string,
    field: 'complaint' | 'estimatedAt' | 'entryKm',
  ) {
    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, deletedAt: null },
      select: { id: true, number: true, vehicleId: true },
    });
    if (!so?.vehicleId) return;

    const bodies: Record<typeof field, string> = {
      complaint: `OS #${so.number} — relato/queixa atualizado`,
      estimatedAt: `OS #${so.number} — previsão de entrega atualizada`,
      entryKm: `OS #${so.number} — quilometragem de entrada atualizada`,
    };

    await this.events.emitCustomer(so.vehicleId, {
      pushTitle: 'Atualização da OS',
      pushBody: bodies[field],
      pushUrl: `/os/${so.id}`,
      portalNotificationType: 'status',
      serviceOrderId: so.id,
    });
  }
}
