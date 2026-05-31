import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QuotesSyncService } from './quotes-sync.service';
import { EventsService } from '../events/events.service';
import { notDeleted } from '../common/soft-delete';

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

  async create(organizationId: string, dto: CreateQuoteDto) {
    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: dto.serviceOrderId, organizationId },
    });
    if (!so) throw new NotFoundException('Ordem de serviço não encontrada');

    const status = dto.status ?? 'PENDING';

    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.create({
        data: {
          organizationId,
          serviceOrderId: dto.serviceOrderId,
          amount: dto.amount,
          status,
        },
        include: quoteInclude,
      });

      if (status === 'PENDING') {
        await tx.serviceOrder.update({
          where: { id: dto.serviceOrderId },
          data: { status: 'AWAITING_APPROVAL' },
        });
      }

      return quote;
    }).then(async (quote) => {
      if (status === 'PENDING') {
        await this.quotesSync.syncForServiceOrder(organizationId, dto.serviceOrderId);
        return this.findOne(organizationId, quote.id);
      }
      return quote;
    });
  }

  list(organizationId: string, search?: string, status?: string) {
    return this.prisma.quote.findMany({
      where: {
        organizationId,
        ...notDeleted,
        ...(status ? { status: status as never } : {}),
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

  async update(organizationId: string, id: string, dto: UpdateQuoteDto) {
    const existing = await this.findOne(organizationId, id);
    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.terms !== undefined ? { terms: dto.terms || null } : {}),
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
      });
    }

    return {
      token,
      expiresAt,
      path: `/orcamento/${token}`,
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
