import { routes } from "../lib/routes";
import NavButton from "./NavButton";

export default function PaymentMethodsChart() {
  return (
    <div className="bg-white rounded-xl card-shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold text-[#1E293B] truncate">
          Formas de Pagamento (Mes)
        </h3>
        <NavButton
          to={routes.financeiro}
          className="text-[12px] text-[#94A3B8] hover:text-[#0E7490] transition-colors shrink-0"
        >
          Ver financeiro
        </NavButton>
      </div>
      <p className="text-[13px] text-[#64748B] py-8 text-center">
        Sem pagamentos registrados neste mes. Lance recebimentos no modulo financeiro.
      </p>
    </div>
  );
}
