import type { PaymentMethod, ReportsFull } from "../../../lib/api";
import type { ReportPeriodState } from "../../../lib/reportPeriod";
import type { ReportDrill } from "../ReportsDrillBanner";

export type ReportTabProps = {
  report: ReportsFull;
  period: ReportPeriodState;
  token: string | null;
  drill: ReportDrill;
  setDrill: (d: ReportDrill | ((prev: ReportDrill) => ReportDrill)) => void;
  revenueChart: Array<{ label: string; value: number }>;
  paymentChart: Array<{ name: string; value: number; key: string }>;
  statusChart: Array<{ name: string; status: string; count: number }>;
  dreChart: ReportsFull["financial"]["dreByMonth"];
  funnel: ReportsFull["commercial"]["quoteFunnel"];
  filteredReceipts: ReportsFull["financial"]["paymentReceipts"];
  filteredDelayed: ReportsFull["operations"]["delayedOrders"];
  expenses: number;
  grossProfit: number;
};

export type { PaymentMethod };
