import { BadRequestException, Inject, Injectable, NotFoundException, Optional, forwardRef } from '@nestjs/common';
import { PaymentMethod, Prisma, ServiceOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { CommissionEngineService } from '../team/commission-engine.service';
import {
  CreateFinancialEntryDto,
  CreateInstallmentsDto,
  PayFinancialEntryDto,
  UpdateFinancialEntryDto,
} from './dto/create-financial-entry.dto';
import {
  CreateFixedExpenseDto,
  UpdateFixedExpenseDto,
} from './dto/fixed-expense.dto';
import { AuditService } from '../audit/audit.service';
import { ReportsService } from '../reports/reports.service';
import { LedgerService } from '../ledger/ledger.service';
import { AccountsService } from '../accounts/accounts.service';
import {
  FinancialPeriodPreset,
  resolveFinancialPeriod,
} from '../reports/reports-date.util';
import { ListQueryInput, paginatedResponse, parseListQuery } from '../common/pagination';
import { DashboardCacheService } from '../dashboard/dashboard-cache.service';
import { ServiceOrdersService } from '../service-orders/service-orders.service';

const entryInclude = {
  customer: { select: { id: true, name: true } },
  serviceOrder: { select: { id: true, number: true } },
  quote: { select: { id: true, number: true } },
  supplier: { select: { id: true, legalName: true, tradeName: true } },
  purchaseOrder: { select: { id: true, number: true } },
  financialCategory: { select: { id: true, name: true, type: true } },
  account: { select: { id: true, name: true, type: true } },
  costCenter: { select: { id: true, name: true } },
  paymentSplits: { orderBy: { createdAt: 'asc' as const } },
};

@Injectable()
export class FinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly reports: ReportsService,
    private readonly appointments: AppointmentsService,
    private readonly commissionEngine: CommissionEngineService,
    private readonly ledger: LedgerService,
    private readonly accounts: AccountsService,
    @Inject(forwardRef(() => ServiceOrdersService))
    private readonly serviceOrders: ServiceOrdersService,
    @Optional() private readonly dashboardCache?: DashboardCacheService,
  ) {}

  private async invalidateDashboardCache(organizationId: string, date?: Date) {
    if (!this.dashboardCache) return;
    await this.dashboardCache.invalidate(organizationId, date);
  }

  /**
   * Converte a data escolhida no formulário (geralmente "YYYY-MM-DD") em um
   * Date ancorado ao meio-dia UTC. Isso evita que a data "escorregue" para o
   * dia anterior ao ser exibida/agrupada em fusos negativos (ex.: UTC-3), pois
   * meia-noite UTC vira 21h do dia anterior no Brasil.
   */
  private resolveEntryDate(value: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T12:00:00.000Z`);
    }
    return new Date(value);
  }

  profitSummary(organizationId: string, period: FinancialPeriodPreset = 'month') {
    const range = resolveFinancialPeriod(period);
    return this.reports.profitForPeriod(organizationId, range);
  }

  async list(
    organizationId: string,
    search?: string,
    type?: string,
    status?: string,
    origin?: string,
    supplierId?: string,
    query: ListQueryInput = {},
  ) {
    const { page, limit, skip } = parseListQuery(query);
    const where: Prisma.FinancialEntryWhereInput = {
      organizationId,
      parentEntryId: null,
      ...(type ? { type: type as never } : {}),
      ...(status ? { status: status as never } : {}),
      ...(origin ? { origin: origin as never } : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(search
        ? { description: { contains: search, mode: 'insensitive' } }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.financialEntry.count({ where }),
      this.prisma.financialEntry.findMany({
        where,
        include: {
          ...entryInclude,
          installments: { orderBy: { installmentNumber: 'asc' } },
        },
        // Mais recentes primeiro: o que foi lançado/finalizado hoje abre na
        // primeira página; os lançamentos antigos ficam nas últimas.
        orderBy: [{ createdAt: 'desc' }, { dueDate: 'desc' }],
        skip,
        take: limit,
      }),
    ]);
    return paginatedResponse(rows, total, page, limit);
  }

  async create(organizationId: string, dto: CreateFinancialEntryDto) {
    const amount = new Prisma.Decimal(dto.amount);
    const paid = dto.paid === true;
    // Quando já pago, a data efetiva (paidAt) define o mês nos relatórios.
    // Se não informada, usa a data de vencimento escolhida (permite lançar mês passado).
    const paidAt = paid ? this.resolveEntryDate(dto.paidAt ?? dto.dueDate) : null;

    const entry = await this.prisma.financialEntry.create({
      data: {
        organizationId,
        description: dto.description.trim(),
        type: dto.type,
        dueDate: new Date(dto.dueDate),
        amount,
        status: paid ? 'PAID' : 'OPEN',
        paidAt,
        amountReceived: paid ? amount : null,
        customerId: dto.customerId ?? null,
        serviceOrderId: dto.serviceOrderId ?? null,
        quoteId: dto.quoteId ?? null,
        paymentMethod: dto.paymentMethod ?? null,
      },
      include: entryInclude,
    });
    await this.invalidateDashboardCache(organizationId, paidAt ?? undefined);
    return entry;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateFinancialEntryDto,
    userId?: string,
  ) {
    const entry = await this.prisma.financialEntry.findFirst({
      where: { id, organizationId },
    });
    if (!entry) throw new NotFoundException('Lançamento não encontrado');

    const nextAmount =
      dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : entry.amount;

    // Estado de pagamento resultante (mantém o atual se não for informado).
    const willBePaid = dto.paid !== undefined ? dto.paid : entry.status === 'PAID';

    const data: Prisma.FinancialEntryUpdateInput = {
      ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.dueDate !== undefined ? { dueDate: new Date(dto.dueDate) } : {}),
      ...(dto.amount !== undefined ? { amount: nextAmount } : {}),
      ...(dto.paymentMethod !== undefined ? { paymentMethod: dto.paymentMethod } : {}),
    };

    if (willBePaid) {
      // Data efetiva: usa a informada; senão a que já tinha; senão o vencimento.
      const paidSource =
        dto.paidAt ??
        (entry.paidAt ? undefined : (dto.dueDate ?? this.toIsoDate(entry.dueDate)));
      data.status = 'PAID';
      data.paidAt = paidSource ? this.resolveEntryDate(paidSource) : entry.paidAt;
      data.amountReceived = nextAmount;
    } else {
      data.status = 'OPEN';
      data.paidAt = null;
      data.amountReceived = null;
    }

    const updated = await this.prisma.financialEntry.update({
      where: { id },
      data,
      include: entryInclude,
    });

    await this.audit.log(organizationId, 'financial.update', 'financial_entry', {
      userId,
      metadata: {
        entryId: id,
        before: {
          description: entry.description,
          type: entry.type,
          status: entry.status,
          amount: Number(entry.amount),
          dueDate: this.toIsoDate(entry.dueDate),
          paidAt: entry.paidAt ? entry.paidAt.toISOString() : null,
        },
        after: {
          description: updated.description,
          type: updated.type,
          status: updated.status,
          amount: Number(updated.amount),
          dueDate: this.toIsoDate(updated.dueDate),
          paidAt: updated.paidAt ? updated.paidAt.toISOString() : null,
        },
      },
    });

    // Recalcula o dashboard tanto na data antiga quanto na nova.
    await this.invalidateDashboardCache(organizationId, entry.paidAt ?? undefined);
    if (updated.paidAt) {
      await this.invalidateDashboardCache(organizationId, updated.paidAt);
    }

    return updated;
  }

  private toIsoDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  listFixedExpenses(organizationId: string) {
    return this.prisma.fixedExpense.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  createFixedExpense(organizationId: string, dto: CreateFixedExpenseDto) {
    return this.prisma.fixedExpense.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        amount: new Prisma.Decimal(dto.amount),
        color: dto.color ?? '#DC2626',
      },
    });
  }

  async updateFixedExpense(
    organizationId: string,
    id: string,
    dto: UpdateFixedExpenseDto,
  ) {
    const existing = await this.prisma.fixedExpense.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Despesa fixa não encontrada');
    return this.prisma.fixedExpense.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.amount !== undefined
          ? { amount: new Prisma.Decimal(dto.amount) }
          : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
      },
    });
  }

  async deleteFixedExpense(organizationId: string, id: string) {
    const existing = await this.prisma.fixedExpense.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Despesa fixa não encontrada');
    await this.prisma.fixedExpense.delete({ where: { id } });
    return { ok: true };
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
    const billableStatuses = ['DELIVERED', 'AWAITING_PAYMENT'] as const;

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
            // Considera recebíveis em aberto E já pagos: se a OS já foi
            // faturada (mesmo que quitada), não deve voltar para a fila.
            status: { in: ['OPEN', 'PAID'] },
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

  private async finalizeServiceOrderAfterReceivable(
    organizationId: string,
    serviceOrderId: string,
    currentStatus: ServiceOrderStatus,
  ) {
    if (currentStatus === 'DELIVERED') {
      await this.commissionEngine.generateForServiceOrder(
        organizationId,
        serviceOrderId,
        'OS_ENTREGUE',
      );
    }

    await this.appointments.completeByServiceOrder(serviceOrderId);
  }

  async createFromServiceOrder(organizationId: string, serviceOrderId: string) {
    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, organizationId },
      include: { vehicle: { select: { customerId: true } } },
    });
    if (!so) throw new NotFoundException('OS não encontrada');

    const billableStatuses: ServiceOrderStatus[] = ['DELIVERED', 'AWAITING_PAYMENT'];
    if (!billableStatuses.includes(so.status)) {
      throw new BadRequestException(
        'Somente OS entregues podem gerar cobrança. Finalize o serviço e marque como entregue antes de faturar.',
      );
    }

    // Trava: se a OS já foi paga, não gera nova cobrança (evita duplicar
    // o recebimento e jogá-lo para o mês vigente).
    const alreadyPaid = await this.prisma.financialEntry.findFirst({
      where: { organizationId, serviceOrderId, type: 'RECEIVABLE', status: 'PAID' },
      include: entryInclude,
    });
    if (alreadyPaid) {
      throw new BadRequestException(
        'Esta OS já foi paga. Não é possível cobrar novamente.',
      );
    }

    const existing = await this.prisma.financialEntry.findFirst({
      where: { organizationId, serviceOrderId, type: 'RECEIVABLE', status: 'OPEN' },
      include: entryInclude,
    });

    if (existing) {
      await this.finalizeServiceOrderAfterReceivable(
        organizationId,
        serviceOrderId,
        so.status,
      );
      return existing;
    }

    const total = Number(so.totalAmount);
    if (total <= 0) throw new BadRequestException('OS sem valor para faturar');

    const entry = await this.create(organizationId, {
      description: `OS #${so.number} — recebível de serviços`,
      type: 'RECEIVABLE',
      dueDate: new Date().toISOString().slice(0, 10),
      amount: total,
      customerId: so.vehicle.customerId,
      serviceOrderId: so.id,
    });

    await this.finalizeServiceOrderAfterReceivable(
      organizationId,
      serviceOrderId,
      so.status,
    );

    return entry;
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

  private async resolveAccountId(
    organizationId: string,
    accountId?: string | null,
  ) {
    if (accountId) {
      const account = await this.prisma.financialAccount.findFirst({
        where: { id: accountId, organizationId, status: 'ACTIVE' },
      });
      if (!account) throw new BadRequestException('Conta financeira inválida');
      return account.id;
    }
    const primary = await this.accounts.ensurePrimaryAccount(organizationId);
    return primary.id;
  }

  private entryRemainingAmount(entry: {
    amount: Prisma.Decimal;
    amountPaid: Prisma.Decimal;
    discountAmount?: Prisma.Decimal;
    interestAmount?: Prisma.Decimal;
    penaltyAmount?: Prisma.Decimal;
    feeAmount?: Prisma.Decimal;
    type: string;
  }, dto: PayFinancialEntryDto) {
    const gross = Number(entry.amount);
    const discount = this.resolveDiscount(gross, dto);
    const interest = this.roundMoney(dto.interestAmount ?? 0);
    const penalty = this.roundMoney(dto.penaltyAmount ?? 0);
    const fee = this.roundMoney(dto.feeAmount ?? 0);

    const netDue =
      entry.type === 'PAYABLE'
        ? this.roundMoney(gross - discount + interest + penalty)
        : this.roundMoney(gross - discount - fee);

    const alreadyPaid = this.roundMoney(Number(entry.amountPaid ?? 0));
    const remaining = this.roundMoney(netDue - alreadyPaid);
    return { netDue, alreadyPaid, remaining, discount, interest, penalty, fee };
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
      throw new BadRequestException('Lançamento já foi baixado integralmente');
    }
    if (entry.status === 'REVERSED' || entry.status === 'CANCELLED') {
      throw new BadRequestException('Lançamento não pode ser baixado neste status');
    }

    const { netDue, alreadyPaid, remaining, discount, interest, penalty, fee } =
      this.entryRemainingAmount(entry, dto);

    if (remaining <= 0) {
      throw new BadRequestException('Lançamento já quitado');
    }

    const payAmount = this.roundMoney(dto.amountToPay ?? remaining);
    if (payAmount <= 0 || payAmount > remaining + 0.01) {
      throw new BadRequestException(
        `Valor da baixa deve ser entre R$ 0,01 e R$ ${remaining.toFixed(2)}`,
      );
    }

    let splits =
      dto.splits?.map((split) => ({
        paymentMethod: split.paymentMethod,
        amount: this.roundMoney(split.amount),
        accountId: split.accountId,
        registerInCash: split.registerInCash ?? false,
      })) ?? [];

    if (splits.length === 0) {
      const method = (dto.paymentMethod ?? entry.paymentMethod ?? 'PIX') as PaymentMethod;
      const accountId = await this.resolveAccountId(organizationId, dto.accountId);
      splits = [
        {
          paymentMethod: method,
          amount: payAmount,
          accountId,
          registerInCash: dto.registerInCash ?? false,
        },
      ];
    }

    const splitTotal = this.roundMoney(splits.reduce((sum, split) => sum + split.amount, 0));
    if (Math.abs(splitTotal - payAmount) > 0.01) {
      throw new BadRequestException(
        `A soma dos pagamentos (R$ ${splitTotal.toFixed(2)}) deve ser igual ao valor da baixa (R$ ${payAmount.toFixed(2)})`,
      );
    }

    const paidAt = dto.paidAt ? this.resolveEntryDate(dto.paidAt) : new Date();
    const primaryMethod = splits.length === 1 ? splits[0].paymentMethod : null;
    const newAmountPaid = this.roundMoney(alreadyPaid + payAmount);
    const isFullyPaid = newAmountPaid >= netDue - 0.01;
    const newStatus = isFullyPaid ? 'PAID' : 'PARTIAL';
    const resolvedAccountId = dto.accountId
      ? await this.resolveAccountId(organizationId, dto.accountId)
      : entry.accountId ?? (await this.resolveAccountId(organizationId, null));

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const split of splits) {
        const accountId = await this.resolveAccountId(
          organizationId,
          split.accountId ?? dto.accountId,
        );
        await tx.financialPaymentSplit.create({
          data: {
            organizationId,
            financialEntryId: id,
            paymentMethod: split.paymentMethod,
            amount: new Prisma.Decimal(split.amount),
            accountId,
          },
        });

        await this.ledger.post(tx, {
          organizationId,
          accountId,
          direction: entry.type === 'RECEIVABLE' ? 'CREDIT' : 'DEBIT',
          amount: split.amount,
          movementKind: entry.type === 'RECEIVABLE' ? 'RECEIVABLE' : 'PAYABLE',
          movementDate: paidAt,
          description: `${entry.description} — ${split.paymentMethod}`,
          financialEntryId: id,
          createdByUserId: userId,
        });
      }

      const row = await tx.financialEntry.update({
        where: { id },
        data: {
          status: newStatus,
          paidAt: isFullyPaid ? paidAt : entry.paidAt ?? paidAt,
          paymentMethod: primaryMethod ?? entry.paymentMethod,
          accountId: resolvedAccountId,
          costCenterId: dto.costCenterId ?? entry.costCenterId,
          discountAmount: new Prisma.Decimal(discount),
          discountPercent:
            dto.discountPercent != null && dto.discountPercent > 0
              ? new Prisma.Decimal(dto.discountPercent)
              : entry.discountPercent,
          amountReceived: new Prisma.Decimal(isFullyPaid ? netDue : newAmountPaid),
          amountPaid: new Prisma.Decimal(newAmountPaid),
          interestAmount: new Prisma.Decimal(
            this.roundMoney(Number(entry.interestAmount) + interest),
          ),
          penaltyAmount: new Prisma.Decimal(
            this.roundMoney(Number(entry.penaltyAmount) + penalty),
          ),
          feeAmount: new Prisma.Decimal(this.roundMoney(Number(entry.feeAmount) + fee)),
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

        if (entry.serviceOrderId && isFullyPaid) {
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

          const serviceOrder = await tx.serviceOrder.findFirst({
            where: { id: entry.serviceOrderId, organizationId },
            select: { attachmentsPurgeAt: true },
          });
          if (serviceOrder && !serviceOrder.attachmentsPurgeAt) {
            const attachmentsPurgeAt = new Date(paidAt);
            attachmentsPurgeAt.setDate(attachmentsPurgeAt.getDate() + 7);
            await tx.serviceOrder.update({
              where: { id: entry.serviceOrderId },
              data: { attachmentsPurgeAt },
            });
          }
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
        payAmount,
        newAmountPaid,
        status: newStatus,
        splits,
      },
    });

    if (
      entry.type === 'RECEIVABLE' &&
      entry.serviceOrderId &&
      isFullyPaid
    ) {
      try {
        await this.serviceOrders.deductPartsStockForExecution(
          organizationId,
          entry.serviceOrderId,
        );
      } catch (err) {
        // Não bloqueia a baixa financeira se o estoque falhar — registra e segue.
        await this.audit.log(organizationId, 'financial.pay_stock_deduct_failed', 'financial_entry', {
          userId,
          metadata: {
            entryId: id,
            serviceOrderId: entry.serviceOrderId,
            error: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }

    await this.invalidateDashboardCache(organizationId, paidAt);

    return updated;
  }

  async reverse(
    organizationId: string,
    id: string,
    reason: string,
    userId?: string,
  ) {
    const trimmedReason = reason?.trim();
    if (!trimmedReason || trimmedReason.length < 3) {
      throw new BadRequestException('Informe o motivo do estorno');
    }

    const entry = await this.prisma.financialEntry.findFirst({
      where: { id, organizationId },
      include: { paymentSplits: true },
    });
    if (!entry) throw new NotFoundException('Lançamento não encontrado');
    if (entry.status !== 'PAID' && entry.status !== 'PARTIAL') {
      throw new BadRequestException('Somente lançamentos pagos ou parciais podem ser estornados');
    }

    const amountToReverse = this.roundMoney(Number(entry.amountPaid ?? entry.amountReceived ?? entry.amount));
    if (amountToReverse <= 0) {
      throw new BadRequestException('Nenhum valor pago para estornar');
    }

    const reversed = await this.prisma.$transaction(async (tx) => {
      const movements = await tx.financialAccountMovement.findMany({
        where: { financialEntryId: id, organizationId },
        orderBy: { createdAt: 'desc' },
      });

      for (const mov of movements) {
        await this.ledger.post(tx, {
          organizationId,
          accountId: mov.accountId,
          direction: mov.direction === 'CREDIT' ? 'DEBIT' : 'CREDIT',
          amount: Number(mov.amount),
          movementKind: 'ADJUSTMENT',
          movementDate: new Date(),
          description: `Estorno: ${entry.description}`,
          financialEntryId: id,
          createdByUserId: userId,
        });
      }

      if (entry.type === 'RECEIVABLE' && entry.serviceOrderId && entry.paidAt) {
        await this.reversePaidEntryEffects(tx, organizationId, entry);
      }

      await tx.cashRegisterMovement.deleteMany({
        where: { financialEntryId: id },
      });

      return tx.financialEntry.update({
        where: { id },
        data: {
          status: 'REVERSED',
          amountPaid: new Prisma.Decimal(0),
          amountReceived: null,
          reversedAt: new Date(),
          reversedByUserId: userId ?? null,
          reversalReason: trimmedReason,
        },
        include: entryInclude,
      });
    });

    await this.audit.log(organizationId, 'financial.reverse', 'financial_entry', {
      userId,
      reason: trimmedReason,
      metadata: {
        entryId: id,
        amountReversed: amountToReverse,
      },
    });

    if (entry.paidAt) {
      await this.invalidateDashboardCache(organizationId, entry.paidAt);
    }

    return reversed;
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
    if (entry.status === 'PAID' || entry.status === 'PARTIAL') {
      throw new BadRequestException(
        'Lançamentos pagos devem ser estornados, não excluídos. Use a função de estorno.',
      );
    }

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

    await this.invalidateDashboardCache(organizationId, entry.paidAt ?? undefined);

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

  /** Agregado leve para gráficos do dashboard (sem array de lançamentos). */
  async getSummary(organizationId: string, month?: string) {
    const now = new Date();
    const [year, mon] = month
      ? month.split('-').map(Number)
      : [now.getFullYear(), now.getMonth() + 1];
    const monthStart = new Date(year, mon - 1, 1);
    const monthEnd = new Date(year, mon, 0, 23, 59, 59, 999);

    const [receivableAgg, payableAgg, splitGroups] = await Promise.all([
      this.prisma.financialEntry.aggregate({
        where: {
          organizationId,
          type: 'RECEIVABLE',
          status: 'PAID',
          paidAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amountReceived: true },
      }),
      this.prisma.financialEntry.aggregate({
        where: {
          organizationId,
          type: 'PAYABLE',
          status: 'PAID',
          paidAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amountReceived: true },
      }),
      this.prisma.financialPaymentSplit.groupBy({
        by: ['paymentMethod'],
        where: {
          organizationId,
          financialEntry: {
            type: 'RECEIVABLE',
            status: 'PAID',
            paidAt: { gte: monthStart, lte: monthEnd },
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const revenue = this.roundMoney(Number(receivableAgg._sum.amountReceived ?? 0));
    const expenses = this.roundMoney(Number(payableAgg._sum.amountReceived ?? 0));
    const profit = this.roundMoney(revenue - expenses);

    const paymentMethods: Record<string, number> = {};
    for (const row of splitGroups) {
      paymentMethods[row.paymentMethod] = this.roundMoney(Number(row._sum.amount ?? 0));
    }

    return { revenue, expenses, profit, paymentMethods };
  }
}
