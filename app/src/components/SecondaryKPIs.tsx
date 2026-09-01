import {
  Package,
  Wrench,
  DollarSign,
  TrendingUp,
  Receipt,
  AlertTriangle,
} from "lucide-react";

import type { DashboardKpis, FinancialOpenSummary } from "../lib/api";
import { routes } from "../lib/routes";
import { formatMoney, formatNegativeMoney } from "../lib/format";
import NavButton from "./NavButton";

interface SecondaryKPIsProps {
  kpis?: DashboardKpis;
  isLoading?: boolean;
  openSummary?: FinancialOpenSummary;
  openSummaryLoading?: boolean;
}

export default function SecondaryKPIs({
  kpis,
  isLoading,
  openSummary,
  openSummaryLoading,
}: SecondaryKPIsProps) {
  const totalProfit = kpis?.totalProfit ?? 0;
  const faturamentoBruto = kpis?.orderGross ?? kpis?.monthlyRevenue ?? 0;
  const overdueCount = openSummary?.payableOverdueCount ?? 0;

  const items = [
    {
      label: "A Pagar (Aberto)",
      value: openSummaryLoading ? "—" : formatMoney(openSummary?.payableOpen ?? 0),
      icon: Receipt,
      iconBg: "#FEE2E2",
      iconColor: "#DC2626",
      to: `${routes.financeiroLancamentos}?type=PAYABLE&open=1`,
      hint:
        overdueCount > 0
          ? `${overdueCount} vencida${overdueCount > 1 ? "s" : ""}`
          : "Pendente de pagamento",
    },
    { label: "Lucro Geral (Mes)", value: isLoading ? "—" : formatMoney(totalProfit), icon: TrendingUp, iconBg: "#FEE2E2", iconColor: "#EF4444", to: routes.relatorios },
    { label: "Despesas (Mes)", value: isLoading ? "—" : formatNegativeMoney(kpis?.expenses ?? 0), icon: DollarSign, iconBg: "#FEE2E2", iconColor: "#DC2626", to: routes.financeiroLancamentos },
    { label: "Lucro Pecas (Mes)", value: isLoading ? "—" : formatMoney(kpis?.partsProfit ?? 0), icon: Package, iconBg: "#FFEDD5", iconColor: "#F97316", to: routes.estoque },
    { label: "Lucro Servicos (Mes)", value: isLoading ? "—" : formatMoney(kpis?.servicesProfit ?? 0), icon: Wrench, iconBg: "#DBEAFE", iconColor: "#3B82F6", to: routes.servicos },
    { label: "Faturamento Bruto (Mes)", value: isLoading ? "—" : formatMoney(faturamentoBruto), icon: DollarSign, iconBg: "#D1FAE5", iconColor: "#10B981", to: routes.relatorios },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {items.map((kpi) => (
        <div
          key={kpi.label}
          className="bg-white rounded-xl card-shadow p-4 hover:-translate-y-0.5 hover:card-shadow-hover transition-all duration-200"
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-[11px] font-medium text-[#64748B]">
              {kpi.label}
            </span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: kpi.iconBg }}
            >
              <kpi.icon size={16} strokeWidth={1.5} style={{ color: kpi.iconColor }} />
            </div>
          </div>
          <div className="text-[20px] font-bold text-[#1E293B] leading-tight mb-1">
            {kpi.value}
          </div>
          {"hint" in kpi && kpi.hint ? (
            <p className="text-[11px] text-[#94A3B8] mb-2 inline-flex items-center gap-1">
              {overdueCount > 0 && kpi.label === "A Pagar (Aberto)" ? (
                <AlertTriangle size={12} className="text-[#B45309]" />
              ) : null}
              {kpi.hint}
            </p>
          ) : (
            <div className="mb-2" />
          )}
          <NavButton
            to={kpi.to}
            className="text-[11px] text-[#94A3B8] hover:text-[#0E7490] transition-colors"
          >
            Ver detalhes
          </NavButton>
        </div>
      ))}
    </div>
  );
}
