import { lazy, Suspense, useMemo, useState, type ComponentType } from "react";
import type { PaymentMethod, ReportsFull } from "../../lib/api";
import {
  buildReportFinancialKpiItems,
  buildReportOperationsKpiItems,
} from "../../lib/reportFinancialKpis";
import { PAYMENT_LABELS } from "../../lib/paymentMethods";
import { parseLocalIsoDate, type ReportPeriodState } from "../../lib/reportPeriod";
import { serviceOrderStatusLabel } from "../../lib/labels";
import ReportKpiGrid from "./ReportKpiGrid";
import ReportsDrillBanner, { type ReportDrill } from "./ReportsDrillBanner";
import type { ReportTabProps } from "./tabs/reportTabTypes";

const ReportsOverviewTab = lazy(() => import("./tabs/ReportsOverviewTab"));
const ReportsFinancialTab = lazy(() => import("./tabs/ReportsFinancialTab"));
const ReportsOperationsTab = lazy(() => import("./tabs/ReportsOperationsTab"));
const ReportsCommercialTab = lazy(() => import("./tabs/ReportsCommercialTab"));
const ReportsInventoryTab = lazy(() => import("./tabs/ReportsInventoryTab"));

type Props = {
  report: ReportsFull;
  period: ReportPeriodState;
  token: string | null;
  isLoading: boolean;
};

const TABS = [
  { id: "overview", label: "Visão geral" },
  { id: "financial", label: "Financeiro" },
  { id: "operations", label: "Oficina" },
  { id: "commercial", label: "Comercial" },
  { id: "inventory", label: "Estoque" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TAB_COMPONENTS: Record<TabId, ComponentType<ReportTabProps>> = {
  overview: ReportsOverviewTab,
  financial: ReportsFinancialTab,
  operations: ReportsOperationsTab,
  commercial: ReportsCommercialTab,
  inventory: ReportsInventoryTab,
};

export default function ReportsDashboard({ report, period, token, isLoading }: Props) {
  const [tab, setTab] = useState<TabId>("overview");
  const [drill, setDrill] = useState<ReportDrill>(null);

  const cmp = report.comparison;

  const revenueChart = useMemo(
    () =>
      report.financial.revenueByDay.map((r) => {
        const date =
          typeof r.date === "string"
            ? parseLocalIsoDate(r.date.slice(0, 10))
            : parseLocalIsoDate(new Date(r.date).toISOString().slice(0, 10));
        return {
          label: date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
          value: Number(r.amount),
        };
      }),
    [report],
  );

  const paymentChart = report.financial.paymentMethods.map((p) => ({
    name: PAYMENT_LABELS[p.method as PaymentMethod] ?? p.method,
    value: p.amount,
    key: p.method,
  }));

  const statusChart = report.operations.ordersByStatus.map((r) => ({
    name: serviceOrderStatusLabel[r.status] ?? r.status,
    status: r.status,
    count: r.count,
  }));

  const dreChart = report.financial.dreByMonth.slice(-6);
  const funnel = report.commercial.quoteFunnel;

  const filteredReceipts =
    drill?.kind === "payment"
      ? report.financial.paymentReceipts.filter((r) => r.paymentMethod === drill.method)
      : report.financial.paymentReceipts;

  const filteredDelayed =
    drill?.kind === "status"
      ? report.operations.delayedOrders.filter((o) => o.status === drill.status)
      : report.operations.delayedOrders;

  const kpiItems = [
    ...buildReportFinancialKpiItems(report.financial, { isLoading, compare: cmp }),
    ...buildReportOperationsKpiItems(report.financial, report.operations, report.commercial, {
      isLoading,
      compare: cmp,
    }),
  ];

  const expenses = report.financial.expenses ?? report.financial.expense ?? 0;
  const grossProfit =
    report.financial.grossProfit ??
    report.financial.partsProfit +
      report.financial.servicesProfit +
      (report.financial.scannerProfit ?? 0) +
      (report.financial.outsourcedProfit ?? 0);

  const tabProps: ReportTabProps = {
    report,
    period,
    token,
    drill,
    setDrill,
    revenueChart,
    paymentChart,
    statusChart,
    dreChart,
    funnel,
    filteredReceipts,
    filteredDelayed,
    expenses,
    grossProfit,
  };

  const ActiveTab = TAB_COMPONENTS[tab];

  return (
    <div id="reports-bi-dashboard" className="reports-bi-dashboard">
      <ReportsDrillBanner drill={drill} onClear={() => setDrill(null)} />

      <div className="flex flex-wrap gap-1 mb-4 p-1 bg-[#F1F5F9] rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`h-9 px-4 rounded-lg text-[12px] font-medium transition-colors ${
              tab === t.id
                ? "bg-white text-[#0E7490] shadow-sm"
                : "text-[#64748B] hover:text-[#1E293B]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ReportKpiGrid items={kpiItems} />

      <Suspense
        fallback={
          <div className="flex h-48 items-center justify-center text-sm text-[#64748B]">
            Carregando aba…
          </div>
        }
      >
        <ActiveTab {...tabProps} />
      </Suspense>
    </div>
  );
}
