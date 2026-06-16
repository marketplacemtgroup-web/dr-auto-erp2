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
  supplier: { select: { id: true, legalName: true, tradeName: true } },
  purchaseOrder: { select: { id: true, number: true } },
  financialCategory: { select: { id: true, name: true, type: true } },
  paymentSplits: { orderBy: { createdAt: 'asc' as const } },
};

@Injectable()
export class FinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(
    organizationId: string,
    search?: string,
    type?: string,
    status?: string,
    origin?: string,
    supplierId?: string,
  ) {
    return this.prisma.financialEntry.findMany({
      where: {
        organizationId,
        parentEntryId: null,
        ...(type ? { type: type as never } : {}),
        ...(status ? { status: status as never } : {}),
        ...(origin ? { origin: origin as never } : {}),
        ...(supplierId ? { supplierId } : {}),
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

  async receiveQueue(organizationId: string) {
    const billableStatuses = ['FINISHED', 'DELIVERED', 'AWAITING_PAYMENT'] as const;

    const orders = await this.prisma.serviceOrder.findMany({
      where: {
        organizationId,
        status: { in: [...billableStatuses] },
        totalAmount: { gt: 0 },
        deletedAt: null,
      },
      include: {
        vehicle: { include: { customer: { select: { name: true } } } },
        financialEntries: {
          where: {
            type: 'RECEIVABLE',
            status: 'OPEN',
            parentEntryId: null,
          },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    const readyToBill = orders
      .filter((o) => o.financialEntries.length === 0)
      .map((o) => ({
        serviceOrderId: o.id,
        number: o.number,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        customerName: o.vehicle.customer.name,
        plate: o.vehicle.plate,
      }));

    const openReceivables = await this.prisma.financialEntry.findMany({
      where: {
        organizationId,
        type: 'RECEIVABLE',
        status: 'OPEN',
        parentEntryId: null,
        serviceOrderId: { not: null },
      },
      include: entryInclude,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });

    return { readyToBill, openReceivables };
  }

  async createFromServiceOrder(organizationId: string, serviceOrderId: string) {
    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, organizationId },
      include: { vehicle: { select: { customerId: true } } },
    });
    if (!so) throw new NotFoundException('OS não encontrada');

    const existing = await this.prisma.financialEntry.findFirst({
      where: { organizationId, serviceOrderId, type: 'RECEIVABLE', status: 'OPEN' },
      include: entryInclude,
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

  async createFromPurchase(
    organizationId: string,
    po: {
      id: string;
      number: string;
      supplierId: string | null;
      supplierName: string;
      totalAmount: Prisma.Decimal | number;
      paymentTerms?: unknown;
    },
  ) {
    const existing = await this.prisma.financialEntry.findFirst({
      where: {
        organizationId,
        purchaseOrderId: po.id,
        type: 'PAYABLE',
        status: { not: 'CANCELLED' },
      },
    });
    if (existing) return existing;

    await this.ensureDefaultCategories(organizationId);

    const total = Number(po.totalAmount);
    if (total <= 0) throw new BadRequestException('Compra sem valor para gerar contas a pagar');

    const terms = (po.paymentTerms ?? {}) as {
      installments?: number;
      firstDueDate?: string;
      intervalDays?: number;
    };
    const installments = Math.max(terms.installments ?? 1, 1);
    const firstDue = terms.firstDueDate ?? new Date().toISOString().slice(0, 10);
    const intervalDays = terms.intervalDays ?? 30;

    const category = await this.prisma.financialCategory.findFirst({
      where: { organizationId, name: 'Compras de mercadorias', type: 'EXPENSE' },
    });

    if (installments === 1) {
      return this.prisma.financialEntry.create({
        data: {
          organizationId,
          description: `Compra ${po.number} — ${po.supplierName}`,
          type: 'PAYABLE',
          dueDate: new Date(firstDue),
          amount: new Prisma.Decimal(total),
          status: 'OPEN',
          supplierId: po.supplierId,
          purchaseOrderId: po.id,
          financialCategoryId: category?.id ?? null,
          origin: 'PURCHASE',
        },
        include: entryInclude,
      });
    }

    const perInstallment = Math.floor((total / installments) * 100) / 100;
    let remainder = Math.round((total - perInstallment * installments) * 100) / 100;

    const parent = await this.prisma.financialEntry.create({
      data: {
        organizationId,
        description: `Compra ${po.number} — ${po.supplierName} (${installments}x)`,
        type: 'PAYABLE',
        dueDate: new Date(firstDue),
        amount: new Prisma.Decimal(total),
        status: 'OPEN',
        supplierId: po.supplierId,
        purchaseOrderId: po.id,
        financialCategoryId: category?.id ?? null,
        origin: 'PURCHASE',
        installmentNumber: 0,
        installmentTotal: installments,
      },
    });

    const baseDate = new Date(firstDue);
    const children = [];
    for (let i = 1; i <= installments; i++) {
      const extra = remainder > 0 ? 0.01 : 0;
      if (remainder > 0) remainder -= 0.01;
      const amount = perInstallment + extra;
      const due = new Date(baseDate);
      due.setDate(due.getDate() + intervalDays * (i - 1));
      children.push({
        organizationId,
        parentEntryId: parent.id,
        description: `Compra ${po.number} — parcela ${i}/${installments}`,
        type: 'PAYABLE' as const,
        dueDate: due,
        amount: new Prisma.Decimal(amount),
        status: 'OPEN' as const,
        supplierId: po.supplierId,
        purchaseOrderId: po.id,
        financialCategoryId: category?.id ?? null,
        origin: 'PURCHASE' as const,
        installmentNumber: i,
        installmentTotal: installments,
      });
    }

    await this.prisma.financialEntry.createMany({ data: children });
    return this.prisma.financialEntry.findFirst({
      where: { id: parent.id },
      include: { ...entryInclude, installments: { orderBy: { installmentNumber: 'asc' } } },
    });
  }

  async ensureDefaultCategories(organizationId: string) {
    const defaults = [
      { name: 'Vendas de serviços', type: 'INCOME' as const, groupName: 'Receitas' },
      { name: 'Vendas de peças', type: 'INCOME' as const, groupName: 'Receitas' },
      { name: 'Compras de mercadorias', type: 'EXPENSE' as const, groupName: 'Compras' },
      { name: 'Despesas operacionais', type: 'EXPENSE' as const, groupName: 'Despesas' },
      { name: 'Folha de pagamento', type: 'EXPENSE' as const, groupName: 'Pessoal' },
      { name: 'Juros e multas', type: 'EXPENSE' as const, groupName: 'Financeiro' },
      { name: 'Taxas de cartão', type: 'EXPENSE' as const, groupName: 'Financeiro' },
    ];
    for (const cat of defaults) {
      const exists = await this.prisma.financialCategory.findFirst({
        where: { organizationId, name: cat.name },
      });
      if (!exists) {
        await this.prisma.financialCategory.create({
          data: { organizationId, ...cat, isSystem: true },
        });
      }
    }
  }

  async ensureDefaultFeeConfigs(organizationId: string) {
    const defaults = [
      { paymentMethod: 'CARD' as const, label: 'Cartão débito', feePercent: 1.5, installments: 1 },
      { paymentMethod: 'CARD' as const, label: 'Cartão crédito à vista', feePercent: 2.5, installments: 1 },
      { paymentMethod: 'CARD' as const, label: 'Cartão crédito 2-6x', feePercent: 3.5, installments: 6 },
    ];
    for (const cfg of defaults) {
      const exists = await this.prisma.paymentFeeConfig.findFirst({
        where: { organizationId, label: cfg.label },
      });
      if (!exists) {
        await this.prisma.paymentFeeConfig.create({
          data: {
            organizationId,
            paymentMethod: cfg.paymentMethod,
            label: cfg.label,
            feePercent: new Prisma.Decimal(cfg.feePercent),
            installments: cfg.installments,
          },
        });
      }
    }
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }

  private resolveDiscount(gross: number, dto: PayFinancialEntryDto) {
    if (dto.discountAmount != null && dto.discountAmount > 0) {
      return this.roundMoney(Math.min(dto.discountAmount, gross));
    }
    if (dto.discountPercent != null && dto.discountPercent > 0) {
      return this.roundMoney(Math.min((gross * dto.discountPercent) / 100, gross));
    }
    return 0;
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
    if (entry.status === 'PAID') {
      throw new BadRequestException('Lançamento já foi baixado');
    }

    const gross = Number(entry.amount);
    const discount = this.resolveDiscount(gross, dto);
    const interest = this.roundMoney(dto.interestAmount ?? 0);
    const penalty = this.roundMoney(dto.penaltyAmount ?? 0);
    const fee = this.roundMoney(dto.feeAmount ?? 0);

    const netDue =
      entry.type === 'PAYABLE'
        ? this.roundMoney(gross - discount + interest + penalty)
        : this.roundMoney(gross - discount);

    let splits =
      dto.splits?.map((split) => ({
        paymentMethod: split.paymentMethod,
        amount: this.roundMoney(split.amount),
        registerInCash: split.registerInCash ?? false,
      })) ?? [];

    if (splits.length === 0) {
      const method = (dto.paymentMethod ?? entry.paymentMethod ?? 'PIX') as PaymentMethod;
      splits = [
        {
          paymentMethod: method,
          amount: netDue,
          registerInCash: dto.registerInCash ?? false,
        },
      ];
    }

    const splitTotal = this.roundMoney(splits.reduce((sum, split) => sum + split.amount, 0));
    if (Math.abs(splitTotal - netDue) > 0.01) {
      throw new BadRequestException(
        `A soma dos pagamentos (R$ ${splitTotal.toFixed(2)}) deve ser igual ao valor liquido (R$ ${netDue.toFixed(2)})`,
      );
    }

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    const primaryMethod = splits.length === 1 ? splits[0].paymentMethod : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.financialPaymentSplit.createMany({
        data: splits.map((split) => ({
          organizationId,
          financialEntryId: id,
          paymentMethod: split.paymentMethod,
          amount: new Prisma.Decimal(split.amount),
        })),
      });

      const row = await tx.financialEntry.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt,
          paymentMethod: primaryMethod,
          discountAmount: new Prisma.Decimal(discount),
          discountPercent:
            dto.discountPercent != null && dto.discountPercent > 0
              ? new Prisma.Decimal(dto.discountPercent)
              : null,
          amountReceived: new Prisma.Decimal(netDue),
          interestAmount: new Prisma.Decimal(interest),
          penaltyAmount: new Prisma.Decimal(penalty),
          feeAmount: new Prisma.Decimal(fee),
        },
        include: entryInclude,
      });

      if (entry.type === 'RECEIVABLE') {
        const session = await tx.cashRegisterSession.findFirst({
          where: { organizationId, status: 'OPEN' },
        });

        for (const split of splits) {
          if (split.paymentMethod === 'CASH' && split.registerInCash && session) {
            await tx.cashRegisterMovement.create({
              data: {
                organizationId,
                sessionId: session.id,
                financialEntryId: id,
                movementType: 'PAYMENT_IN',
                amount: new Prisma.Decimal(split.amount),
                description: `${entry.description} (dinheiro)`,
              },
            });
          }

          if (split.paymentMethod === 'CARD' && fee > 0) {
            const feeConfig = await tx.paymentFeeConfig.findFirst({
              where: { organizationId, paymentMethod: 'CARD', isActive: true },
              orderBy: { feePercent: 'asc' },
            });
            const feePercent = Number(feeConfig?.feePercent ?? 0);
            const computedFee =
              fee > 0 ? fee : this.roundMoney((split.amount * feePercent) / 100);
            if (computedFee > 0) {
              await tx.paymentFeeRecord.create({
                data: {
                  organizationId,
                  financialEntryId: id,
                  paymentMethod: split.paymentMethod,
                  grossAmount: new Prisma.Decimal(split.amount),
                  feePercent: new Prisma.Decimal(feePercent),
                  feeAmount: new Prisma.Decimal(computedFee),
                  netAmount: new Prisma.Decimal(split.amount - computedFee),
                },
              });
            }
          }
        }

        if (entry.serviceOrderId) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          await tx.dailyRevenue.upsert({
            where: {
              organizationId_date: { organizationId, date: today },
            },
            create: {
              organizationId,
              date: today,
              amount: new Prisma.Decimal(netDue),
            },
            update: {
              amount: { increment: new Prisma.Decimal(netDue) },
            },
          });
        }
      }

      if (entry.type === 'PAYABLE') {
        const session = await tx.cashRegisterSession.findFirst({
          where: { organizationId, status: 'OPEN' },
        });

        for (const split of splits) {
          if (split.paymentMethod === 'CASH' && split.registerInCash && session) {
            await tx.cashRegisterMovement.create({
              data: {
                organizationId,
                sessionId: session.id,
                financialEntryId: id,
                movementType: 'PAYMENT_OUT',
                amount: new Prisma.Decimal(split.amount),
                description: `${entry.description} (pagamento)`,
              },
            });
          }
        }
      }

      return row;
    });

    await this.audit.log(organizationId, 'financial.pay', 'financial_entry', {
      userId,
      metadata: {
        entryId: id,
        description: entry.description,
        gross,
        discount,
        amountReceived: netDue,
        splits,
      },
    });

    return updated;
  }

  private startOfDay(date: Date) {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    return day;
  }

  private async reversePaidEntryEffects(
    tx: Prisma.TransactionClient,
    organizationId: string,
    entry: {
      type: string;
      serviceOrderId: string | null;
      paidAt: Date | null;
      amountReceived: Prisma.Decimal | null;
      amount: Prisma.Decimal;
    },
  ) {
    const netAmount = Number(entry.amountReceived ?? entry.amount);
    if (entry.type !== 'RECEIVABLE' || !entry.serviceOrderId || !entry.paidAt || netAmount <= 0) {
      return;
    }

    const day = this.startOfDay(entry.paidAt);
    const row = await tx.dailyRevenue.findUnique({
      where: { organizationId_date: { organizationId, date: day } },
    });
    if (!row) return;

    const next = this.roundMoney(Number(row.amount) - netAmount);
    if (next <= 0) {
      await tx.dailyRevenue.delete({
        where: { organizationId_date: { organizationId, date: day } },
      });
      return;
    }

    await tx.dailyRevenue.update({
      where: { organizationId_date: { organizationId, date: day } },
      data: { amount: new Prisma.Decimal(next) },
    });
  }

  async remove(organizationId: string, id: string, reason: string, userId?: string) {
    const trimmedReason = reason?.trim();
    if (!trimmedReason || trimmedReason.length < 3) {
      throw new BadRequestException('Informe o motivo da exclusão');
    }

    const entry = await this.prisma.financialEntry.findFirst({
      where: { id, organizationId },
      include: { installments: true },
    });
    if (!entry) throw new NotFoundException('Lançamento não encontrado');

    const entriesToRemove = entry.parentEntryId
      ? [entry]
      : [entry, ...entry.installments];

    await this.prisma.$transaction(async (tx) => {
      for (const row of entriesToRemove) {
        if (row.status === 'PAID') {
          await this.reversePaidEntryEffects(tx, organizationId, row);
        }
      }

      const ids = entriesToRemove.map((row) => row.id);
      await tx.cashRegisterMovement.deleteMany({
        where: { financialEntryId: { in: ids } },
      });

      if (!entry.parentEntryId && entry.installments.length > 0) {
        await tx.financialEntry.deleteMany({ where: { parentEntryId: entry.id } });
      }

      await tx.financialEntry.delete({ where: { id: entry.id } });
    });

    await this.audit.log(organizationId, 'financial.delete', 'financial_entry', {
      userId,
      reason: trimmedReason,
      metadata: {
        entryId: id,
        description: entry.description,
        type: entry.type,
        status: entry.status,
        amount: Number(entry.amount),
        serviceOrderId: entry.serviceOrderId,
        customerId: entry.customerId,
      },
    });

    return { ok: true };
  }

  async cashFlow(organizationId: string, months = 6) {
    const start = new Date();
    start.setMonth(start.getMonth() - (months - 1));
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const [splitRows, legacyRows] = await Promise.all([
      this.prisma.financialPaymentSplit.findMany({
        where: {
          organizationId,
          financialEntry: {
            status: 'PAID',
            type: 'RECEIVABLE',
            paidAt: { gte: start },
          },
        },
        select: {
          paymentMethod: true,
          amount: true,
          financialEntry: { select: { paidAt: true, type: true } },
        },
      }),
      this.prisma.financialEntry.findMany({
        where: {
          organizationId,
          status: 'PAID',
          type: 'RECEIVABLE',
          paidAt: { gte: start },
          paymentMethod: { not: null },
          paymentSplits: { none: {} },
        },
        select: {
          type: true,
          amount: true,
          paidAt: true,
          paymentMethod: true,
        },
      }),
    ]);

    const fromSplits = splitRows.map((row) => ({
      type: row.financialEntry.type,
      amount: row.amount,
      paidAt: row.financialEntry.paidAt,
      paymentMethod: row.paymentMethod,
    }));

    const fromLegacy = legacyRows.map((row) => ({
      type: row.type,
      amount: row.amount,
      paidAt: row.paidAt,
      paymentMethod: row.paymentMethod,
    }));

    return [...fromSplits, ...fromLegacy];
  }
}
