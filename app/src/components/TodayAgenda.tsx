import { routes } from "../lib/routes";
import NavButton from "./NavButton";

export default function TodayAgenda() {
  return (
    <div className="bg-white rounded-xl card-shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold text-[#1E293B]">Agenda de Hoje</h3>
        <NavButton
          to={routes.agenda}
          className="text-[12px] text-[#94A3B8] hover:text-[#0E7490] transition-colors"
        >
          Ver agenda
        </NavButton>
      </div>
      <p className="text-[13px] text-[#64748B] py-6 text-center">
        Nenhum agendamento para hoje. Cadastre na agenda quando o modulo estiver em uso.
      </p>
    </div>
  );
}
