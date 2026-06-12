import { NavLink, Outlet } from "react-router";
import { routes } from "../lib/routes";
import { AlertTriangle } from "lucide-react";

const subNav = [
  { label: "Funcionários", path: routes.equipeFuncionarios },
  { label: "Cargos", path: routes.equipeCargos },
  { label: "Permissões", path: routes.equipePermissoes },
  { label: "Regras de Comissão", path: routes.equipeRegrasComissao },
  { label: "Lançamentos", path: routes.equipeLancamentos },
  { label: "Fechamentos", path: routes.equipeFechamentos },
  { label: "Produtividade", path: routes.equipeProdutividade },
];

export default function TeamLayout() {
  return (
    <div className="min-h-full bg-[#F7F8FA]">
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[13px]">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p>
            Este módulo é um controle gerencial interno de pagamentos e comissões. Para
            obrigações trabalhistas e folha oficial, consulte sua contabilidade.
          </p>
        </div>
      </div>

      <div className="px-6 pb-2 overflow-x-auto">
        <nav className="flex gap-1 min-w-max border-b border-[#E5E7EB]">
          {subNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                  isActive
                    ? "border-[#0057D9] text-[#0057D9]"
                    : "border-transparent text-[#6B7280] hover:text-[#111827]"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet />
    </div>
  );
}
