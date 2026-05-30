import { Injectable } from '@nestjs/common';
import { ServiceOrderStatus } from '@autocore/database';
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
  constructor(private readonly prisma: PrismaService) {}

  async getKpis(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      openServiceOrders,
      vehiclesInShop,
      pendingQuotes,
      dailyRevenueToday,
      dailyRevenueYesterday,
      delayedServices,
      monthlyRevenueAgg,
      invoicesCount,
      serviceOrdersForTicket,
    ] = await Promise.all([
      this.prisma.serviceOrder.count({
        where: { organizationId, status: { in: OPEN_STATUSES } },
      }),
      this.prisma.serviceOrder.count({
        where: { organizationId, status: { in: IN_SHOP_STATUSES } },
      }),
      this.prisma.quote.count({
        where: { organizationId, status: 'PENDING' },
      }),
      this.prisma.dailyRevenue.findUnique({
        where: {
          organizationId_date: { organizationId, date: today },
        },
      }),
      this.prisma.dailyRevenue.findUnique({
        where: {
          organizationId_date: { organizationId, date: yesterday },
        },
      }),
      this.prisma.serviceOrder.count({
        where: {
          organizationId,
          status: { in: ['IN_PROGRESS', 'AWAITING_PART'] },
          estimatedAt: { lt: new Date() },
        },
      }),
      this.prisma.dailyRevenue.aggregate({
        where: {
          organizationId,
          date: { gte: monthStart, lte: today },
        },
        _sum: { amount: true },
      }),
      this.prisma.dailyRevenue.count({
        where: {
          organizationId,
          date: { gte: monthStart },
        },
      }),
      this.prisma.serviceOrder.findMany({
        where: {
          organizationId,
          status: 'DELIVERED',
          updatedAt: { gte: monthStart },
        },
        select: { totalAmount: true },
      }),
    ]);

    const lowStockReal = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count FROM products
      WHERE organization_id = ${organizationId} AND stock <= min_stock
    `.then((r) => Number(r[0]?.count ?? 0));

    const dailyAmount = Number(dailyRevenueToday?.amount ?? 0);
    const yesterdayAmount = Number(dailyRevenueYesterday?.amount ?? 0);
    const monthlyRevenue = Number(monthlyRevenueAgg._sum.amount ?? 0);

    const ticketSum = serviceOrdersForTicket.reduce(
      (s, o) => s + Number(o.totalAmount),
      0,
    );
    const averageTicket =
      serviceOrdersForTicket.length > 0
        ? ticketSum / serviceOrdersForTicket.length
        : 0;

    const waitingClients = await this.prisma.serviceOrder.groupBy({
      by: ['vehicleId'],
      where: {
        organizationId,
        status: { in: ['AWAITING_APPROVAL', 'RECEIVED'] },
      },
    });

    return {
      openServiceOrders,
      openServiceOrdersTrend: 0,
      vehiclesInShop,
      vehiclesInShopTrend: 0,
      pendingQuotes,
      pendingQuotesTrend: 0,
      dailyRevenue: dailyAmount,
      dailyRevenueTrend: this.percentTrend(dailyAmount, yesterdayAmount),
      lowStockParts: lowStockReal,
      lowStockPartsTrend: 0,
      delayedServices,
      waitingClients: waitingClients.length,
      invoicesThisMonth: invoicesCount,
      averageTicket: Math.round(averageTicket * 100) / 100,
      monthlyRevenue,
      averageServiceTimeMinutes: 0,
    };
  }

  async getRevenueSeries(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const rows = await this.prisma.dailyRevenue.findMany({
      where: {
        organizationId,
        date: { gte: monthStart, lte: today },
      },
      orderBy: { date: 'asc' },
    });

    return rows.map((r) => ({
      day: String(r.date.getDate()).padStart(2, '0'),
      value: Number(r.amount),
    }));
  }

  async getServiceOrdersInProgress(organizationId: string) {
    return this.prisma.serviceOrder.findMany({
      where: {
        organizationId,
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
      where: { organizationId, status: 'PENDING' },
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

  private percentTrend(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }
}
