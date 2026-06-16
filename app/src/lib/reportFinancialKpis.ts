import type { ReportsFull } from "./api";
import { formatMoney, formatNegativeMoney } from "./format";
import type { ReportKpiItem } from "../components/reports/ReportKpiGrid";

type FinancialBlock = ReportsFull["financial"];
type Comparison = ReportsFull["comparison"];

export function buildReportFinancialKpiItems(
  financial: FinancialBlock,
  opts: { isLoading?: boolean; compare?: Comparison | null } = {},
): ReportKpiItem[] {
  const { isLoading = false, compare = null } = opts;
  const expenses = financial.expenses ?? financial.expense ?? 0;
  const totalProfit = financial.totalProfit ?? 0;

  return [
    {
      label: "Faturamento",
      value: isLoading ? "—" : formatMoney(financial.revenue),
      change: compare?.revenueChange,
      tone: "success",
      large: true,
    },
    {
      label: "Despesas",
      value: isLoading ? "—" : formatNegativeMoney(expenses),
      tone: "danger",
    },
    {
      label: "Lucro pecas",
      value: isLoading ? "—" : formatMoney(financial.partsProfit),
    },
    {
      label: "Lucro servicos",
      value: isLoading ? "—" : formatMoney(financial.servicesProfit),
    },
    {
      label: "Lucro total",
      value: isLoading ? "—" : formatMoney(totalProfit),
      change: compare?.profitChange,
      tone: totalProfit >= 0 ? "success" : "danger",
      large: true,
    },
  ];
}

export function buildReportOperationsKpiItems(
  financial: FinancialBlock,
  operations: ReportsFull["operations"],
  commercial: ReportsFull["commercial"],
  opts: { isLoading?: boolean; compare?: Comparison | null } = {},
): ReportKpiItem[] {
  const { isLoading = false, compare = null } = opts;

  return [
    {
      label: "Ticket medio",
      value: isLoading ? "—" : formatMoney(operations.averageTicket),
      change: compare?.averageTicketChange,
    },
    {
      label: "Tempo medio",
      value: isLoading ? "—" : `${operations.averageDeliveryDays}d`,
    },
    {
      label: "Conversao",
      value: isLoading ? "—" : `${commercial.quoteConversion.rate}%`,
      tone: "warning",
    },
    {
      label: "Descontos",
      value: isLoading ? "—" : formatMoney(financial.discountsGiven),
      tone: "danger",
    },
  ];
}
