import { Injectable } from '@nestjs/common';
import { ServiceOrderStatus } from '@autocore/database';
import { notDeleted } from '../common/soft-delete';
import { endOfDay, roundMoney, startOfDay } from '../reports/reports-date.util';
import { PROFIT_RECOGNIZED_STATUSES } from '../reports/reports-profit.util';
import { ReportsService } from '../reports/reports.service';
import { PrismaService } from '../prisma/prisma.service';

const OPEN_STATUSES: ServiceOrderStatus[] = [
  'RECEIVED',
  'DIAGNOSIS',
  'AWAITING_QUOTE',
  'AWAITING_APPROVAL',
  'APPROVED',
  'IN_PROGRESS',
  'AWAITING_PART',
];

const IN_SHOP_STATUSES: ServiceOrderStatus[] = [
  'RECEIVED',
  'DIAGNOSIS',
  'AWAITING_QUOTE',
  'AWAITING_APPROVAL',
  'APPROVED',
  'IN_PROGRESS',
  'AWAITING_PART',
  'FINISHED',
];

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

  /** Rápido — contagens diretas (como antes do Relatórios BI). */
  async getOperationalKpis(organizationId: string) {
    const active = { organizationId, ...notDeleted };

    const [
      openServiceOrders,
      vehiclesInShop,
      pendingQuotes,
      delayedServices,
      waitingClients,
      lowStockParts,
    ] = await Promise.all([
      this.prisma.serviceOrder.count({
        where: { ...active, status: { in: OPEN_STATUSES } },
      }),
      this.prisma.serviceOrder.count({
        where: { ...active, status: { in: IN_SHOP_STATUSES } },
      }),
      this.prisma.quote.count({
        where: { ...active, status: 'PENDING' },
      }),
      this.prisma.serviceOrder.count({
        where: {
          ...active,
          status: { in: ['IN_PROGRESS', 'AWAITING_PART'] },
          estimatedAt: { lt: new Date() },
        },
      }),
      this.prisma.serviceOrder.groupBy({
        by: ['vehicleId'],
        where: {
          ...active,
          status: { in: ['AWAITING_APPROVAL', 'RECEIVED'] },
        },
      }),
      this.prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int as count FROM products
        WHERE organization_id = ${organizationId}
          AND deleted_at IS NULL
          AND stock <= min_stock
      `.then((r) => Number(r[0]?.count ?? 0)),
    ]);

    return {
      openServiceOrders,
      openServiceOrdersTrend: 0,
      vehiclesInShop,
      vehiclesInShopTrend: 0,
      pendingQuotes,
      pendingQuotesTrend: 0,
      lowStockParts,
      lowStockPartsTrend: 0,
      delayedServices,
      waitingClients: waitingClients.length,
    };
  }

  /** Financeiro — mesma base dos Relatórios BI (pode demorar mais). */
  async getFinancialKpis(organizationId: string) {
    const today = startOfDay(new Date());
    const todayEnd = endOfDay(today);
    const yesterday = startOfDay(new Date(today));
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = endOfDay(yesterday);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const active = { organizationId, ...notDeleted };

    const fromStr = this.toLocalIsoDate(monthStart);
    const toStr = this.toLocalIsoDate(today);
    const todayStr = this.toLocalIsoDate(today);
    const yesterdayStr = this.toLocalIsoDate(yesterday);

    const paidReceivable = {
      organizationId,
      status: 'PAID' as const,
      type: 'RECEIVABLE' as const,
    };

    const [report, todayReport, yesterdayReport, paidTodayAgg, paidYesterdayAgg, deliveredOrdersMonth] =
      await Promise.all([
        this.reportsService.dashboardFinancial(organizationId, fromStr, toStr),
        this.reportsService.dashboardFinancial(organizationId, todayStr, todayStr),
        this.reportsService.dashboardFinancial(organizationId, yesterdayStr, yesterdayStr),
        this.prisma.financialEntry.aggregate({
          where: {
            ...paidReceivable,
            paidAt: { gte: today, lte: todayEnd },
          },
          _sum: { amount: true },
        }),
        this.prisma.financialEntry.aggregate({
          where: {
            ...paidReceivable,
            paidAt: { gte: yesterday, lte: yesterdayEnd },
          },
          _sum: { amount: true },
        }),
        this.prisma.serviceOrder.findMany({
          where: {
            ...active,
            status: { in: PROFIT_RECOGNIZED_STATUSES },
            updatedAt: { gte: monthStart, lte: todayEnd },
          },
          select: { totalAmount: true, createdAt: true, updatedAt: true },
        }),
      ]);

    const dailyAmount = roundMoney(Number(paidTodayAgg._sum.amount ?? 0));
    const yesterdayAmount = Number(paidYesterdayAgg._sum.amount ?? 0);
    const dailyProfit = todayReport.financial.totalProfit;
    const yesterdayProfit = yesterdayReport.financial.totalProfit;

    const ticketSum = deliveredOrdersMonth.reduce(
      (s, o) => s + Number(o.totalAmount),
      0,
    );
    const averageTicket =
      deliveredOrdersMonth.length > 0
        ? roundMoney(ticketSum / deliveredOrdersMonth.length)
        : 0;

    let totalServiceMs = 0;
    for (const order of deliveredOrdersMonth) {
      totalServiceMs += order.updatedAt.getTime() - order.createdAt.getTime();
    }
    const averageServiceTimeMinutes =
      deliveredOrdersMonth.length > 0
        ? Math.round(totalServiceMs / deliveredOrdersMonth.length / (1000 * 60))
        : 0;

    return {
      dailyRevenue: dailyAmount,
      dailyRevenueTrend: this.percentTrend(dailyAmount, yesterdayAmount),
      dailyProfit,
      dailyProfitTrend: this.percentTrend(dailyProfit, yesterdayProfit),
      invoicesThisMonth: deliveredOrdersMonth.length,
      averageTicket,
      monthlyRevenue: report.financial.revenue,
      averageServiceTimeMinutes,
      partsProfit: report.financial.partsProfit,
      servicesProfit: report.financial.servicesProfit,
      grossProfit: report.financial.grossProfit,
      expenses: report.financial.expenses,
      totalProfit: report.financial.totalProfit,
    };
  }

  /** Legado — operacional + financeiro em uma chamada. */
  async getKpis(organizationId: string) {
    const [operational, financial] = await Promise.all([
      this.getOperationalKpis(organizationId),
      this.getFinancialKpis(organizationId),
    ]);
    return { ...operational, ...financial };
  }

  async getRevenueSeries(organizationId: string) {
    const today = startOfDay(new Date());
    const todayEnd = endOfDay(today);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const paidRows = await this.prisma.financialEntry.findMany({
      where: {
        organizationId,
        status: 'PAID',
        type: 'RECEIVABLE',
        paidAt: { gte: monthStart, lte: todayEnd },
      },
      select: { paidAt: true, amount: true },
      orderBy: { paidAt: 'asc' },
    });

    const byDay = new Map<string, number>();
    for (const row of paidRows) {
      if (!row.paidAt) continue;
      const key = String(row.paidAt.getDate()).padStart(2, '0');
      byDay.set(key, (byDay.get(key) ?? 0) + Number(row.amount));
    }

    return Array.from(byDay.entries()).map(([day, value]) => ({ day, value }));
  }

  async getServiceOrdersInProgress(organizationId: string) {
    return this.prisma.serviceOrder.findMany({
      where: {
        organizationId,
        ...notDeleted,
        status: {
          in: ['IN_PROGRESS', 'AWAITING_PART', 'DIAGNOSIS', 'AWAITING_APPROVAL'],
        },
      },
      include: {
        vehicle: { include: { customer: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });
  }

  async getPendingQuotes(organizationId: string) {
    return this.prisma.quote.findMany({
      where: { organizationId, ...notDeleted, status: 'PENDING' },
      include: {
        serviceOrder: {
          include: {
            vehicle: { include: { customer: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  private toLocalIsoDate(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private percentTrend(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }
}
