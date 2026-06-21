import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import KpiStrip from "../../components/modules/KpiStrip";
import DataTable from "../../components/modules/DataTable";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import { api, type ScheduleRow } from "../../lib/api";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";
import { usePermissions } from "../../hooks/usePermissions";

const DAY_TYPES: Record<string, string> = {
  TRABALHO: "Trabalho",
  FOLGA: "Folga",
  PLANTAO: "Plantão",
  FERIADO: "Feriado",
  COMPENSACAO: "Compensação",
  AFASTADO: "Afastado",
  TREINAMENTO: "Treinamento",
  OUTRO: "Outro",
};

const DAY_TYPE_COLORS: Record<string, string> = {
  TRABALHO: "bg-blue-100 text-blue-800",
  FOLGA: "bg-gray-100 text-gray-700",
  PLANTAO: "bg-purple-100 text-purple-800",
  FERIADO: "bg-red-100 text-red-800",
  COMPENSACAO: "bg-amber-100 text-amber-800",
  AFASTADO: "bg-orange-100 text-orange-800",
  TREINAMENTO: "bg-teal-100 text-teal-800",
  OUTRO: "bg-slate-100 text-slate-700",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function monthBounds() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
}

export default function EscalasPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const bounds = monthBounds();
  const canManage = has("escalas.criar") || has("team.manage") || has("admin.access");

  const [view, setView] = useState<"lista" | "calendario">("lista");
  const [periodStart, setPeriodStart] = useState(bounds.start);
  const [periodEnd, setPeriodEnd] = useState(bounds.end);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [dayTypeFilter, setDayTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    scheduleDate: new Date().toISOString().slice(0, 10),
    dayType: "TRABALHO",
    startTime: "08:00",
    endTime: "18:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    isRecurring: false,
    daysOfWeek: [1, 2, 3, 4, 5] as number[],
    periodStart: bounds.start,
    periodEnd: bounds.end,
    notes: "",
  });

  const { data: stats } = useApiQuery(["escalas-stats"], (t) => api.escalasStats(t));
  const { data: employees } = useApiQuery(["employees-active"], (t) =>
    api.employees(t, { status: "ACTIVE" }),
  );
  const { data, isLoading, error } = useApiQuery(
    ["escalas", periodStart, periodEnd, employeeFilter, dayTypeFilter, statusFilter],
    (t) =>
      api.escalas(t, {
        periodStart,
        periodEnd,
        employeeId: employeeFilter || undefined,
        dayType: dayTypeFilter || undefined,
        status: statusFilter || undefined,
      }),
  );

  const save = useMutation({
    mutationFn: async () => {
      if (form.isRecurring) {
        return api.createEscalaRecorrencia(token!, {
          employeeId: form.employeeId,
          daysOfWeek: form.daysOfWeek,
          dayType: form.dayType,
          startTime: form.dayType === "FOLGA" ? undefined : form.startTime,
          endTime: form.dayType === "FOLGA" ? undefined : form.endTime,
          breakStart: form.breakStart || undefined,
          breakEnd: form.breakEnd || undefined,
          periodStart: form.periodStart,
          periodEnd: form.periodEnd,
        });
      }
      return api.createEscala(token!, {
        employeeId: form.employeeId,
        scheduleDate: form.scheduleDate,
        dayType: form.dayType,
        startTime: form.dayType === "FOLGA" ? undefined : form.startTime,
        endTime: form.dayType === "FOLGA" ? undefined : form.endTime,
        breakStart: form.breakStart || undefined,
        breakEnd: form.breakEnd || undefined,
        notes: form.notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalas"] });
      queryClient.invalidateQueries({ queryKey: ["escalas-stats"] });
      setDrawerOpen(false);
    },
  });

  const cancelSchedule = useMutation({
    mutationFn: (id: string) => api.cancelEscala(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalas"] });
      queryClient.invalidateQueries({ queryKey: ["escalas-stats"] });
    },
  });

  const calendarWeeks = useMemo(() => {
    const rows = data ?? [];
    const start = new Date(`${periodStart}T12:00:00`);
    const end = new Date(`${periodEnd}T12:00:00`);
    const weeks: { date: string; items: ScheduleRow[] }[][] = [];
    let cur = new Date(start);
    cur.setDate(cur.getDate() - cur.getDay());
    while (cur <= end) {
      const week: { date: string; items: ScheduleRow[] }[] = [];
      for (let i = 0; i < 7; i++) {
        const dateStr = cur.toISOString().slice(0, 10);
        week.push({
          date: dateStr,
          items: rows.filter(
            (r) => new Date(r.scheduleDate).toISOString().slice(0, 10) === dateStr,
          ),
        });
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [data, periodStart, periodEnd]);

  return (
    <>
      <ModulePageShell
        title="Escalas"
        description="Planeje e acompanhe a escala de trabalho da equipe."
        actionLabel={canManage ? "Nova escala" : undefined}
        onAction={canManage ? () => setDrawerOpen(true) : undefined}
      >
        <KpiStrip
          items={[
            { label: "Escalados hoje", value: String(stats?.workingToday ?? 0) },
            { label: "De folga hoje", value: String(stats?.offToday ?? 0) },
            { label: "Plantões na semana", value: String(stats?.weekPlantao ?? 0) },
            {
              label: "Pendentes confirmação",
              value: String(stats?.pendingConfirm ?? 0),
              tone: stats?.pendingConfirm ? "warning" : undefined,
            },
          ]}
        />

        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div className="flex gap-1 bg-white border border-[#E5E7EB] rounded-lg p-1">
            <button
              type="button"
              className={`px-3 py-1.5 text-[13px] rounded-md ${view === "lista" ? "bg-[#0057D9] text-white" : "text-[#6B7280]"}`}
              onClick={() => setView("lista")}
            >
              Lista
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-[13px] rounded-md ${view === "calendario" ? "bg-[#0057D9] text-white" : "text-[#6B7280]"}`}
              onClick={() => setView("calendario")}
            >
              Calendário
            </button>
          </div>
          <input type="date" className={inputClass} value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          <input type="date" className={inputClass} value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          <select className={selectClass} value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
            <option value="">Todos funcionários</option>
            {(employees ?? []).map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <select className={selectClass} value={dayTypeFilter} onChange={(e) => setDayTypeFilter(e.target.value)}>
            <option value="">Todos tipos</option>
            {Object.entries(DAY_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos status</option>
            <option value="PLANEJADA">Planejada</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="ALTERADA">Alterada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>

        {view === "lista" ? (
          <DataTable
            loading={isLoading}
            error={error ?? null}
            columns={[
              { key: "emp", header: "Funcionário", render: (r: ScheduleRow) => r.employee.name },
              { key: "cargo", header: "Cargo", render: (r: ScheduleRow) => r.employee.jobTitle?.name ?? "—" },
              {
                key: "date",
                header: "Data",
                render: (r: ScheduleRow) => new Date(r.scheduleDate).toLocaleDateString("pt-BR"),
              },
              { key: "dow", header: "Dia", render: (r: ScheduleRow) => WEEKDAYS[r.dayOfWeek] ?? "—" },
              { key: "in", header: "Entrada", render: (r: ScheduleRow) => r.startTime ?? "—" },
              { key: "out", header: "Saída", render: (r: ScheduleRow) => r.endTime ?? "—" },
              {
                key: "break",
                header: "Intervalo",
                render: (r: ScheduleRow) =>
                  r.breakStart ? `${r.breakStart} - ${r.breakEnd ?? "—"}` : "—",
              },
              {
                key: "type",
                header: "Tipo",
                render: (r: ScheduleRow) => (
                  <span className={`px-2 py-0.5 rounded text-[12px] ${DAY_TYPE_COLORS[r.dayType] ?? ""}`}>
                    {DAY_TYPES[r.dayType] ?? r.dayType}
                  </span>
                ),
              },
              { key: "status", header: "Status", render: (r: ScheduleRow) => r.status },
            ]}
            rows={data ?? []}
            onDelete={canManage ? (r) => cancelSchedule.mutate(r.id) : undefined}
          />
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 bg-[#F9FAFB] border-b border-[#E5E7EB]">
              {WEEKDAYS.map((d) => (
                <div key={d} className="p-2 text-[12px] font-medium text-[#6B7280] text-center">{d}</div>
              ))}
            </div>
            {calendarWeeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-[#E5E7EB] last:border-b-0 min-h-[100px]">
                {week.map((cell) => (
                  <div key={cell.date} className="p-2 border-r border-[#E5E7EB] last:border-r-0 text-[12px]">
                    <div className="text-[#9CA3AF] mb-1">{cell.date.slice(8)}</div>
                    {cell.items.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className={`mb-1 px-1 py-0.5 rounded truncate ${DAY_TYPE_COLORS[item.dayType] ?? "bg-gray-50"}`}
                        title={`${item.employee.name} — ${DAY_TYPES[item.dayType]}`}
                      >
                        {item.employee.name.split(" ")[0]}
                      </div>
                    ))}
                    {cell.items.length > 3 && (
                      <div className="text-[#9CA3AF]">+{cell.items.length - 3}</div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Nova escala"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        loading={save.isPending}
      >
        <FormField label="Funcionário *">
          <select
            className={selectClass}
            value={form.employeeId}
            onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
            required
          >
            <option value="">Selecione</option>
            {(employees ?? []).map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Recorrente semanal">
          <input
            type="checkbox"
            checked={form.isRecurring}
            onChange={(e) => setForm((f) => ({ ...f, isRecurring: e.target.checked }))}
          />
        </FormField>
        {!form.isRecurring ? (
          <FormField label="Data *">
            <input
              type="date"
              className={inputClass}
              value={form.scheduleDate}
              onChange={(e) => setForm((f) => ({ ...f, scheduleDate: e.target.value }))}
            />
          </FormField>
        ) : (
          <>
            <FormField label="Período início">
              <input type="date" className={inputClass} value={form.periodStart} onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))} />
            </FormField>
            <FormField label="Período fim">
              <input type="date" className={inputClass} value={form.periodEnd} onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))} />
            </FormField>
            <FormField label="Dias da semana">
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((label, idx) => (
                  <label key={label} className="flex items-center gap-1 text-[13px]">
                    <input
                      type="checkbox"
                      checked={form.daysOfWeek.includes(idx)}
                      onChange={(e) => {
                        setForm((f) => ({
                          ...f,
                          daysOfWeek: e.target.checked
                            ? [...f.daysOfWeek, idx].sort()
                            : f.daysOfWeek.filter((d) => d !== idx),
                        }));
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </FormField>
          </>
        )}
        <FormField label="Tipo">
          <select className={selectClass} value={form.dayType} onChange={(e) => setForm((f) => ({ ...f, dayType: e.target.value }))}>
            {Object.entries(DAY_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </FormField>
        {form.dayType !== "FOLGA" && form.dayType !== "AFASTADO" && (
          <>
            <FormField label="Entrada">
              <input type="time" className={inputClass} value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </FormField>
            <FormField label="Saída">
              <input type="time" className={inputClass} value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
            </FormField>
            <FormField label="Intervalo início">
              <input type="time" className={inputClass} value={form.breakStart} onChange={(e) => setForm((f) => ({ ...f, breakStart: e.target.value }))} />
            </FormField>
            <FormField label="Intervalo fim">
              <input type="time" className={inputClass} value={form.breakEnd} onChange={(e) => setForm((f) => ({ ...f, breakEnd: e.target.value }))} />
            </FormField>
          </>
        )}
        <FormField label="Observações">
          <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </FormField>
      </FormDrawer>
    </>
  );
}
