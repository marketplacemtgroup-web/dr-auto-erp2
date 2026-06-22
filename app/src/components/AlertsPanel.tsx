import { AlertTriangle, Clock, FileText, User } from "lucide-react";
import { routes } from "../lib/routes";
import NavButton from "./NavButton";

interface Alert {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  message: string;
  link: string;
  to: string;
}

interface AlertsPanelProps {
  lowStockParts?: number;
  delayedServices?: number;
  maintenanceOverdue?: number;
}

export default function AlertsPanel({
  lowStockParts = 0,
  delayedServices = 0,
  maintenanceOverdue = 0,
}: AlertsPanelProps) {
  const alerts: Alert[] = [
    {
      icon: <AlertTriangle size={16} strokeWidth={1.5} />,
      iconBg: "#FEF3C7",
      iconColor: "#D97706",
      message: `${lowStockParts} pecas abaixo do estoque minimo`,
      link: "Verificar estoque",
      to: routes.estoque,
    },
    {
      icon: <Clock size={16} strokeWidth={1.5} />,
      iconBg: "#FEE2E2",
      iconColor: "#EF4444",
      message: `${delayedServices} servicos estao atrasados`,
      link: "Ver ordens",
      to: routes.ordemDeServico,
    },
    {
      icon: <FileText size={16} strokeWidth={1.5} />,
      iconBg: "#FEF9C3",
      iconColor: "#CA8A04",
      message: "3 orcamentos aguardando aprovacao",
      link: "Ver orcamentos",
      to: routes.orcamentos,
    },
    {
      icon: <User size={16} strokeWidth={1.5} />,
      iconBg: "#EDE9FE",
      iconColor: "#8B5CF6",
      message:
        maintenanceOverdue > 0
          ? `${maintenanceOverdue} manutenção(ões) preventiva(s) vencida(s)`
          : "Nenhuma manutenção preventiva vencida",
      link: maintenanceOverdue > 0 ? "Ver painel" : "Ver dashboard",
      to: routes.dashboardHome,
    },
  ];

  return (
    <div className="bg-white rounded-xl card-shadow p-5">
      <h3 className="text-[14px] font-semibold text-[#1E293B] mb-4">
        Alertas Importantes
      </h3>

      <div className="divide-y divide-[#F1F5F9]">
        {alerts.map((alert, index) => (
          <div key={index} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: alert.iconBg, color: alert.iconColor }}
            >
              {alert.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[#1E293B] leading-snug">
                {alert.message}
              </p>
              <NavButton
                to={alert.to}
                className="text-[11px] text-[#0E7490] hover:underline mt-0.5"
              >
                {alert.link}
              </NavButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
