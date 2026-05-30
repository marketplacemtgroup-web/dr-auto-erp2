import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFinancialEntryDto,
  CreateInstallmentsDto,
  PayFinancialEntryDto,
} from './dto/create-financial-entry.dto';
import { AuditService } from '../audit/audit.service';

const entryInclude = {
  customer: { select: { id: true, name: true } },
  serviceOrder: { select: { id: true, number: true } },
  quote: { select: { id: true, number: true } },
};

@Injectable()
export class FinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(organizationId: string, search?: string, type?: string, status?: string) {
    return this.prisma.financialEntry.findMany({
      where: {
        organizationId,
        parentEntryId: null,
        ...(type ? { type: type as never } : {}),
        ...(status ? { status: status as never } : {}),
        ...(search
          ? { description: { contains: search, mode: 'insensitive' } }
          : {}),
      },
      include: {
        ...entryInclude,
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  create(organizationId: string, dto: CreateFinancialEntryDto) {
    return this.prisma.financialEntry.create({
      data: {
        organizationId,
        description: dto.description.trim(),
        type: dto.type,
        dueDate: new Date(dto.dueDate),
        amount: new Prisma.Decimal(dto.amount),
        status: 'OPEN',
        customerId: dto.customerId ?? null,
        serviceOrderId: dto.serviceOrderId ?? null,
        quoteId: dto.quoteId ?? null,
        paymentMethod: dto.paymentMethod ?? null,
      },
      include: entryInclude,
    });
  }

  async createInstallments(organizationId: string, dto: CreateInstallmentsDto) {
    const total = dto.amount;
    const n = dto.installments;
    const perInstallment = Math.floor((total / n) * 100) / 100;
    let remainder = Math.round((total - perInstallment * n) * 100) / 100;

    const parent = await this.prisma.financialEntry.create({
      data: {
        organizationId,
        description: `${dto.description.trim()} (${n}x)`,
        type: dto.type,
        dueDate: new Date(dto.dueDate),
        amount: new Prisma.Decimal(total),
        status: 'OPEN',
        customerId: dto.customerId ?? null,
        serviceOrderId: dto.serviceOrderId ?? null,
        quoteId: dto.quoteId ?? null,
        installmentNumber: 0,
        installmentTotal: n,
      },
    });

    const baseDate = new Date(dto.dueDate);
    const children = [];
    for (let i = 1; i <= n; i++) {
      const extra = remainder > 0 ? 0.01 : 0;
      if (remainder > 0) remainder -= 0.01;
      const amount = perInstallment + extra;
      const due = new Date(baseDate);
      due.setMonth(due.getMonth() + (i - 1));
      children.push({
        organizationId,
        parentEntryId: parent.id,
        description: `${dto.description.trim()} — parcela ${i}/${n}`,
        type: dto.type,
        dueDate: due,
        amount: new Prisma.Decimal(amount),
        status: 'OPEN' as const,
        customerId: dto.customerId ?? null,
        serviceOrderId: dto.serviceOrderId ?? null,
        quoteId: dto.quoteId ?? null,
        installmentNumber: i,
        installmentTotal: n,
      });
    }

    await this.prisma.financialEntry.createMany({ data: children });
    return this.prisma.financialEntry.findFirst({
      where: { id: parent.id },
      include: { ...entryInclude, installments: { orderBy: { installmentNumber: 'asc' } } },
    });
  }

  async createFromServiceOrder(organizationId: string, serviceOrderId: string) {
    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, organizationId },
      include: { vehicle: { select: { customerId: true } } },
    });
    if (!so) throw new NotFoundException('OS não encontrada');

    const existing = await this.prisma.financialEntry.findFirst({
      where: { organizationId, serviceOrderId, type: 'RECEIVABLE', status: 'OPEN' },
    });
    if (existing) return existing;

    const total = Number(so.totalAmount);
    if (total <= 0) throw new BadRequestException('OS sem valor para faturar');

    return this.create(organizationId, {
      description: `OS #${so.number} — recebível de serviços`,
      type: 'RECEIVABLE',
      dueDate: new Date().toISOString().slice(0, 10),
      amount: total,
      customerId: so.vehicle.customerId,
      serviceOrderId: so.id,
    });
  }

  async markPaid(
    organizationId: string,
    id: string,
    dto: PayFinancialEntryDto,
    userId?: string,
  ) {
    const entry = await this.prisma.financialEntry.findFirst({
      where: { id, organizationId },
    });
    if (!entry) throw new NotFoundException('Lançamento não encontrado');

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    const paymentMethod = dto.paymentMethod ?? entry.paymentMethod ?? 'PIX';

    const updated = await this.prisma.financialEntry.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt,
        paymentMethod,
      },
      include: entryInclude,
    });

    if (dto.registerInCash && entry.type === 'RECEIVABLE' && paymentMethod === 'CASH') {
      const session = await this.prisma.cashRegisterSession.findFirst({
        where: { organizationId, status: 'OPEN' },
      });
      if (session) {
        await this.prisma.cashRegisterMovement.create({
          data: {
            organizationId,
            sessionId: session.id,
            financialEntryId: id,
            movementType: 'PAYMENT_IN',
            amount: entry.amount,
            description: entry.description,
          },
        });
      }
    }

    await this.audit.log(organizationId, 'financial.pay', 'financial_entry', {
      userId,
      metadata: {
        entryId: id,
        description: entry.description,
        amount: Number(entry.amount),
        paymentMethod,
      },
    });

    if (entry.type === 'RECEIVABLE' && entry.serviceOrderId) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await this.prisma.dailyRevenue.upsert({
        where: {
          organizationId_date: { organizationId, date: today },
        },
        create: {
          organizationId,
          date: today,
          amount: entry.amount,
        },
        update: {
          amount: { increment: entry.amount },
        },
      });
    }

    return updated;
  }

  cashFlow(organizationId: string, months = 6) {
    const start = new Date();
    start.setMonth(start.getMonth() - (months - 1));
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    return this.prisma.financialEntry.findMany({
      where: {
        organizationId,
        status: 'PAID',
        paidAt: { gte: start },
      },
      select: {
        type: true,
        amount: true,
        paidAt: true,
        paymentMethod: true,
      },
    });
  }
}
