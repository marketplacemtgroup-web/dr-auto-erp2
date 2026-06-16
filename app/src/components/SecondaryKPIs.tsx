import {
  Package,
  Wrench,
  DollarSign,
  Timer,
  TrendingUp,
} from "lucide-react";

import type { DashboardKpis } from "../lib/api";
import { routes } from "../lib/routes";
import { formatMoney, formatNegativeMoney } from "../lib/format";
import NavButton from "./NavButton";

function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}min`;
}

interface SecondaryKPIsProps {
  kpis?: DashboardKpis;
  isLoading?: boolean;
}

export default function SecondaryKPIs({ kpis, isLoading }: SecondaryKPIsProps) {
  const totalProfit =
    kpis?.totalProfit ??
    (kpis?.partsProfit ?? 0) + (kpis?.servicesProfit ?? 0) - (kpis?.expenses ?? 0);

  const items = [
    { label: "Lucro Geral (Mes)", value: isLoading ? "—" : formatMoney(totalProfit), icon: TrendingUp, iconBg: "#FEE2E2", iconColor: "#EF4444", to: routes.relatorios },
    { label: "Despesas (Mes)", value: isLoading ? "—" : formatNegativeMoney(kpis?.expenses ?? 0), icon: DollarSign, iconBg: "#FEE2E2", iconColor: "#DC2626", to: routes.financeiro },
    { label: "Lucro Pecas (Mes)", value: isLoading ? "—" : formatMoney(kpis?.partsProfit ?? 0), icon: Package, iconBg: "#FFEDD5", iconColor: "#F97316", to: routes.estoque },
    { label: "Lucro Servicos (Mes)", value: isLoading ? "—" : formatMoney(kpis?.servicesProfit ?? 0), icon: Wrench, iconBg: "#DBEAFE", iconColor: "#3B82F6", to: routes.servicos },
    { label: "Faturamento (Mes)", value: isLoading ? "—" : formatMoney(kpis?.monthlyRevenue ?? 0), icon: DollarSign, iconBg: "#D1FAE5", iconColor: "#10B981", to: routes.relatorios },
    { label: "Tempo Medio de Servico", value: isLoading ? "—" : formatMinutes(kpis?.averageServiceTimeMinutes ?? 0), icon: Timer, iconBg: "#EDE9FE", iconColor: "#8B5CF6", to: routes.ordemDeServico },
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
          <div className="text-[20px] font-bold text-[#1E293B] leading-tight mb-2">
            {kpi.value}
          </div>
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
