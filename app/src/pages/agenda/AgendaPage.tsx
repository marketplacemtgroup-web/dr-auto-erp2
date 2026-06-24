import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import ConfirmDialog from "../../components/modules/ConfirmDialog";
import DateTimeField from "../../components/modules/DateTimeField";
import VehicleSearchSelect from "../../components/vehicles/VehicleSearchSelect";
import { endOfLocalWeek, fromDatetimeLocalValue, toDatetimeLocalValue } from "../../lib/datetimeLocal";
import { api, getErrorMessage, type AppointmentRow } from "../../lib/api";
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

const INACTIVE_STATUSES = new Set(["CANCELLED", "COMPLETED"]);

const emptyForm = {
  vehicleId: "",
  scheduledAt: "",
  durationMinutes: "60",
  bay: "",
  notes: "",
  mechanicMemberId: "",
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
  const [hideInactive, setHideInactive] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppointmentRow | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const weekEnd = useMemo(() => endOfLocalWeek(weekStart), [weekStart]);
  const weekFrom = weekStart.toISOString();
  const weekTo = weekEnd.toISOString();

  const { data: vehicles, isLoading: vehiclesLoading, error: vehiclesError } = useApiQuery(
    ["vehicles-all"],
    (t) => api.vehicles(t),
  );
  const { data: employees } = useApiQuery(["employees-agenda"], (t) =>
    api.employees(t, { status: "ACTIVE" }),
  );
  const { data, isLoading, error: listError } = useApiQuery(
    ["appointments", weekFrom, weekTo],
    (t) => api.appointments(t, weekFrom, weekTo),
  );

  const mechanics = useMemo(
    () =>
      (employees ?? [])
        .filter((e) => e.member?.id && e.isTechnical)
        .map((e) => ({ id: e.member!.id, name: e.name })),
    [employees],
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
      if (hideInactive && INACTIVE_STATUSES.has(a.status)) continue;
      const key = new Date(a.scheduledAt).toDateString();
      if (map.has(key)) map.get(key)!.push(a);
      else map.set(key, [a]);
    }
    for (const [, list] of map) {
      list.sort((x, y) => new Date(x.scheduledAt).getTime() - new Date(y.scheduledAt).getTime());
    }
    return map;
  }, [data, days, hideInactive]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["appointments"] });

  const openCreate = () => {
    setEditingId(null);
    setSaveError(null);
    setForm(emptyForm);
    setDrawerOpen(true);
  };

  const openEdit = (a: AppointmentRow) => {
    setEditingId(a.id);
    setSaveError(null);
    setForm({
      vehicleId: a.vehicle.id,
      scheduledAt: toDatetimeLocalValue(a.scheduledAt),
      durationMinutes: String(a.durationMinutes),
      bay: a.bay ?? "",
      notes: a.notes ?? "",
      mechanicMemberId: a.mechanic?.id ?? "",
    });
    setDrawerOpen(true);
  };

  const saveAppointment = useMutation({
    mutationFn: () => {
      const scheduledAt = fromDatetimeLocalValue(form.scheduledAt);
      if (!scheduledAt) throw new Error("Informe data e hora do agendamento");
      const durationMinutes = Number(form.durationMinutes);
      if (!Number.isFinite(durationMinutes) || durationMinutes < 15) {
        throw new Error("Duracao minima: 15 minutos");
      }
      const payload = {
        vehicleId: form.vehicleId,
        scheduledAt,
        durationMinutes,
        bay: form.bay || undefined,
        notes: form.notes || undefined,
        mechanicMemberId: form.mechanicMemberId || undefined,
      };
      if (editingId) {
        return api.updateAppointment(token!, editingId, payload);
      }
      return api.createAppointment(token!, payload);
    },
    onSuccess: () => {
      invalidate();
      setDrawerOpen(false);
      setSaveError(null);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (err) => setSaveError(getErrorMessage(err)),
  });

  const cancelAppointment = useMutation({
    mutationFn: (id: string) => api.updateAppointment(token!, id, { status: "CANCELLED" }),
    onSuccess: () => {
      invalidate();
      setActionError(null);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const confirmAppointment = useMutation({
    mutationFn: (id: string) => api.updateAppointment(token!, id, { status: "CONFIRMED" }),
    onSuccess: () => {
      invalidate();
      setActionError(null);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const deleteAppointment = useMutation({
    mutationFn: (id: string) => api.deleteAppointment(token!, id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      setActionError(null);
    },
    onError: (err) => {
      setActionError(getErrorMessage(err));
      setDeleteTarget(null);
    },
  });

  const convertToOs = useMutation({
    mutationFn: (id: string) => api.convertAppointmentToOs(token!, id),
    onSuccess: (appt) => {
      invalidate();
      setActionError(null);
      const soId = appt.serviceOrderId ?? appt.serviceOrder?.id;
      if (soId) navigate(routes.ordemDeServicoDetalhe(soId));
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const rescheduleFrom = (a: AppointmentRow) => {
    cancelAppointment.mutate(a.id, {
      onSuccess: () => {
        setEditingId(null);
        setForm({
          vehicleId: a.vehicle.id,
          scheduledAt: "",
          durationMinutes: String(a.durationMinutes),
          bay: a.bay ?? "",
          notes: a.notes ?? "",
          mechanicMemberId: a.mechanic?.id ?? "",
        });
        setDrawerOpen(true);
      },
    });
  };

  const weekLabel = `${weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${addDays(weekStart, 6).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;
  const listErrorMessage = listError ? getErrorMessage(listError, "Nao foi possivel carregar a agenda") : null;

  return (
    <>
      <ModulePageShell
        title="Agenda"
        description="Agendamentos da oficina — converta em OS com um clique"
        actionLabel="Novo agendamento"
        onAction={openCreate}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white rounded-xl border border-[#E2E8F0] px-4 py-3">
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

        <label className="flex items-center gap-2 mb-4 text-sm text-[#64748B] cursor-pointer">
          <input
            type="checkbox"
            checked={hideInactive}
            onChange={(e) => setHideInactive(e.target.checked)}
            className="rounded border-[#CBD5E1]"
          />
          Ocultar cancelados e concluidos
        </label>

        {actionError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}

        {listErrorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {listErrorMessage}
          </div>
        ) : isLoading ? (
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
                    {list.map((a) => {
                      const inactive = INACTIVE_STATUSES.has(a.status);
                      const isPortalPending = a.source === "PORTAL" && a.status === "SCHEDULED";
                      return (
                        <div
                          key={a.id}
                          className={`rounded-lg border p-2 text-[11px] ${
                            inactive
                              ? "border-[#E2E8F0] bg-[#F1F5F9] opacity-60"
                              : "border-[#E2E8F0] bg-[#F8FAFC]"
                          }`}
                        >
                          <p className="font-bold text-[#0E7490]">
                            {new Date(a.scheduledAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="font-medium text-[#1E293B] truncate">{a.vehicle.plate}</p>
                          <p className="text-[#64748B] truncate">{a.vehicle.customer.name}</p>
                          <p className="text-[#94A3B8] mt-0.5">
                            {STATUS_LABEL[a.status] ?? a.status}
                            {a.source === "PORTAL" ? " · Portal" : ""}
                          </p>
                          {isPortalPending && (
                            <button
                              type="button"
                              disabled={confirmAppointment.isPending}
                              onClick={() => confirmAppointment.mutate(a.id)}
                              className="mt-1 w-full flex items-center justify-center gap-1 h-6 rounded bg-[#16A34A] text-white text-[10px] font-medium"
                            >
                              <Check size={10} />
                              Confirmar
                            </button>
                          )}
                          {!inactive && !a.serviceOrder && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              <button
                                type="button"
                                disabled={convertToOs.isPending}
                                onClick={() => {
                                  setActionError(null);
                                  convertToOs.mutate(a.id);
                                }}
                                className="flex-1 flex items-center justify-center gap-1 h-6 rounded bg-[#0F3D4C] text-white text-[10px] font-medium disabled:opacity-60"
                              >
                                <ClipboardPlus size={10} />
                                OS
                              </button>
                              <button
                                type="button"
                                title="Remarcar"
                                onClick={() => rescheduleFrom(a)}
                                className="h-6 w-6 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] hover:bg-white"
                              >
                                <CalendarClock size={10} />
                              </button>
                              <button
                                type="button"
                                title="Editar"
                                onClick={() => openEdit(a)}
                                className="h-6 w-6 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] hover:bg-white"
                              >
                                <Pencil size={10} />
                              </button>
                              <button
                                type="button"
                                title="Cancelar"
                                onClick={() => cancelAppointment.mutate(a.id)}
                                className="h-6 w-6 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] hover:bg-red-50 hover:text-red-600"
                              >
                                <X size={10} />
                              </button>
                              <button
                                type="button"
                                title="Excluir"
                                onClick={() => setDeleteTarget(a)}
                                className="h-6 w-6 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          )}
                          {a.serviceOrder && (
                            <button
                              type="button"
                              className="mt-1 text-[#0E7490] underline"
                              onClick={() =>
                                navigate(routes.ordemDeServicoDetalhe(a.serviceOrder!.id))
                              }
                            >
                              OS #{a.serviceOrder.number}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        title={editingId ? "Editar agendamento" : "Novo agendamento"}
        error={saveError}
        onClose={() => {
          setDrawerOpen(false);
          setSaveError(null);
          setEditingId(null);
        }}
        onSubmit={(e) => {
          e.preventDefault();
          setSaveError(null);
          saveAppointment.mutate();
        }}
        loading={saveAppointment.isPending}
        submitLabel={editingId ? "Salvar" : "Agendar"}
      >
        <FormField label="Veiculo *">
          <VehicleSearchSelect
            vehicles={vehicles}
            value={form.vehicleId}
            onChange={(vehicleId) => setForm((f) => ({ ...f, vehicleId }))}
            loading={vehiclesLoading}
            required
            placeholder="Buscar por placa ou cliente..."
          />
          {vehiclesError && (
            <p className="mt-1 text-xs text-red-600">
              {getErrorMessage(vehiclesError, "Nao foi possivel carregar veiculos")}
            </p>
          )}
        </FormField>
        <FormField label="Data e hora *">
          <DateTimeField
            value={form.scheduledAt}
            onChange={(scheduledAt) => setForm((f) => ({ ...f, scheduledAt }))}
            required
          />
        </FormField>
        <FormField label="Duracao (min)">
          <input
            type="number"
            min={15}
            step={15}
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
            {mechanics.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir agendamento"
        message={`Excluir agendamento de ${deleteTarget?.vehicle.plate}? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleteAppointment.isPending}
        onConfirm={() => deleteTarget && deleteAppointment.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
