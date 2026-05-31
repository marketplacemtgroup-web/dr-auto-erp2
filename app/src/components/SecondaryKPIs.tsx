import {
  Clock,
  Users,
  FileText,
  DollarSign,
  Timer,
} from "lucide-react";

import type { DashboardKpis } from "../lib/api";
import { routes } from "../lib/routes";
import NavButton from "./NavButton";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

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
  const items = [
    { label: "Servicos Atrasados", value: isLoading ? "—" : String(kpis?.delayedServices ?? 5), icon: Clock, iconBg: "#FEE2E2", iconColor: "#EF4444", to: routes.ordemDeServico },
    { label: "Clientes Aguardando", value: isLoading ? "—" : String(kpis?.waitingClients ?? 6), icon: Users, iconBg: "#FFEDD5", iconColor: "#F97316", to: routes.clientes },
    { label: "Orcamentos Pendentes", value: isLoading ? "—" : String(kpis?.pendingQuotes ?? 0), icon: FileText, iconBg: "#DBEAFE", iconColor: "#3B82F6", to: routes.orcamentos },
    { label: "Faturamento (Mes)", value: isLoading ? "—" : formatCurrency(kpis?.monthlyRevenue ?? 128450), icon: DollarSign, iconBg: "#D1FAE5", iconColor: "#10B981", to: routes.dashboardHome },
    { label: "Tempo Medio de Servico", value: isLoading ? "—" : formatMinutes(kpis?.averageServiceTimeMinutes ?? 155), icon: Timer, iconBg: "#EDE9FE", iconColor: "#8B5CF6", to: routes.ordemDeServico },
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
