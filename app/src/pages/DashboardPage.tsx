import {
  FileText,
  Car,
  ClipboardList,
  DollarSign,
  Package,
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
import { useDashboardKpis } from "../hooks/useDashboardKpis";
import NavButton from "../components/NavButton";
import { routes } from "../lib/routes";
import { useAuthStore, useAuthUser } from "../stores/authStore";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function sparkline(value: number) {
  return Array.from({ length: 10 }, (_, i) => (i < 9 ? 0 : value));
}

export default function DashboardPage() {
  const user = useAuthUser();
  const organizationName = useAuthStore((s) => s.session?.organizationName);
  const { data: kpis, isLoading } = useDashboardKpis();

  const kpiData = [
    {
      label: "OS Abertas",
      value: isLoading ? "—" : String(kpis?.openServiceOrders ?? 0),
      trend: kpis?.openServiceOrdersTrend ?? 0,
      icon: (
        <FileText size={20} strokeWidth={1.5} className="text-[#3B82F6]" />
      ),
      iconBg: "#EFF6FF",
      sparklineColor: "#3B82F6",
      sparklineData: sparkline(kpis?.openServiceOrders ?? 0),
    },
    {
      label: "Veiculos na Oficina",
      value: isLoading ? "—" : String(kpis?.vehiclesInShop ?? 0),
      trend: kpis?.vehiclesInShopTrend ?? 0,
      icon: <Car size={20} strokeWidth={1.5} className="text-[#10B981]" />,
      iconBg: "#ECFDF5",
      sparklineColor: "#10B981",
      sparklineData: sparkline(kpis?.vehiclesInShop ?? 0),
    },
    {
      label: "Orcamentos Pendentes",
      value: isLoading ? "—" : String(kpis?.pendingQuotes ?? 0),
      trend: kpis?.pendingQuotesTrend ?? 0,
      icon: (
        <ClipboardList size={20} strokeWidth={1.5} className="text-[#F97316]" />
      ),
      iconBg: "#FFF7ED",
      sparklineColor: "#F97316",
      sparklineData: sparkline(kpis?.pendingQuotes ?? 0),
    },
    {
      label: "Faturamento do Dia",
      value: isLoading ? "—" : formatCurrency(kpis?.dailyRevenue ?? 0),
      trend: kpis?.dailyRevenueTrend ?? 0,
      icon: (
        <DollarSign size={20} strokeWidth={1.5} className="text-[#0E7490]" />
      ),
      iconBg: "#ECFEFF",
      sparklineColor: "#0E7490",
      sparklineData: sparkline(Math.round(kpis?.dailyRevenue ?? 0)),
    },
    {
      label: "Pecas em Falta",
      value: isLoading ? "—" : String(kpis?.lowStockParts ?? 0),
      trend: kpis?.lowStockPartsTrend ?? 0,
      icon: (
        <Package size={20} strokeWidth={1.5} className="text-[#EF4444]" />
      ),
      iconBg: "#FEF2F2",
      sparklineColor: "#EF4444",
      sparklineData: sparkline(kpis?.lowStockParts ?? 0),
    },
  ];

  const greetingName = user?.name?.split(" ")[0] ?? "equipe";

  return (
    <main className="px-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1E293B]">
            Boa tarde, {greetingName}! 👋
          </h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">
            Aqui esta o resumo geral da sua oficina hoje.
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
              {organizationName ?? "Oficina"}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        {kpiData.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="mb-5">
        <SecondaryKPIs kpis={kpis} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <ServiceOrdersTable />
        <PendingQuotes />
        <TodayAgenda />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="md:col-span-2 xl:col-span-1">
          <RevenueChart monthlyRevenue={kpis?.monthlyRevenue} />
        </div>
        <div>
          <ServicesChart />
        </div>
        <div>
          <PaymentMethodsChart />
        </div>
        <div>
          <AlertsPanel
            lowStockParts={kpis?.lowStockParts}
            delayedServices={kpis?.delayedServices}
          />
        </div>
      </div>
    </main>
  );
}
