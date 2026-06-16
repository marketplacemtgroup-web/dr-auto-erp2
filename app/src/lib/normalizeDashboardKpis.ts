import type { DashboardKpis } from "./api";

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Prisma/JSON pode devolver decimais como string — normaliza para número. */
export function normalizeDashboardKpis(
  raw: Partial<DashboardKpis>,
): DashboardKpis {
  return {
    ...raw,
    openServiceOrders: num(raw.openServiceOrders),
    openServiceOrdersTrend: num(raw.openServiceOrdersTrend),
    vehiclesInShop: num(raw.vehiclesInShop),
    vehiclesInShopTrend: num(raw.vehiclesInShopTrend),
    pendingQuotes: num(raw.pendingQuotes),
    pendingQuotesTrend: num(raw.pendingQuotesTrend),
    dailyRevenue: num(raw.dailyRevenue),
    dailyRevenueTrend: num(raw.dailyRevenueTrend),
    lowStockParts: num(raw.lowStockParts),
    lowStockPartsTrend: num(raw.lowStockPartsTrend),
    delayedServices: num(raw.delayedServices),
    waitingClients: num(raw.waitingClients),
    invoicesThisMonth: num(raw.invoicesThisMonth),
    averageTicket: num(raw.averageTicket),
    monthlyRevenue: num(raw.monthlyRevenue),
    averageServiceTimeMinutes: num(raw.averageServiceTimeMinutes),
    partsProfit: num(raw.partsProfit),
    servicesProfit: num(raw.servicesProfit),
    grossProfit: num(raw.grossProfit),
    expenses: num(raw.expenses),
    totalProfit: num(raw.totalProfit),
  };
}
