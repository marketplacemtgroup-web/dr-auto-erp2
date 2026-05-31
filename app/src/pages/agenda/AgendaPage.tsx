import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ClipboardPlus } from "lucide-react";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import { api, type AppointmentRow } from "../../lib/api";
import { routes } from "../../lib/routes";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluido",
  CANCELLED: "Cancelado",
  NO_SHOW: "Nao compareceu",
};

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function AgendaPage() {
  const token = useAuthToken();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    vehicleId: "",
    scheduledAt: "",
    durationMinutes: "60",
    bay: "",
    notes: "",
    mechanicMemberId: "",
  });

  const weekEnd = useMemo(() => {
    const e = addDays(weekStart, 7);
    e.setMilliseconds(-1);
    return e;
  }, [weekStart]);

  const { data: vehicles } = useApiQuery(["vehicles-all"], (t) => api.vehicles(t));
  const { data: members } = useApiQuery(["members"], (t) => api.organizationMembers(t));
  const { data, isLoading } = useApiQuery(
    ["appointments", weekStart.toISOString()],
    (t) => api.appointments(t, weekStart.toISOString(), weekEnd.toISOString()),
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentRow[]>();
    for (const d of days) {
      map.set(d.toDateString(), []);
    }
    for (const a of data ?? []) {
      const key = new Date(a.scheduledAt).toDateString();
      if (map.has(key)) map.get(key)!.push(a);
      else map.set(key, [a]);
    }
    for (const [, list] of map) {
      list.sort((x, y) => new Date(x.scheduledAt).getTime() - new Date(y.scheduledAt).getTime());
    }
    return map;
  }, [data, days]);

  const create = useMutation({
    mutationFn: () =>
      api.createAppointment(token!, {
        vehicleId: form.vehicleId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes) || 60,
        bay: form.bay || undefined,
        notes: form.notes || undefined,
        mechanicMemberId: form.mechanicMemberId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setDrawerOpen(false);
      setForm({
        vehicleId: "",
        scheduledAt: "",
        durationMinutes: "60",
        bay: "",
        notes: "",
        mechanicMemberId: "",
      });
    },
  });

  const convertToOs = useMutation({
    mutationFn: (id: string) => api.convertAppointmentToOs(token!, id),
    onSuccess: (appt) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      const soId = appt.serviceOrderId ?? appt.serviceOrder?.id;
      if (soId) navigate(routes.ordemDeServicoDetalhe(soId));
    },
  });

  const weekLabel = `${weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${addDays(weekStart, 6).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;

  return (
    <>
      <ModulePageShell
        title="Agenda"
        description="Agendamentos da oficina — converta em OS com um clique"
        actionLabel="Novo agendamento"
        onAction={() => setDrawerOpen(true)}
      >
        <div className="flex items-center justify-between mb-4 bg-white rounded-xl border border-[#E2E8F0] px-4 py-3">
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="p-2 rounded-lg hover:bg-[#F1F5F9]"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#1E293B]">{weekLabel}</p>
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="text-xs text-[#0E7490] hover:underline mt-0.5"
            >
              Ir para esta semana
            </button>
          </div>
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="p-2 rounded-lg hover:bg-[#F1F5F9]"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-[#64748B]">Carregando agenda...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {days.map((day) => {
              const list = byDay.get(day.toDateString()) ?? [];
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div
                  key={day.toISOString()}
                  className={`bg-white rounded-xl border min-h-[200px] flex flex-col ${
                    isToday ? "border-[#0E7490] ring-1 ring-[#0E7490]/30" : "border-[#E2E8F0]"
                  }`}
                >
                  <div
                    className={`px-2 py-2 border-b text-center text-xs font-semibold ${
                      isToday ? "bg-[#0E7490]/10 text-[#0E7490]" : "bg-[#F8FAFC] text-[#64748B]"
                    }`}
                  >
                    {day.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}
                  </div>
                  <div className="p-2 flex-1 space-y-2">
                    {list.length === 0 && (
                      <p className="text-[10px] text-[#94A3B8] text-center py-4">Livre</p>
                    )}
                    {list.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-lg border border-[#E2E8F0] p-2 text-[11px] bg-[#F8FAFC]"
                      >
                        <p className="font-bold text-[#0E7490]">
                          {new Date(a.scheduledAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="font-medium text-[#1E293B] truncate">{a.vehicle.plate}</p>
                        <p className="text-[#64748B] truncate">{a.vehicle.customer.name}</p>
                        <p className="text-[#94A3B8] mt-0.5">{STATUS_LABEL[a.status] ?? a.status}</p>
                        {a.serviceOrder ? (
                          <button
                            type="button"
                            className="mt-1 text-[#0E7490] underline"
                            onClick={() =>
                              navigate(routes.ordemDeServicoDetalhe(a.serviceOrder!.id))
                            }
                          >
                            OS #{a.serviceOrder.number}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={convertToOs.isPending}
                            onClick={() => convertToOs.mutate(a.id)}
                            className="mt-2 w-full flex items-center justify-center gap-1 h-7 rounded bg-[#0F3D4C] text-white text-[10px] font-medium"
                          >
                            <ClipboardPlus size={12} />
                            Converter em OS
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        title="Novo agendamento"
        onClose={() => setDrawerOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        loading={create.isPending}
        submitLabel="Agendar"
      >
        <FormField label="Veiculo *">
          <select
            className={selectClass}
            value={form.vehicleId}
            onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
            required
          >
            <option value="">Selecione...</option>
            {vehicles?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} — {v.customer.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Data e hora *">
          <input
            type="datetime-local"
            className={inputClass}
            value={form.scheduledAt}
            onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
            required
          />
        </FormField>
        <FormField label="Duracao (min)">
          <input
            type="number"
            className={inputClass}
            value={form.durationMinutes}
            onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
          />
        </FormField>
        <FormField label="Mecanico">
          <select
            className={selectClass}
            value={form.mechanicMemberId}
            onChange={(e) => setForm((f) => ({ ...f, mechanicMemberId: e.target.value }))}
          >
            <option value="">Nao definido</option>
            {members?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.user.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Box">
          <input
            className={inputClass}
            value={form.bay}
            onChange={(e) => setForm((f) => ({ ...f, bay: e.target.value }))}
          />
        </FormField>
        <FormField label="Observacoes">
          <textarea
            className={`${inputClass} min-h-[60px] py-2`}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </FormField>
      </FormDrawer>
    </>
  );
}
