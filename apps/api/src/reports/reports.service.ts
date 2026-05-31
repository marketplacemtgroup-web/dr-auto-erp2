import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);

    const [
      dailyRevenue,
      monthRevenueAgg,
      openReceivablesAgg,
      openPayablesAgg,
      serviceOrdersByStatus,
      revenueWeek,
      customersCount,
      vehiclesCount,
      openOrders,
      lowStockCount,
    ] = await Promise.all([
      this.prisma.dailyRevenue.findUnique({
        where: { organizationId_date: { organizationId, date: today } },
      }),
      this.prisma.dailyRevenue.aggregate({
        where: { organizationId, date: { gte: monthStart, lte: today } },
        _sum: { amount: true },
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
      this.prisma.serviceOrder.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { _all: true },
      }),
      this.prisma.dailyRevenue.findMany({
        where: { organizationId, date: { gte: weekStart, lte: today } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.customer.count({ where: { organizationId } }),
      this.prisma.vehicle.count({ where: { organizationId } }),
      this.prisma.serviceOrder.count({
        where: {
          organizationId,
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
      this.prisma.product.findMany({
        where: { organizationId, deletedAt: null },
        select: { stock: true, minStock: true, reservedStock: true },
      }),
    ]);

    const lowStock = lowStockCount.filter(
      (p) => p.stock - p.reservedStock <= p.minStock,
    ).length;

    return {
      dailyRevenue: dailyRevenue?.amount ?? 0,
      monthRevenue: monthRevenueAgg._sum.amount ?? 0,
      openReceivables: {
        count: openReceivablesAgg._count._all,
        amount: openReceivablesAgg._sum.amount ?? 0,
      },
      openPayables: {
        count: openPayablesAgg._count._all,
        amount: openPayablesAgg._sum.amount ?? 0,
      },
      serviceOrdersByStatus: serviceOrdersByStatus.map((r) => ({
        status: r.status,
        count: r._count._all,
      })),
      revenueWeek: revenueWeek.map((r) => ({
        date: r.date,
        amount: r.amount,
      })),
      customersCount,
      vehiclesCount,
      openOrders,
      lowStockCount: lowStock,
    };
  }

  async bi(organizationId: string) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [
      quotesTotal,
      quotesApproved,
      ordersWithMechanic,
      customers,
      paidEntries,
      lowStockProducts,
    ] = await Promise.all([
      this.prisma.quote.count({
        where: { organizationId, status: { not: 'DRAFT' } },
      }),
      this.prisma.quote.count({
        where: { organizationId, status: 'APPROVED' },
      }),
      this.prisma.serviceOrder.findMany({
        where: { organizationId, mechanicMemberId: { not: null } },
        select: {
          id: true,
          number: true,
          status: true,
          totalAmount: true,
          mechanicMemberId: true,
          mechanic: {
            include: { user: { select: { name: true } } },
          },
        },
      }),
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
      this.prisma.financialEntry.findMany({
        where: { organizationId, status: 'PAID', paidAt: { not: null } },
        select: { type: true, amount: true, paidAt: true },
      }),
      this.prisma.product.findMany({
        where: { organizationId },
        select: {
          name: true,
          sku: true,
          stock: true,
          reservedStock: true,
          minStock: true,
          salePrice: true,
        },
      }),
    ]);

    const mechanicMap = new Map<
      string,
      { name: string; count: number; total: number }
    >();
    for (const o of ordersWithMechanic) {
      const key = o.mechanicMemberId!;
      const name = o.mechanic?.user?.name ?? 'Mecânico';
      const cur = mechanicMap.get(key) ?? { name, count: 0, total: 0 };
      cur.count += 1;
      cur.total += Number(o.totalAmount);
      mechanicMap.set(key, cur);
    }

    const inactiveCustomers = customers
      .filter((c) => !c.vehicles.some((v) => v.serviceOrders.length > 0))
      .map((c) => ({ id: c.id, name: c.name, phone: c.phone }));

    const dreByMonth = new Map<string, { revenue: number; expense: number }>();
    for (const e of paidEntries) {
      if (!e.paidAt) continue;
      const key = `${e.paidAt.getFullYear()}-${String(e.paidAt.getMonth() + 1).padStart(2, '0')}`;
      const cur = dreByMonth.get(key) ?? { revenue: 0, expense: 0 };
      const amt = Number(e.amount);
      if (e.type === 'RECEIVABLE') cur.revenue += amt;
      else cur.expense += amt;
      dreByMonth.set(key, cur);
    }

    const dre = Array.from(dreByMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        revenue: v.revenue,
        expense: v.expense,
        result: v.revenue - v.expense,
      }));

    const lowStock = lowStockProducts.filter(
      (p) => p.stock - p.reservedStock <= p.minStock,
    );

    return {
      quoteConversion: {
        total: quotesTotal,
        approved: quotesApproved,
        rate: quotesTotal > 0 ? Math.round((quotesApproved / quotesTotal) * 100) : 0,
      },
      ordersByMechanic: Array.from(mechanicMap.values()).sort((a, b) => b.count - a.count),
      inactiveCustomers,
      dre,
      lowStock,
    };
  }

  async exportData(organizationId: string, type: string) {
    switch (type) {
      case 'financial':
        return this.prisma.financialEntry.findMany({
          where: { organizationId, parentEntryId: null },
          orderBy: { dueDate: 'asc' },
        });
      case 'service-orders':
        return this.prisma.serviceOrder.findMany({
          where: { organizationId },
          include: {
            vehicle: { include: { customer: true } },
          },
          orderBy: { number: 'desc' },
        });
      case 'low-stock': {
        const products = await this.prisma.product.findMany({
          where: { organizationId },
        });
        return products.filter((p) => p.stock - p.reservedStock <= p.minStock);
      }
      case 'inactive-customers': {
        const bi = await this.bi(organizationId);
        return bi.inactiveCustomers;
      }
      default:
        return [];
    }
  }
}
