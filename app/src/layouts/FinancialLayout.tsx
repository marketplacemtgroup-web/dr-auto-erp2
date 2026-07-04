import { NavLink, Outlet } from "react-router";
import { routes } from "../lib/routes";

const subNav = [
  { label: "Lançamentos", path: routes.financeiroLancamentos },
  { label: "Contas", path: routes.financeiroContas },
  { label: "Fluxo de Caixa", path: routes.financeiroFluxo },
  { label: "Transferências", path: routes.financeiroTransferencias },
  { label: "Empréstimos", path: routes.financeiroEmprestimos },
  { label: "Conciliação", path: routes.financeiroConciliacao },
];

export default function FinancialLayout() {
  return (
    <div className="min-h-full bg-[#F7F8FA]">
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-xl font-bold text-[#1E293B]">Financeiro</h1>
        <p className="text-[13px] text-[#64748B] mt-0.5">
          Contas, lançamentos, fluxo de caixa e movimentações patrimoniais
        </p>
      </div>

      <div className="px-6 pb-2 overflow-x-auto">
        <nav className="flex gap-1 min-w-max border-b border-[#E5E7EB]">
          {subNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-[#0E7490] text-[#0E7490]"
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
