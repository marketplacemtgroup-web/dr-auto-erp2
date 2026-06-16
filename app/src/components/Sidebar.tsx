import { useState } from "react";
import { NavLink } from "react-router";
import { subscription } from "../lib/branding";
import { MENU_ITEMS, hasPermission } from "../lib/permissions";
import { routes } from "../lib/routes";
import { useAuthStore } from "../stores/authStore";
import BrandHeader from "./BrandHeader";
import NavButton from "./NavButton";
import {
  LayoutDashboard,
  Users,
  Car,
  ClipboardList,
  FileText,
  Wrench,
  Calendar,
  Package,
  ShoppingCart,
  Landmark,
  BarChart3,
  UsersRound,
  Settings,
  Menu,
  X,
  ChevronRight,
  Crown,
  Shield,
} from "lucide-react";

const ICONS = {
  Dashboard: LayoutDashboard,
  Clientes: Users,
  Veiculos: Car,
  "Ordem de Servico": ClipboardList,
  Orcamentos: FileText,
  Servicos: Wrench,
  Agenda: Calendar,
  Estoque: Package,
  Compras: ShoppingCart,
  Financeiro: Landmark,
  "Equipe & Comissoes": UsersRound,
  Relatorios: BarChart3,
  Admin: Shield,
  Configuracoes: Settings,
} as const;

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const permissions = useAuthStore((s) => s.session?.permissions);
  const visibleItems = MENU_ITEMS.filter((item) =>
    hasPermission(permissions, item.permission),
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#0F172A] text-white"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-[240px] bg-[#0F172A] z-40 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-3 pt-4 pb-3">
          <BrandHeader
            context="dashboard"
            taglineVariant="light"
            align="center"
            className="w-full"
          />
        </div>

        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <ul className="space-y-[2px]">
            {visibleItems.map((item) => {
              const Icon = ICONS[item.label as keyof typeof ICONS] ?? LayoutDashboard;
              return (
                <li key={item.label}>
                  <NavLink
                    to={item.path}
                    end={item.path === routes.dashboardHome}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `w-full flex items-center gap-3 px-3 h-10 rounded-lg text-[13px] font-medium transition-all duration-150 relative ${
                        isActive
                          ? "bg-white/[0.08] text-white"
                          : "text-[#94A3B8] hover:bg-white/[0.04]"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#0E7490] rounded-r-full" />
                        )}
                        <Icon size={20} strokeWidth={1.5} className="shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {hasPermission(permissions, "settings.manage") && (
          <div className="px-3 pb-4 pt-2">
            <div className="relative rounded-xl overflow-hidden p-4 bg-gradient-to-br from-[#0F172A] to-[#0E7490]/40">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Crown size={14} className="text-amber-400" strokeWidth={1.5} />
                  <span className="text-white text-xs font-semibold">
                    Plano {subscription.planName}
                  </span>
                </div>
                <p className="text-[#94A3B8] text-[10px] leading-relaxed mb-3">
                  Assinatura valida ate
                  <br />
                  <span className="text-white font-medium">{subscription.validUntil}</span>
                </p>
                <NavButton
                  to={routes.configuracoes}
                  className="w-full bg-[#0E7490] hover:bg-[#155E75] text-white text-[11px] font-medium py-2 rounded-lg transition-colors duration-150 flex items-center justify-center gap-1"
                >
                  Gerenciar Plano
                  <ChevronRight size={12} />
                </NavButton>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
