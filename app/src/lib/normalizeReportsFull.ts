import type { ReportsFull } from "./api";

const EMPTY_FUNNEL = { DRAFT: 0, PENDING: 0, APPROVED: 0, REJECTED: 0, total: 0 };

/** Garante arrays e objetos esperados pelo dashboard (API antiga ou resposta parcial). */
export function normalizeReportsFull(report: ReportsFull): ReportsFull {
  return {
    ...report,
    financial: {
      ...report.financial,
      grossProfit:
        report.financial.grossProfit ??
        Number(report.financial.partsProfit ?? 0) + Number(report.financial.servicesProfit ?? 0),
      expenses: report.financial.expenses ?? report.financial.expense ?? 0,
      totalProfit: report.financial.totalProfit ?? 0,
      paymentMethods: report.financial.paymentMethods ?? [],
      paymentReceipts: report.financial.paymentReceipts ?? [],
      revenueByDay: report.financial.revenueByDay ?? [],
      dreByMonth: report.financial.dreByMonth ?? [],
      overdueReceivables: report.financial.overdueReceivables ?? [],
      cashFlow: report.financial.cashFlow ?? {
        paymentIn: 0,
        supply: 0,
        withdrawal: 0,
        paymentOut: 0,
        netCash: 0,
      },
    },
    operations: {
      ...report.operations,
      ordersByStatus: report.operations.ordersByStatus ?? [],
      ordersHeatmap: report.operations.ordersHeatmap ?? [],
      delayedOrders: report.operations.delayedOrders ?? [],
      ordersByMechanic: report.operations.ordersByMechanic ?? [],
      topServices: report.operations.topServices ?? [],
      topParts: report.operations.topParts ?? [],
      marginByOrder: report.operations.marginByOrder ?? [],
    },
    commercial: {
      ...report.commercial,
      quoteFunnel: report.commercial.quoteFunnel ?? EMPTY_FUNNEL,
      topCustomers: report.commercial.topCustomers ?? [],
      customersByOrigin: report.commercial.customersByOrigin ?? [],
      returningCustomers: report.commercial.returningCustomers ?? {
        count: 0,
        rate: 0,
        list: [],
      },
      inactiveCustomers: report.commercial.inactiveCustomers ?? [],
    },
    inventory: {
      ...report.inventory,
      lowStock: report.inventory.lowStock ?? [],
      reorderSuggestion: report.inventory.reorderSuggestion ?? [],
      topMovingProducts: report.inventory.topMovingProducts ?? [],
      slowMovingProducts: report.inventory.slowMovingProducts ?? [],
      purchasesBySupplier: report.inventory.purchasesBySupplier ?? [],
    },
  };
}
