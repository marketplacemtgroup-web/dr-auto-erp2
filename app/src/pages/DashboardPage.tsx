import { useState } from "react";
import {
  FileText,
  Car,
  ClipboardList,
  DollarSign,
  Package,
  Clock,
  Users,
  TrendingUp,
} from "lucide-react";
import KPICard from "../components/KPICard";
import SecondaryKPIs from "../components/SecondaryKPIs";
import ServiceOrdersTable from "../components/ServiceOrdersTable";
import PendingQuotes from "../components/PendingQuotes";
import TodayAgenda from "../components/TodayAgenda";
import RevenueChart from "../components/RevenueChart";
import ServicesChart from "../components/ServicesChart";
import PaymentMethodsChart from "../components/PaymentMethodsChart";
import AlertsPanel from "../components/AlertsPanel";
import PreventiveMaintenancePanel from "../components/PreventiveMaintenancePanel";
import MaintenanceAlertModal from "../components/MaintenanceAlertModal";
import { DashboardBundleProvider } from "../contexts/DashboardBundleContext";
import { useDashboardBundle } from "../hooks/useDashboardBundle";
import { usePermissions } from "../hooks/usePermissions";
import NavButton from "../components/NavButton";
import { formatMoney } from "../lib/format";
import { timeGreeting } from "../lib/timeGreeting";
import { branding } from "../lib/branding";
import { routes } from "../lib/routes";
import { getErrorMessage } from "../lib/api";
import { useAuthStore, useAuthUser } from "../stores/authStore";

function sparkline(value: number) {
  return Array.from({ length: 10 }, (_, i) => (i < 9 ? 0 : value));
}

export default function DashboardPage() {
  return (
    <DashboardBundleProvider>
      <DashboardPageContent />
    </DashboardBundleProvider>
  );
}

function DashboardPageContent() {
  const [maintenanceAlertDismissed, setMaintenanceAlertDismissed] = useState(false);
  const user = useAuthUser();
  const organizationName = useAuthStore((s) => s.session?.organizationName);
  const { canViewFinancialDashboard } = usePermissions();
  const showFinancial = canViewFinancialDashboard();
  const {
    operational: op,
    financial: fin,
    kpis,
    alerts,
    summary,
  } = useDashboardBundle();

  const opLoading = summary.isPending && !op;
  const finLoading = showFinancial && summary.isPending && !fin;

  const operationalKpis = [
    {
      label: "OS Abertas",
      value: opLoading ? "—" : String(op?.openServiceOrders ?? 0),
      trend: op?.openServiceOrdersTrend ?? 0,
      icon: <FileText size={20} strokeWidth={1.5} className="text-[#3B82F6]" />,
      iconBg: "#EFF6FF",
      sparklineColor: "#3B82F6",
      sparklineData: sparkline(op?.openServiceOrders ?? 0),
    },
    {
      label: "Veiculos na Oficina",
      value: opLoading ? "—" : String(op?.vehiclesInShop ?? 0),
      trend: op?.vehiclesInShopTrend ?? 0,
      icon: <Car size={20} strokeWidth={1.5} className="text-[#10B981]" />,
      iconBg: "#ECFDF5",
      sparklineColor: "#10B981",
      sparklineData: sparkline(op?.vehiclesInShop ?? 0),
    },
    {
      label: "Orcamentos Pendentes",
      value: opLoading ? "—" : String(op?.pendingQuotes ?? 0),
      trend: op?.pendingQuotesTrend ?? 0,
      icon: <ClipboardList size={20} strokeWidth={1.5} className="text-[#F97316]" />,
      iconBg: "#FFF7ED",
      sparklineColor: "#F97316",
      sparklineData: sparkline(op?.pendingQuotes ?? 0),
    },
    {
      label: "Pecas em Falta",
      value: opLoading ? "—" : String(op?.lowStockParts ?? 0),
      trend: op?.lowStockPartsTrend ?? 0,
      icon: <Package size={20} strokeWidth={1.5} className="text-[#EF4444]" />,
      iconBg: "#FEF2F2",
      sparklineColor: "#EF4444",
      sparklineData: sparkline(op?.lowStockParts ?? 0),
    },
    {
      label: "Clientes Aguardando",
      value: opLoading ? "—" : String(op?.waitingClients ?? 0),
      trend: 0,
      icon: <Users size={20} strokeWidth={1.5} className="text-[#8B5CF6]" />,
      iconBg: "#F5F3FF",
      sparklineColor: "#8B5CF6",
      sparklineData: sparkline(op?.waitingClients ?? 0),
    },
    {
      label: "Servicos Atrasados",
      value: opLoading ? "—" : String(op?.delayedServices ?? 0),
      trend: 0,
      icon: <Clock size={20} strokeWidth={1.5} className="text-[#F59E0B]" />,
      iconBg: "#FFFBEB",
      sparklineColor: "#F59E0B",
      sparklineData: sparkline(op?.delayedServices ?? 0),
    },
  ];

  const financialKpis = [
    {
      label: "Faturamento do Dia",
      value: finLoading ? "—" : formatMoney(fin?.dailyRevenue ?? 0),
      trend: fin?.dailyRevenueTrend ?? 0,
      icon: <DollarSign size={20} strokeWidth={1.5} className="text-[#0E7490]" />,
      iconBg: "#ECFEFF",
      sparklineColor: "#0E7490",
      sparklineData: sparkline(Math.round(fin?.dailyRevenue ?? 0)),
    },
    {
      label: "Lucro do Dia",
      value: finLoading ? "—" : formatMoney(fin?.dailyProfit ?? 0),
      trend: fin?.dailyProfitTrend ?? 0,
      icon: <TrendingUp size={20} strokeWidth={1.5} className="text-[#10B981]" />,
      iconBg: "#ECFDF5",
      sparklineColor: "#10B981",
      sparklineData: sparkline(Math.round(fin?.dailyProfit ?? 0)),
    },
  ];

  const kpiData = showFinancial
    ? [
        operationalKpis[0],
        operationalKpis[1],
        operationalKpis[2],
        ...financialKpis,
        operationalKpis[3],
      ]
    : operationalKpis;

  const greetingName = user?.name?.split(" ")[0] ?? "equipe";
  const greeting = timeGreeting();

  return (
    <main className="px-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1E293B]">
            {greeting}, {greetingName}! 👋
          </h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">
            {showFinancial
              ? "Aqui esta o resumo geral da sua oficina hoje."
              : "Painel operacional — veiculos, OS e orcamentos em andamento."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-lg px-3 py-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="text-[#64748B]"
            >
              <rect
                x="1"
                y="1"
                width="12"
                height="12"
                rx="2"
                stroke="currentColor"
                strokeWidth="1"
              />
              <path
                d="M1 4H13M4 1V4M10 1V4"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
            <span className="text-[12px] font-medium text-[#64748B]">
              {new Date().toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <NavButton
            to={routes.configuracoes}
            className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 hover:border-[#0E7490]/30 transition-colors"
          >
            <span className="text-[12px] font-medium text-[#64748B] max-w-[140px] truncate">
              {organizationName ?? branding.defaultOrganizationName}
            </span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M2.5 4L5 6.5L7.5 4"
                stroke="#94A3B8"
                strokeWidth="1.2"
              />
            </svg>
          </NavButton>
        </div>
      </div>

      {summary.isError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <span>
            Indicadores do painel:{" "}
            {getErrorMessage(summary.error, "falha na API")}.
          </span>
          <button
            type="button"
            onClick={() => void summary.refetch()}
            disabled={summary.isFetching}
            className="shrink-0 rounded-lg bg-amber-100 px-3 py-1.5 text-[12px] font-medium hover:bg-amber-200 disabled:opacity-60"
          >
            {summary.isFetching ? "Carregando..." : "Tentar de novo"}
          </button>
        </div>
      )}

      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 ${
          showFinancial ? "lg:grid-cols-3 xl:grid-cols-6" : "lg:grid-cols-3 xl:grid-cols-6"
        }`}
      >
        {kpiData.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      {showFinancial && (
        <div className="mb-5">
          <SecondaryKPIs kpis={kpis} isLoading={finLoading} />
        </div>
      )}

      <PreventiveMaintenancePanel />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <ServiceOrdersTable />
        <PendingQuotes />
        <TodayAgenda />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {showFinancial && (
          <>
            <div className="md:col-span-2 xl:col-span-1">
              <RevenueChart monthlyRevenue={fin?.monthlyRevenue} />
            </div>
            <div>
              <ServicesChart />
            </div>
            <div>
              <PaymentMethodsChart />
            </div>
          </>
        )}
        <div className={showFinancial ? "" : "md:col-span-2 xl:col-span-4"}>
          <AlertsPanel
            lowStockParts={alerts.data?.lowStockParts ?? op?.lowStockParts}
            delayedServices={alerts.data?.delayedServices ?? op?.delayedServices}
            pendingQuotes={alerts.data?.pendingQuotes ?? op?.pendingQuotes}
            maintenanceOverdue={alerts.data?.maintenanceOverdue}
          />
        </div>
      </div>

      {!maintenanceAlertDismissed && (
        <MaintenanceAlertModal onDismiss={() => setMaintenanceAlertDismissed(true)} />
      )}
    </main>
  );
}
