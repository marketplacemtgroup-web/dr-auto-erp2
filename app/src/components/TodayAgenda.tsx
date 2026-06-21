import { useMemo } from "react";
import { Clock } from "lucide-react";
import { api, getErrorMessage, type AppointmentRow } from "../lib/api";
import { localDayRangeIso } from "../lib/datetimeLocal";
import { routes } from "../lib/routes";
import { useApiQuery } from "../hooks/useApiQuery";
import NavButton from "./NavButton";

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluido",
  CANCELLED: "Cancelado",
  NO_SHOW: "Nao compareceu",
};

export default function TodayAgenda() {
  const { from, to } = useMemo(() => localDayRangeIso(new Date()), []);
  const { data, isLoading, error } = useApiQuery(
    ["appointments-today", from, to],
    (t) => api.appointments(t, from, to),
  );

  const today = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      ),
    [data],
  );

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

      {error ? (
        <p className="text-[13px] text-red-600 py-4 text-center">
          {getErrorMessage(error, "Nao foi possivel carregar a agenda")}
        </p>
      ) : isLoading ? (
        <p className="text-[13px] text-[#64748B] py-6 text-center">Carregando...</p>
      ) : today.length === 0 ? (
        <p className="text-[13px] text-[#64748B] py-6 text-center">
          Nenhum agendamento para hoje.
        </p>
      ) : (
        <ul className="space-y-2">
          {today.map((item) => (
            <TodayAgendaItem key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TodayAgendaItem({ item }: { item: AppointmentRow }) {
  const time = new Date(item.scheduledAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li className="flex items-start gap-3 rounded-lg border border-[#E2E8F0] px-3 py-2.5">
      <div className="mt-0.5 text-[#0E7490]">
        <Clock size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#1E293B]">
          {time} — {item.vehicle.plate}
        </p>
        <p className="text-[12px] text-[#64748B] truncate">{item.vehicle.customer.name}</p>
        <p className="text-[11px] text-[#94A3B8] mt-0.5">
          {STATUS_LABEL[item.status] ?? item.status}
          {item.serviceOrder ? ` · OS #${item.serviceOrder.number}` : ""}
        </p>
      </div>
    </li>
  );
}
