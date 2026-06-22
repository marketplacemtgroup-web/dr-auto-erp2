import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Calendar, Check, Wrench, X } from "lucide-react";
import { api, getErrorMessage, type MaintenanceReminderRow } from "../lib/api";
import { routes } from "../lib/routes";
import { useApiQuery, useAuthToken } from "../hooks/useApiQuery";
import NavButton from "./NavButton";

const TYPE_LABEL: Record<string, string> = {
  REVISION: "Revisão",
  OIL_CHANGE: "Troca de óleo",
};

type Filter = "overdue" | "upcoming" | "all";

export default function PreventiveMaintenancePanel() {
  const token = useAuthToken();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("overdue");

  const { data, isLoading, error } = useApiQuery(
    ["maintenance-reminders", filter],
    (t) => api.maintenanceReminders(t, filter),
  );

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "COMPLETED" | "DISMISSED" }) =>
      api.updateMaintenanceReminder(token!, id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-month-overdue"] });
    },
  });

  function formatDue(row: MaintenanceReminderRow) {
    const parts: string[] = [];
    if (row.dueKm != null) {
      const current = row.vehicle.currentKm;
      parts.push(
        current != null
          ? `${current.toLocaleString("pt-BR")} / ${row.dueKm.toLocaleString("pt-BR")} km`
          : `${row.dueKm.toLocaleString("pt-BR")} km`,
      );
    }
    if (row.dueDate) {
      parts.push(new Date(row.dueDate).toLocaleDateString("pt-BR"));
    }
    return parts.join(" · ") || "—";
  }

  return (
    <div className="mb-5 bg-white rounded-xl border-2 border-[#0E7490]/30 card-shadow overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E2E8F0] bg-gradient-to-r from-[#ECFEFF] to-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-[#0E7490]/10 flex items-center justify-center text-[#0E7490]">
            <Wrench size={18} />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-[#1E293B]">
              Manutenções Preventivas
            </h2>
            <p className="text-[12px] text-[#64748B]">
              Revisões e trocas de óleo após entrega — prioridade da oficina
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["overdue", "Vencidos"],
              ["upcoming", "Próximos 7 dias"],
              ["all", "Todos"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`h-8 px-3 rounded-lg text-[12px] font-medium ${
                filter === key
                  ? "bg-[#0F3D4C] text-white"
                  : "border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="px-5 py-6 text-sm text-red-600">{getErrorMessage(error)}</p>
      ) : isLoading ? (
        <p className="px-5 py-6 text-sm text-[#64748B]">Carregando lembretes...</p>
      ) : (data?.length ?? 0) === 0 ? (
        <p className="px-5 py-8 text-sm text-[#94A3B8] text-center">
          Nenhum lembrete de manutenção neste filtro.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] text-left text-[#64748B] text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Placa</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">OS origem</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data!.map((row) => (
                <tr
                  key={row.id}
                  className={`border-t border-[#F1F5F9] ${
                    row.isOverdue ? "bg-red-50/50" : row.isUpcoming ? "bg-amber-50/40" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-semibold text-[#0E7490]">{row.vehicle.plate}</td>
                  <td className="px-4 py-3">{row.vehicle.customer.name}</td>
                  <td className="px-4 py-3">{TYPE_LABEL[row.type] ?? row.type}</td>
                  <td className="px-4 py-3">
                    <NavButton
                      to={routes.ordemDeServicoDetalhe(row.serviceOrder.id)}
                      className="text-[#0E7490] hover:underline"
                    >
                      #{row.serviceOrder.number}
                    </NavButton>
                  </td>
                  <td className="px-4 py-3 text-[#64748B]">{formatDue(row)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title="Agendar"
                        onClick={() => navigate(routes.agenda)}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-white"
                      >
                        <Calendar size={14} />
                      </button>
                      <button
                        type="button"
                        title="Marcar como feito"
                        disabled={updateStatus.isPending}
                        onClick={() =>
                          updateStatus.mutate({ id: row.id, status: "COMPLETED" })
                        }
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[#E2E8F0] text-[#16A34A] hover:bg-green-50"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        title="Dispensar"
                        disabled={updateStatus.isPending}
                        onClick={() =>
                          updateStatus.mutate({ id: row.id, status: "DISMISSED" })
                        }
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[#E2E8F0] text-[#94A3B8] hover:bg-red-50 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
