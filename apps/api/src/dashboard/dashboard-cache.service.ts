import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';
import { endOfDay, roundMoney, startOfDay } from '../reports/reports-date.util';
import { PROFIT_RECOGNIZED_STATUSES } from '../reports/reports-profit.util';
import { notDeleted } from '../common/soft-delete';

const CACHE_STALE_MS = 15 * 60_000;

export type DashboardCacheRow = {
  revenue: number;
  expenses: number;
  profit: number;
  ticketAverage: number;
  serviceOrders: number;
  closedOrders: number;
  computedAt: Date;
};

@Injectable()
export class DashboardCacheService {
  private readonly logger = new Logger(DashboardCacheService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

  private toDateOnly(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }

  async invalidate(organizationId: string, date?: Date) {
    if (date) {
      await this.prisma.dashboardCache.deleteMany({
        where: { organizationId, date: this.toDateOnly(date) },
      });
      return;
    }
    await this.prisma.dashboardCache.deleteMany({ where: { organizationId } });
  }

  async getOrCompute(organizationId: string, date: Date): Promise<DashboardCacheRow> {
    const dateOnly = this.toDateOnly(date);
    const cached = await this.prisma.dashboardCache.findUnique({
      where: { organizationId_date: { organizationId, date: dateOnly } },
    });
    if (cached && Date.now() - cached.computedAt.getTime() < CACHE_STALE_MS) {
      return {
        revenue: Number(cached.revenue),
        expenses: Number(cached.expenses),
        profit: Number(cached.profit),
        ticketAverage: Number(cached.ticketAverage),
        serviceOrders: cached.serviceOrders,
        closedOrders: cached.closedOrders,
        computedAt: cached.computedAt,
      };
    }

    return this.recompute(organizationId, dateOnly);
  }

  async recompute(organizationId: string, dateOnly: Date): Promise<DashboardCacheRow> {
    const dayStart = startOfDay(dateOnly);
    const dayEnd = endOfDay(dateOnly);
    const fromStr = this.toLocalIsoDate(dayStart);
    const toStr = this.toLocalIsoDate(dayEnd);
    const active = { organizationId, ...notDeleted };

    const [report, deliveredOrders] = await Promise.all([
      this.reportsService.dashboardFinancial(organizationId, fromStr, toStr),
      this.prisma.serviceOrder.findMany({
        where: {
          ...active,
          status: { in: PROFIT_RECOGNIZED_STATUSES },
          updatedAt: { gte: dayStart, lte: dayEnd },
        },
        select: { totalAmount: true },
      }),
    ]);

    const ticketSum = deliveredOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const ticketAverage =
      deliveredOrders.length > 0 ? roundMoney(ticketSum / deliveredOrders.length) : 0;

    const row: DashboardCacheRow = {
      revenue: report.financial.revenue,
      expenses: report.financial.expenses,
      profit: report.financial.totalProfit,
      ticketAverage,
      serviceOrders: deliveredOrders.length,
      closedOrders: deliveredOrders.length,
      computedAt: new Date(),
    };

    await this.prisma.dashboardCache.upsert({
      where: { organizationId_date: { organizationId, date: dateOnly } },
      create: {
        organizationId,
        date: dateOnly,
        revenue: new Prisma.Decimal(row.revenue),
        expenses: new Prisma.Decimal(row.expenses),
        profit: new Prisma.Decimal(row.profit),
        ticketAverage: new Prisma.Decimal(row.ticketAverage),
        serviceOrders: row.serviceOrders,
        closedOrders: row.closedOrders,
        computedAt: row.computedAt,
      },
      update: {
        revenue: new Prisma.Decimal(row.revenue),
        expenses: new Prisma.Decimal(row.expenses),
        profit: new Prisma.Decimal(row.profit),
        ticketAverage: new Prisma.Decimal(row.ticketAverage),
        serviceOrders: row.serviceOrders,
        closedOrders: row.closedOrders,
        computedAt: row.computedAt,
      },
    });

    return row;
  }

  async refreshStaleBatch(limit = 50) {
    const staleBefore = new Date(Date.now() - CACHE_STALE_MS);
    const rows = await this.prisma.dashboardCache.findMany({
      where: { computedAt: { lt: staleBefore } },
      take: limit,
      orderBy: { computedAt: 'asc' },
    });
    let refreshed = 0;
    for (const row of rows) {
      try {
        await this.recompute(row.organizationId, row.date);
        refreshed++;
      } catch (err) {
        this.logger.warn(
          `Cache refresh falhou org=${row.organizationId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    return { refreshed, checked: rows.length };
  }

  private toLocalIsoDate(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
