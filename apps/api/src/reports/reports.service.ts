import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DateRange,
  endOfDay,
  parseReportRange,
  previousReportRange,
  roundMoney,
  startOfDay,
} from './reports-date.util';

type ProfitTotals = {
  partsProfit: number;
  servicesProfit: number;
  partsRevenue: number;
  servicesRevenue: number;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async full(organizationId: string, fromStr?: string, toStr?: string, compare = false) {
    const period = parseReportRange(fromStr, toStr);
    const comparisonPeriod = compare ? previousReportRange(period) : null;

    const [financial, operations, commercial, inventory] = await Promise.all([
      this.buildFinancial(organizationId, period),
      this.buildOperations(organizationId, period),
      this.buildCommercial(organizationId, period),
      this.buildInventory(organizationId, period),
    ]);

    const comparison = comparisonPeriod
      ? await this.buildComparison(
          organizationId,
          financial,
          operations,
          comparisonPeriod,
        )
      : null;

    return {
      period: {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
      },
      comparison: comparison
        ? {
            period: {
              from: comparisonPeriod!.from.toISOString(),
              to: comparisonPeriod!.to.toISOString(),
            },
            ...comparison,
          }
        : null,
      financial,
      operations,
      commercial,
      inventory,
    };
  }

  /** Métricas do painel — mesma base dos Relatórios BI, sem bloco comercial (mais rápido). */
  async dashboardMetrics(organizationId: string, fromStr?: string, toStr?: string) {
    const period = parseReportRange(fromStr, toStr);
    const [financial, operations, inventory] = await Promise.all([
      this.buildFinancial(organizationId, period),
      this.buildOperations(organizationId, period),
      this.buildInventory(organizationId, period),
    ]);
    return { financial, operations, inventory };
  }

  /** Só financeiro + estoque — para KPIs do dashboard sem carregar operações pesadas. */
  async dashboardFinancial(organizationId: string, fromStr?: string, toStr?: string) {
    const period = parseReportRange(fromStr, toStr);
    const [financial, inventory] = await Promise.all([
      this.buildFinancial(organizationId, period),
      this.buildInventory(organizationId, period),
    ]);
    return { financial, inventory };
  }

  summary(organizationId: string, fromStr?: string, toStr?: string) {
    return this.full(organizationId, fromStr, toStr, false).then((report) => ({
      dailyRevenue: report.financial.revenueToday,
      monthRevenue: report.financial.revenue,
      openReceivables: report.financial.openReceivables,
      openPayables: report.financial.openPayables,
      serviceOrdersByStatus: report.operations.ordersByStatus,
      revenueWeek: report.financial.revenueByDay.slice(-7),
      customersCount: report.commercial.totalCustomers,
      vehiclesCount: report.commercial.totalVehicles,
      openOrders: report.operations.openOrdersCount,
      lowStockCount: report.inventory.lowStockCount,
    }));
  }

  bi(organizationId: string, fromStr?: string, toStr?: string) {
    return this.full(organizationId, fromStr, toStr, false).then((report) => ({
      quoteConversion: report.commercial.quoteConversion,
      ordersByMechanic: report.operations.ordersByMechanic,
      inactiveCustomers: report.commercial.inactiveCustomers,
      dre: report.financial.dreByMonth,
      lowStock: report.inventory.lowStock,
    }));
  }

  exportData(organizationId: string, type: string, fromStr?: string, toStr?: string) {
    const period = parseReportRange(fromStr, toStr);
    return this.exportByType(organizationId, type, period);
  }

  private async buildComparison(
    organizationId: string,
    currentFinancial: Awaited<ReturnType<ReportsService['buildFinancial']>>,
    currentOperations: Awaited<ReturnType<ReportsService['buildOperations']>>,
    previous: DateRange,
  ) {
    const [prevFin, prevOps] = await Promise.all([
      this.buildFinancial(organizationId, previous),
      this.buildOperations(organizationId, previous),
    ]);

    const pct = (cur: number, prev: number) =>
      prev === 0 ? (cur > 0 ? 100 : 0) : roundMoney(((cur - prev) / prev) * 100);

    return {
      revenueChange: pct(currentFinancial.revenue, prevFin.revenue),
      profitChange: pct(currentFinancial.totalProfit, prevFin.totalProfit),
      averageTicketChange: pct(currentOperations.averageTicket, prevOps.averageTicket),
      deliveredOrdersChange: pct(currentOperations.deliveredCount, prevOps.deliveredCount),
      previousRevenue: prevFin.revenue,
      previousProfit: prevFin.totalProfit,
    };
  }

  private async buildFinancial(organizationId: string, period: DateRange) {
    const today = startOfDay(new Date());
    const profit = await this.calcProfit(organizationId, period);

    const [
      paidEntries,
      paymentSplitDetails,
      openReceivablesAgg,
      openPayablesAgg,
      overdueReceivables,
      cashMovements,
      discountsAgg,
      interestFeesAgg,
    ] = await Promise.all([
      this.prisma.financialEntry.findMany({
        where: {
          organizationId,
          status: 'PAID',
          paidAt: { gte: period.from, lte: period.to },
        },
        select: { type: true, amount: true, amountReceived: true, paidAt: true },
      }),
      this.prisma.financialPaymentSplit.findMany({
        where: {
          organizationId,
          financialEntry: {
            status: 'PAID',
            type: 'RECEIVABLE',
            paidAt: { gte: period.from, lte: period.to },
          },
        },
        select: {
          paymentMethod: true,
          amount: true,
          financialEntry: {
            select: {
              description: true,
              paidAt: true,
              customer: { select: { name: true } },
              serviceOrder: { select: { number: true } },
            },
          },
        },
      }),
      this.prisma.financialEntry.aggregate({
        where: { organizationId, status: 'OPEN', type: 'RECEIVABLE' },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.financialEntry.aggregate({
        where: { organizationId, status: 'OPEN', type: 'PAYABLE' },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.financialEntry.findMany({
        where: {
          organizationId,
          status: 'OPEN',
          type: 'RECEIVABLE',
          dueDate: { lt: today },
        },
        include: {
          customer: { select: { name: true } },
          serviceOrder: { select: { number: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 50,
      }),
      this.prisma.cashRegisterMovement.findMany({
        where: {
          organizationId,
          createdAt: { gte: period.from, lte: period.to },
        },
        select: { movementType: true, amount: true },
      }),
      this.prisma.financialEntry.aggregate({
        where: {
          organizationId,
          status: 'PAID',
          type: 'RECEIVABLE',
          paidAt: { gte: period.from, lte: period.to },
        },
        _sum: { discountAmount: true },
      }),
      this.prisma.financialEntry.aggregate({
        where: {
          organizationId,
          status: 'PAID',
          paidAt: { gte: period.from, lte: period.to },
        },
        _sum: {
          interestAmount: true,
          penaltyAmount: true,
          feeAmount: true,
        },
      }),
    ]);

    let revenue = 0;
    let expense = 0;
    const dreByMonth = new Map<string, { revenue: number; expense: number }>();
    for (const entry of paidEntries) {
      if (!entry.paidAt) continue;
      const amt = this.paidEntryAmount(entry);
      const key = `${entry.paidAt.getFullYear()}-${String(entry.paidAt.getMonth() + 1).padStart(2, '0')}`;
      const row = dreByMonth.get(key) ?? { revenue: 0, expense: 0 };
      if (entry.type === 'RECEIVABLE') {
        revenue += amt;
        row.revenue += amt;
      } else {
        expense += amt;
        row.expense += amt;
      }
      dreByMonth.set(key, row);
    }

    const profitMetrics = this.composeProfitMetrics(
      profit,
      paidEntries.filter((entry) => entry.type === 'PAYABLE'),
    );

    const paymentMethodMap = new Map<string, { amount: number; count: number }>();
    const paymentReceipts: Array<{
      paymentMethod: string;
      amount: number;
      customerName: string | null;
      description: string;
      serviceOrderNumber: number | null;
      paidAt: Date | null;
    }> = [];

    for (const split of paymentSplitDetails) {
      const key = split.paymentMethod;
      const cur = paymentMethodMap.get(key) ?? { amount: 0, count: 0 };
      cur.amount += Number(split.amount);
      cur.count += 1;
      paymentMethodMap.set(key, cur);
      paymentReceipts.push({
        paymentMethod: split.paymentMethod,
        amount: roundMoney(Number(split.amount)),
        customerName: split.financialEntry.customer?.name ?? null,
        description: split.financialEntry.description,
        serviceOrderNumber: split.financialEntry.serviceOrder?.number ?? null,
        paidAt: split.financialEntry.paidAt,
      });
    }

    const legacyPaid = await this.prisma.financialEntry.findMany({
      where: {
        organizationId,
        status: 'PAID',
        type: 'RECEIVABLE',
        paidAt: { gte: period.from, lte: period.to },
        paymentMethod: { not: null },
        paymentSplits: { none: {} },
      },
      select: { paymentMethod: true, amount: true },
    });
    for (const row of legacyPaid) {
      const key = row.paymentMethod!;
      const cur = paymentMethodMap.get(key) ?? { amount: 0, count: 0 };
      cur.amount += Number(row.amount);
      cur.count += 1;
      paymentMethodMap.set(key, cur);
    }

    let paymentIn = 0;
    let supply = 0;
    let withdrawal = 0;
    let paymentOut = 0;
    for (const m of cashMovements) {
      const amt = Number(m.amount);
      if (m.movementType === 'PAYMENT_IN') paymentIn += amt;
      else if (m.movementType === 'SUPPLY') supply += amt;
      else if (m.movementType === 'WITHDRAWAL') withdrawal += amt;
      else if (m.movementType === 'PAYMENT_OUT') paymentOut += amt;
    }

    const todayEnd = endOfDay(today);
    const revenueToday = roundMoney(
      paidEntries
        .filter(
          (e) =>
            e.type === 'RECEIVABLE' &&
            e.paidAt &&
            e.paidAt >= today &&
            e.paidAt <= todayEnd,
        )
        .reduce((sum, e) => sum + this.paidEntryAmount(e), 0),
    );

    const revenueByDayMap = new Map<string, { date: Date; amount: number }>();
    for (const entry of paidEntries) {
      if (entry.type !== 'RECEIVABLE' || !entry.paidAt) continue;
      const day = startOfDay(entry.paidAt);
      const key = this.toLocalIsoDate(day);
      const row = revenueByDayMap.get(key) ?? { date: day, amount: 0 };
      row.amount += this.paidEntryAmount(entry);
      revenueByDayMap.set(key, row);
    }
    const revenueByDay = Array.from(revenueByDayMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((row) => ({
        date: row.date,
        amount: roundMoney(row.amount),
      }));

    return {
      revenueToday,
      revenue: roundMoney(revenue),
      expense: roundMoney(expense),
      expenses: profitMetrics.expenses,
      result: roundMoney(revenue - expense),
      partsProfit: profitMetrics.partsProfit,
      servicesProfit: profitMetrics.servicesProfit,
      grossProfit: profitMetrics.grossProfit,
      totalProfit: profitMetrics.totalProfit,
      partsRevenue: profit.partsRevenue,
      servicesRevenue: profit.servicesRevenue,
      discountsGiven: roundMoney(Number(discountsAgg._sum.discountAmount ?? 0)),
      interestPaid: roundMoney(
        Number(interestFeesAgg._sum.interestAmount ?? 0) +
          Number(interestFeesAgg._sum.penaltyAmount ?? 0),
      ),
      cardFees: roundMoney(Number(interestFeesAgg._sum.feeAmount ?? 0)),
      openReceivables: {
        count: openReceivablesAgg._count._all,
        amount: Number(openReceivablesAgg._sum.amount ?? 0),
      },
      openPayables: {
        count: openPayablesAgg._count._all,
        amount: Number(openPayablesAgg._sum.amount ?? 0),
      },
      overdueReceivables: overdueReceivables.map((r) => ({
        id: r.id,
        description: r.description,
        amount: Number(r.amount),
        dueDate: r.dueDate,
        customerName: r.customer?.name ?? null,
        serviceOrderNumber: r.serviceOrder?.number ?? null,
      })),
      paymentMethods: Array.from(paymentMethodMap.entries())
        .map(([method, v]) => ({
          method,
          amount: roundMoney(v.amount),
          count: v.count,
        }))
        .sort((a, b) => b.amount - a.amount),
      cashFlow: {
        paymentIn: roundMoney(paymentIn),
        supply: roundMoney(supply),
        withdrawal: roundMoney(withdrawal),
        paymentOut: roundMoney(paymentOut),
        netCash: roundMoney(paymentIn + supply - withdrawal - paymentOut),
      },
      dreByMonth: Array.from(dreByMonth.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({
          month,
          revenue: roundMoney(v.revenue),
          expense: roundMoney(v.expense),
          result: roundMoney(v.revenue - v.expense),
        })),
      revenueByDay: revenueByDay.map((r) => ({
        date: r.date,
        amount: r.amount,
      })),
      paymentReceipts: paymentReceipts.sort(
        (a, b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0),
      ),
    };
  }

  private async buildOperations(organizationId: string, period: DateRange) {
    const now = new Date();
    const [
      ordersByStatus,
      openOrdersCount,
      deliveredOrders,
      delayedOrders,
      ordersWithMechanic,
      deliveredItems,
      ordersCreated,
    ] = await Promise.all([
      this.prisma.serviceOrder.groupBy({
        by: ['status'],
        where: { organizationId, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.serviceOrder.count({
        where: {
          organizationId,
          deletedAt: null,
          status: {
            in: [
              'RECEIVED',
              'DIAGNOSIS',
              'AWAITING_QUOTE',
              'AWAITING_APPROVAL',
              'APPROVED',
              'IN_PROGRESS',
              'AWAITING_PART',
            ],
          },
        },
      }),
      this.prisma.serviceOrder.findMany({
        where: {
          organizationId,
          status: 'DELIVERED',
          updatedAt: { gte: period.from, lte: period.to },
          deletedAt: null,
        },
        include: {
          vehicle: { include: { customer: true } },
          items: { include: { product: { select: { costPrice: true } } } },
        },
      }),
      this.prisma.serviceOrder.findMany({
        where: {
          organizationId,
          deletedAt: null,
          estimatedAt: { lt: now },
          status: {
            notIn: ['DELIVERED', 'CANCELLED'],
          },
        },
        include: {
          vehicle: { include: { customer: true } },
        },
        orderBy: { estimatedAt: 'asc' },
        take: 30,
      }),
      this.prisma.serviceOrder.findMany({
        where: {
          organizationId,
          mechanicMemberId: { not: null },
          updatedAt: { gte: period.from, lte: period.to },
          deletedAt: null,
        },
        select: {
          mechanicMemberId: true,
          totalAmount: true,
          createdAt: true,
          updatedAt: true,
          status: true,
          mechanic: { include: { user: { select: { name: true } } } },
        },
      }),
      this.prisma.serviceOrderItem.findMany({
        where: {
          organizationId,
          serviceOrder: {
            status: 'DELIVERED',
            updatedAt: { gte: period.from, lte: period.to },
            deletedAt: null,
          },
        },
        include: { product: { select: { costPrice: true, name: true } } },
      }),
      this.prisma.serviceOrder.findMany({
        where: {
          organizationId,
          createdAt: { gte: period.from, lte: period.to },
          deletedAt: null,
        },
        select: { createdAt: true },
      }),
    ]);

    const dowLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const heatmapCounts = new Map<string, number>();
    for (const order of ordersCreated) {
      const key = `${order.createdAt.getDay()}-${order.createdAt.getHours()}`;
      heatmapCounts.set(key, (heatmapCounts.get(key) ?? 0) + 1);
    }
    const ordersHeatmap: Array<{
      dow: number;
      hour: number;
      dayLabel: string;
      count: number;
    }> = [];
    for (let dow = 0; dow < 7; dow += 1) {
      for (let hour = 7; hour <= 19; hour += 1) {
        ordersHeatmap.push({
          dow,
          hour,
          dayLabel: dowLabels[dow],
          count: heatmapCounts.get(`${dow}-${hour}`) ?? 0,
        });
      }
    }

    let totalDeliveryMs = 0;
    let ticketSum = 0;
    const marginByOrder = deliveredOrders.map((order) => {
      const revenue = Number(order.totalAmount);
      let cost = 0;
      for (const item of order.items) {
        if (item.itemType === 'PART') {
          cost += Number(item.product?.costPrice ?? 0) * item.quantity;
        }
      }
      const margin = revenue - cost;
      totalDeliveryMs += order.updatedAt.getTime() - order.createdAt.getTime();
      ticketSum += revenue;
      return {
        id: order.id,
        number: order.number,
        customerName: order.vehicle.customer.name,
        plate: order.vehicle.plate,
        revenue: roundMoney(revenue),
        cost: roundMoney(cost),
        margin: roundMoney(margin),
        marginPercent: revenue > 0 ? roundMoney((margin / revenue) * 100) : 0,
        deliveredAt: order.updatedAt,
      };
    });

    const mechanicMap = new Map<
      string,
      { name: string; count: number; total: number; deliveryMs: number; delivered: number }
    >();
    for (const order of ordersWithMechanic) {
      const key = order.mechanicMemberId!;
      const name = order.mechanic?.user?.name ?? 'Mecânico';
      const cur = mechanicMap.get(key) ?? {
        name,
        count: 0,
        total: 0,
        deliveryMs: 0,
        delivered: 0,
      };
      cur.count += 1;
      cur.total += Number(order.totalAmount);
      if (order.status === 'DELIVERED') {
        cur.delivered += 1;
        cur.deliveryMs += order.updatedAt.getTime() - order.createdAt.getTime();
      }
      mechanicMap.set(key, cur);
    }

    const serviceMap = new Map<string, { description: string; count: number; revenue: number }>();
    const partMap = new Map<string, { description: string; count: number; revenue: number; profit: number }>();
    for (const item of deliveredItems) {
      const revenue = Number(item.unitPrice) * item.quantity;
      if (item.itemType === 'SERVICE') {
        const cur = serviceMap.get(item.description) ?? {
          description: item.description,
          count: 0,
          revenue: 0,
        };
        cur.count += item.quantity;
        cur.revenue += revenue;
        serviceMap.set(item.description, cur);
      } else {
        const cost = Number(item.product?.costPrice ?? 0) * item.quantity;
        const key = item.product?.name ?? item.description;
        const cur = partMap.get(key) ?? {
          description: key,
          count: 0,
          revenue: 0,
          profit: 0,
        };
        cur.count += item.quantity;
        cur.revenue += revenue;
        cur.profit += revenue - cost;
        partMap.set(key, cur);
      }
    }

    const deliveredCount = deliveredOrders.length;
    const averageDeliveryDays =
      deliveredCount > 0
        ? roundMoney(totalDeliveryMs / deliveredCount / (1000 * 60 * 60 * 24))
        : 0;

    return {
      ordersByStatus: ordersByStatus.map((r) => ({
        status: r.status,
        count: r._count._all,
      })),
      openOrdersCount,
      deliveredCount,
      averageTicket: deliveredCount > 0 ? roundMoney(ticketSum / deliveredCount) : 0,
      averageDeliveryDays,
      delayedOrders: delayedOrders.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        customerName: o.vehicle.customer.name,
        plate: o.vehicle.plate,
        estimatedAt: o.estimatedAt,
      })),
      ordersByMechanic: Array.from(mechanicMap.values())
        .map((m) => ({
          name: m.name,
          count: m.count,
          total: roundMoney(m.total),
          deliveredCount: m.delivered,
          averageDeliveryDays:
            m.delivered > 0
              ? roundMoney(m.deliveryMs / m.delivered / (1000 * 60 * 60 * 24))
              : 0,
        }))
        .sort((a, b) => b.count - a.count),
      topServices: Array.from(serviceMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 15)
        .map((s) => ({ ...s, revenue: roundMoney(s.revenue) })),
      topParts: Array.from(partMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 15)
        .map((p) => ({
          description: p.description,
          count: p.count,
          revenue: roundMoney(p.revenue),
          profit: roundMoney(p.profit),
        })),
      marginByOrder: marginByOrder
        .sort((a, b) => b.margin - a.margin)
        .slice(0, 20),
      ordersHeatmap,
      ordersCreatedCount: ordersCreated.length,
    };
  }

  private async buildCommercial(organizationId: string, period: DateRange) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [
      quotesInPeriod,
      deliveredInPeriod,
      customersCount,
      vehiclesCount,
      customers,
      allCustomers,
    ] = await Promise.all([
      this.prisma.quote.groupBy({
        by: ['status'],
        where: {
          organizationId,
          deletedAt: null,
          createdAt: { gte: period.from, lte: period.to },
        },
        _count: { _all: true },
      }),
      this.prisma.serviceOrder.findMany({
        where: {
          organizationId,
          status: 'DELIVERED',
          updatedAt: { gte: period.from, lte: period.to },
          deletedAt: null,
        },
        include: {
          vehicle: { include: { customer: true } },
        },
      }),
      this.prisma.customer.count({
        where: { organizationId, isActive: true, deletedAt: null },
      }),
      this.prisma.vehicle.count({ where: { organizationId } }),
      this.prisma.customer.findMany({
        where: { organizationId, isActive: true, deletedAt: null },
        include: {
          vehicles: {
            include: {
              serviceOrders: {
                where: { updatedAt: { gte: ninetyDaysAgo } },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      }),
      this.prisma.customer.findMany({
        where: { organizationId, isActive: true, deletedAt: null },
        select: { id: true, name: true, origin: true },
      }),
    ]);

    const funnel = { DRAFT: 0, PENDING: 0, APPROVED: 0, REJECTED: 0, total: 0 };
    for (const row of quotesInPeriod) {
      funnel[row.status] = row._count._all;
      funnel.total += row._count._all;
    }
    const approved = funnel.APPROVED;
    const nonDraft = funnel.total - funnel.DRAFT;

    const customerRevenue = new Map<string, { id: string; name: string; revenue: number; orders: number }>();
    for (const order of deliveredInPeriod) {
      const cid = order.vehicle.customer.id;
      const cur = customerRevenue.get(cid) ?? {
        id: cid,
        name: order.vehicle.customer.name,
        revenue: 0,
        orders: 0,
      };
      cur.revenue += Number(order.totalAmount);
      cur.orders += 1;
      customerRevenue.set(cid, cur);
    }

    const originMap = new Map<string, number>();
    for (const c of allCustomers) {
      const key = c.origin?.trim() || 'Não informado';
      originMap.set(key, (originMap.get(key) ?? 0) + 1);
    }

    const returningIds = new Set<string>();
    const periodCustomerIds = new Set(deliveredInPeriod.map((o) => o.vehicle.customer.id));
    if (periodCustomerIds.size > 0) {
      const priorOrders = await this.prisma.serviceOrder.findMany({
        where: {
          organizationId,
          status: 'DELIVERED',
          createdAt: { lt: period.from },
          vehicle: { customerId: { in: Array.from(periodCustomerIds) } },
        },
        select: { vehicle: { select: { customerId: true } } },
      });
      for (const o of priorOrders) {
        if (periodCustomerIds.has(o.vehicle.customerId)) {
          returningIds.add(o.vehicle.customerId);
        }
      }
    }

    const inactiveCustomers = customers
      .filter((c) => !c.vehicles.some((v) => v.serviceOrders.length > 0))
      .map((c) => ({ id: c.id, name: c.name, phone: c.phone }));

    const returningList = Array.from(customerRevenue.values()).filter((c) =>
      returningIds.has(c.id),
    );

    return {
      totalCustomers: customersCount,
      totalVehicles: vehiclesCount,
      quoteFunnel: funnel,
      quoteConversion: {
        total: nonDraft,
        approved,
        rate: nonDraft > 0 ? Math.round((approved / nonDraft) * 100) : 0,
      },
      topCustomers: Array.from(customerRevenue.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 15)
        .map((c) => ({
          id: c.id,
          name: c.name,
          revenue: roundMoney(c.revenue),
          orderCount: c.orders,
        })),
      customersByOrigin: Array.from(originMap.entries())
        .map(([origin, count]) => ({ origin, count }))
        .sort((a, b) => b.count - a.count),
      returningCustomers: {
        count: returningList.length,
        rate:
          deliveredInPeriod.length > 0
            ? Math.round((returningList.length / periodCustomerIds.size) * 100)
            : 0,
        list: returningList
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 15)
          .map((c) => ({
            id: c.id,
            name: c.name,
            revenue: roundMoney(c.revenue),
            orderCount: c.orders,
          })),
      },
      inactiveCustomers,
    };
  }

  private async buildInventory(organizationId: string, period: DateRange) {
    const [products, purchases, soldItems] = await Promise.all([
      this.prisma.product.findMany({
        where: { organizationId, deletedAt: null },
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          reservedStock: true,
          minStock: true,
          salePrice: true,
          costPrice: true,
        },
      }),
      this.prisma.purchaseOrder.findMany({
        where: {
          organizationId,
          createdAt: { gte: period.from, lte: period.to },
          status: { not: 'CANCELLED' },
        },
        select: {
          supplierName: true,
          totalAmount: true,
          status: true,
          number: true,
          createdAt: true,
          supplier: { select: { legalName: true, tradeName: true } },
        },
      }),
      this.prisma.serviceOrderItem.findMany({
        where: {
          organizationId,
          itemType: 'PART',
          productId: { not: null },
          serviceOrder: {
            status: 'DELIVERED',
            updatedAt: { gte: period.from, lte: period.to },
          },
        },
        select: {
          productId: true,
          quantity: true,
          unitPrice: true,
          product: { select: { name: true, sku: true } },
        },
      }),
    ]);

    const lowStock = products.filter((p) => p.stock - p.reservedStock <= p.minStock);
    const stockValue = products.reduce(
      (sum, p) => sum + Number(p.costPrice) * p.stock,
      0,
    );

    const soldMap = new Map<
      string,
      { name: string; sku: string | null; soldQty: number; revenue: number }
    >();
    for (const item of soldItems) {
      if (!item.productId) continue;
      const cur = soldMap.get(item.productId) ?? {
        name: item.product?.name ?? 'Peça',
        sku: item.product?.sku ?? null,
        soldQty: 0,
        revenue: 0,
      };
      cur.soldQty += item.quantity;
      cur.revenue += Number(item.unitPrice) * item.quantity;
      soldMap.set(item.productId, cur);
    }

    const soldIds = new Set(soldMap.keys());
    const slowMoving = products
      .filter((p) => p.stock > 0 && !soldIds.has(p.id))
      .map((p) => ({
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        stockValue: roundMoney(Number(p.costPrice) * p.stock),
      }))
      .sort((a, b) => b.stockValue - a.stockValue)
      .slice(0, 15);

    const supplierMap = new Map<string, { supplier: string; count: number; total: number }>();
    for (const po of purchases) {
      const name =
        po.supplier?.tradeName || po.supplier?.legalName || po.supplierName;
      const cur = supplierMap.get(name) ?? {
        supplier: name,
        count: 0,
        total: 0,
      };
      cur.count += 1;
      cur.total += Number(po.totalAmount);
      supplierMap.set(name, cur);
    }

    return {
      lowStockCount: lowStock.length,
      lowStock: lowStock.map((p) => ({
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        reservedStock: p.reservedStock,
        minStock: p.minStock,
        salePrice: Number(p.salePrice),
      })),
      stockValue: roundMoney(stockValue),
      reorderSuggestion: lowStock.map((p) => ({
        name: p.name,
        sku: p.sku,
        currentStock: p.stock - p.reservedStock,
        minStock: p.minStock,
        suggestedQty: Math.max(p.minStock - (p.stock - p.reservedStock), 1),
      })),
      topMovingProducts: Array.from(soldMap.values())
        .sort((a, b) => b.soldQty - a.soldQty)
        .slice(0, 15)
        .map((p) => ({ ...p, revenue: roundMoney(p.revenue) })),
      slowMovingProducts: slowMoving,
      purchasesBySupplier: Array.from(supplierMap.values())
        .map((s) => ({ ...s, total: roundMoney(s.total) }))
        .sort((a, b) => b.total - a.total),
      purchases: purchases.map((p) => ({
        number: p.number,
        supplierName: p.supplierName,
        status: p.status,
        totalAmount: Number(p.totalAmount),
        createdAt: p.createdAt,
      })),
    };
  }

  async profitForPeriod(organizationId: string, period: DateRange) {
    const [profit, paidReceivables, paidPayables] = await Promise.all([
      this.calcProfit(organizationId, period),
      this.prisma.financialEntry.findMany({
        where: {
          organizationId,
          status: 'PAID',
          type: 'RECEIVABLE',
          paidAt: { gte: period.from, lte: period.to },
        },
        select: { amountReceived: true, amount: true },
      }),
      this.prisma.financialEntry.findMany({
        where: {
          organizationId,
          status: 'PAID',
          type: 'PAYABLE',
          paidAt: { gte: period.from, lte: period.to },
        },
        select: { amountReceived: true, amount: true },
      }),
    ]);

    const partsProfit = profit.partsProfit;
    const servicesProfit = profit.servicesProfit;
    const metrics = this.composeProfitMetrics(profit, paidPayables);

    return {
      from: this.toLocalIsoDate(period.from),
      to: this.toLocalIsoDate(period.to),
      revenue: roundMoney(
        paidReceivables.reduce((sum, entry) => sum + this.paidEntryAmount(entry), 0),
      ),
      expenses: metrics.expenses,
      partsProfit,
      servicesProfit,
      grossProfit: metrics.grossProfit,
      totalProfit: metrics.totalProfit,
      partsRevenue: profit.partsRevenue,
      servicesRevenue: profit.servicesRevenue,
    };
  }

  private paidEntryAmount(entry: {
    amount: { toString(): string } | number;
    amountReceived?: { toString(): string } | number | null;
  }) {
    return Number(entry.amountReceived ?? entry.amount);
  }

  private composeProfitMetrics(
    profit: ProfitTotals,
    paidPayables: Array<{
      amount: { toString(): string } | number;
      amountReceived?: { toString(): string } | number | null;
    }>,
  ) {
    const partsProfit = profit.partsProfit;
    const servicesProfit = profit.servicesProfit;
    const grossProfit = roundMoney(partsProfit + servicesProfit);
    const expenses = roundMoney(
      paidPayables.reduce((sum, entry) => sum + this.paidEntryAmount(entry), 0),
    );
    return {
      partsProfit,
      servicesProfit,
      grossProfit,
      expenses,
      totalProfit: roundMoney(grossProfit - expenses),
    };
  }

  private async calcProfit(organizationId: string, period: DateRange): Promise<ProfitTotals> {
    const items = await this.prisma.serviceOrderItem.findMany({
      where: {
        organizationId,
        serviceOrder: {
          status: 'DELIVERED',
          updatedAt: { gte: period.from, lte: period.to },
          deletedAt: null,
        },
      },
      include: { product: { select: { costPrice: true, averageCost: true } } },
    });

    let partsProfit = 0;
    let servicesProfit = 0;
    let partsRevenue = 0;
    let servicesRevenue = 0;
    for (const item of items) {
      const revenue = Number(item.unitPrice) * item.quantity - Number(item.discount);
      if (item.itemType === 'PART') {
        partsRevenue += revenue;
        const unitCost =
          item.unitCost != null
            ? Number(item.unitCost)
            : Number(item.product?.averageCost) || Number(item.product?.costPrice ?? 0);
        const cost = unitCost * item.quantity;
        partsProfit += revenue - cost;
      } else {
        servicesRevenue += revenue;
        servicesProfit += revenue;
      }
    }
    return {
      partsProfit: roundMoney(partsProfit),
      servicesProfit: roundMoney(servicesProfit),
      partsRevenue: roundMoney(partsRevenue),
      servicesRevenue: roundMoney(servicesRevenue),
    };
  }

  private async exportByType(organizationId: string, type: string, period: DateRange) {
    const report = await this.full(
      organizationId,
      period.from.toISOString().slice(0, 10),
      period.to.toISOString().slice(0, 10),
      false,
    );

    switch (type) {
      case 'financial':
        return this.prisma.financialEntry.findMany({
          where: {
            organizationId,
            parentEntryId: null,
            OR: [
              { dueDate: { gte: period.from, lte: period.to } },
              { paidAt: { gte: period.from, lte: period.to } },
            ],
          },
          orderBy: { dueDate: 'asc' },
        });
      case 'service-orders':
        return this.prisma.serviceOrder.findMany({
          where: {
            organizationId,
            createdAt: { gte: period.from, lte: period.to },
          },
          include: { vehicle: { include: { customer: true } } },
          orderBy: { number: 'desc' },
        });
      case 'low-stock':
        return report.inventory.lowStock;
      case 'inactive-customers':
        return report.commercial.inactiveCustomers;
      case 'profit-margin':
        return report.operations.marginByOrder;
      case 'payment-methods':
        return report.financial.paymentMethods;
      case 'overdue-receivables':
        return report.financial.overdueReceivables;
      case 'cash-flow':
        return [report.financial.cashFlow];
      case 'delayed-orders':
        return report.operations.delayedOrders;
      case 'top-customers':
        return report.commercial.topCustomers;
      case 'top-services':
        return report.operations.topServices;
      case 'top-parts':
        return report.operations.topParts;
      case 'quote-funnel':
        return [report.commercial.quoteFunnel];
      case 'mechanic-productivity':
        return report.operations.ordersByMechanic;
      case 'stock-value':
        return [
          { stockValue: report.inventory.stockValue, lowStockCount: report.inventory.lowStockCount },
          ...report.inventory.slowMovingProducts,
        ];
      case 'purchases-by-supplier':
        return report.inventory.purchasesBySupplier;
      case 'customer-origins':
        return report.commercial.customersByOrigin;
      case 'returning-customers':
        return report.commercial.returningCustomers.list;
      case 'reorder-suggestion':
        return report.inventory.reorderSuggestion;
      case 'top-moving-products':
        return report.inventory.topMovingProducts;
      case 'full-summary':
        return [this.flattenSummary(report)];
      default:
        return [];
    }
  }

  private toLocalIsoDate(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private flattenSummary(report: Awaited<ReturnType<ReportsService['full']>>) {
    return {
      periodo_inicio: report.period.from,
      periodo_fim: report.period.to,
      faturamento: report.financial.revenue,
      despesas: report.financial.expense,
      resultado: report.financial.result,
      lucro_pecas: report.financial.partsProfit,
      lucro_servicos: report.financial.servicesProfit,
      lucro_bruto: report.financial.grossProfit,
      despesas_pagas: report.financial.expenses,
      lucro_total: report.financial.totalProfit,
      descontos: report.financial.discountsGiven,
      ticket_medio: report.operations.averageTicket,
      os_entregues: report.operations.deliveredCount,
      tempo_medio_entrega_dias: report.operations.averageDeliveryDays,
      conversao_orcamentos_pct: report.commercial.quoteConversion.rate,
      valor_estoque: report.inventory.stockValue,
      a_receber: report.financial.openReceivables.amount,
      a_pagar: report.financial.openPayables.amount,
    };
  }
}
