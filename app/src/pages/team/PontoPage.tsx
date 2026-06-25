import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import KpiStrip from "../../components/modules/KpiStrip";
import DataTable from "../../components/modules/DataTable";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import { api, type PontoPainel, type TimeClockDayRow } from "../../lib/api";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";
import { usePermissions } from "../../hooks/usePermissions";

function formatMinutes(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}h${min.toString().padStart(2, "0")}`;
}

function monthBounds() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
}

export default function PontoPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const today = new Date().toISOString().slice(0, 10);
  const bounds = monthBounds();

  const canBater = has("ponto.bater") || has("team.manage") || has("admin.access");
  const canAdjust = has("ponto.ajustar") || has("team.manage") || has("admin.access");
  const canApprove = has("ponto.aprovar_ajuste") || has("team.manage") || has("admin.access");

  const [tab, setTab] = useState<"painel" | "historico" | "ajustes" | "relatorio">("painel");
  const [workDate, setWorkDate] = useState(today);
  const [periodStart, setPeriodStart] = useState(bounds.start);
  const [periodEnd, setPeriodEnd] = useState(bounds.end);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [adjustDrawer, setAdjustDrawer] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    employeeId: "",
    workDate: today,
    clockIn: "",
    breakStart: "",
    breakEnd: "",
    clockOut: "",
    notes: "",
  });

  const { data: painel, isLoading: loadingPainel } = useApiQuery<PontoPainel>(
    ["ponto-painel", workDate],
    (t) => api.pontoPainel(t, workDate),
    tab === "painel",
  );

  const { data: historico, isLoading: loadingHist, error: histError } = useApiQuery<TimeClockDayRow[]>(
    ["ponto-historico", periodStart, periodEnd, employeeFilter],
    (t) =>
      api.pontoHistorico(t, {
        periodStart,
        periodEnd,
        employeeId: employeeFilter || undefined,
      }),
    tab === "historico" || tab === "relatorio",
  );

  const { data: ajustes, isLoading: loadingAjustes } = useApiQuery<TimeClockDayRow[]>(
    ["ponto-ajustes"],
    (t) => api.pontoAjustesPendentes(t),
    tab === "ajustes" && canApprove,
  );

  const { data: employeesRes } = useApiQuery(["employees-active"], (t) =>
    api.employees(t, { status: "ACTIVE", limit: 50 }),
  );
  const employees = employeesRes?.data;

  const bater = useMutation({
    mutationFn: (entryType: string) => api.baterPonto(token!, { entryType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ponto-painel"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-historico"] });
    },
  });

  const saveAdjust = useMutation({
    mutationFn: () =>
      api.pontoAjuste(token!, {
        ...adjustForm,
        clockIn: adjustForm.clockIn ? `${adjustForm.workDate}T${adjustForm.clockIn}:00.000Z` : undefined,
        breakStart: adjustForm.breakStart ? `${adjustForm.workDate}T${adjustForm.breakStart}:00.000Z` : undefined,
        breakEnd: adjustForm.breakEnd ? `${adjustForm.workDate}T${adjustForm.breakEnd}:00.000Z` : undefined,
        clockOut: adjustForm.clockOut ? `${adjustForm.workDate}T${adjustForm.clockOut}:00.000Z` : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ponto-painel"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-ajustes"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-historico"] });
      setAdjustDrawer(false);
    },
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.pontoAprovarAjuste(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ponto-ajustes"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-painel"] });
    },
  });

  const reject = useMutation({
    mutationFn: (id: string) => api.pontoRecusarAjuste(token!, id, "Recusado pelo gestor"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ponto-ajustes"] }),
  });

  const stats = painel?.stats;

  return (
    <>
      <ModulePageShell
        title="Ponto Digital"
        description="Registre e acompanhe entradas, intervalos e saídas da equipe."
        actionLabel={canAdjust ? "Ajuste manual" : undefined}
        onAction={canAdjust ? () => setAdjustDrawer(true) : undefined}
      >
        {canBater && tab === "painel" && (
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { type: "ENTRADA", label: "Entrada" },
              { type: "INTERVALO_INICIO", label: "Início intervalo" },
              { type: "INTERVALO_FIM", label: "Fim intervalo" },
              { type: "SAIDA", label: "Saída" },
            ].map((btn) => (
              <button
                key={btn.type}
                type="button"
                disabled={bater.isPending}
                className="px-4 py-2 bg-[#0057D9] text-white text-[13px] rounded-lg hover:bg-[#0046B3] disabled:opacity-50"
                onClick={() => bater.mutate(btn.type)}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-1 bg-white border border-[#E5E7EB] rounded-lg p-1 mb-4 w-fit">
          {(["painel", "historico", "ajustes", "relatorio"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`px-3 py-1.5 text-[13px] rounded-md capitalize ${tab === t ? "bg-[#0057D9] text-white" : "text-[#6B7280]"}`}
              onClick={() => setTab(t)}
            >
              {t === "painel" ? "Painel do dia" : t === "historico" ? "Histórico" : t === "ajustes" ? "Ajustes pendentes" : "Relatório"}
            </button>
          ))}
        </div>

        {tab === "painel" && (
          <>
            <div className="mb-4">
              <input type="date" className={inputClass} value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
            </div>
            <KpiStrip
              items={[
                { label: "Presentes agora", value: String(stats?.presentNow ?? 0), tone: "success" },
                { label: "Entradas hoje", value: String(stats?.entriesToday ?? 0) },
                { label: "Saídas pendentes", value: String(stats?.pendingExit ?? 0) },
                { label: "Atrasos hoje", value: String(stats?.lateToday ?? 0), tone: stats?.lateToday ? "warning" : undefined },
                { label: "Ajustes pendentes", value: String(stats?.pendingAdjustments ?? 0) },
                { label: "Horas no dia", value: formatMinutes(stats?.totalWorkedMinutes ?? 0) },
              ]}
            />
            <DataTable
              loading={loadingPainel}
              error={null}
              columns={[
                { key: "emp", header: "Funcionário", render: (r: TimeClockDayRow) => r.employee.name },
                { key: "in", header: "Entrada", render: (r: TimeClockDayRow) => r.clockInFormatted ?? "—" },
                { key: "bi", header: "Int. início", render: (r: TimeClockDayRow) => r.breakStartFormatted ?? "—" },
                { key: "bf", header: "Int. fim", render: (r: TimeClockDayRow) => r.breakEndFormatted ?? "—" },
                { key: "out", header: "Saída", render: (r: TimeClockDayRow) => r.clockOutFormatted ?? "—" },
                { key: "total", header: "Trabalhado", render: (r: TimeClockDayRow) => formatMinutes(r.workedMinutes) },
                { key: "status", header: "Status", render: (r: TimeClockDayRow) => r.status },
              ]}
              rows={painel?.rows ?? []}
            />
          </>
        )}

        {(tab === "historico" || tab === "relatorio") && (
          <>
            <div className="flex flex-wrap gap-3 mb-4">
              <input type="date" className={inputClass} value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              <input type="date" className={inputClass} value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              <select className={selectClass} value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
                <option value="">Todos</option>
                {(employees ?? []).map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <DataTable
              loading={loadingHist}
              error={histError ?? null}
              columns={[
                { key: "emp", header: "Funcionário", render: (r: TimeClockDayRow) => r.employee.name },
                {
                  key: "date",
                  header: "Data",
                  render: (r: TimeClockDayRow) => new Date(r.workDate).toLocaleDateString("pt-BR"),
                },
                { key: "in", header: "Entrada", render: (r: TimeClockDayRow) => r.clockIn ? new Date(r.clockIn).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—" },
                { key: "out", header: "Saída", render: (r: TimeClockDayRow) => r.clockOut ? new Date(r.clockOut).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—" },
                { key: "worked", header: "Trabalhado", render: (r: TimeClockDayRow) => formatMinutes(r.workedMinutes) },
                { key: "late", header: "Atraso", render: (r: TimeClockDayRow) => r.lateMinutes ? formatMinutes(r.lateMinutes) : "—" },
                { key: "ot", header: "H. extra est.", render: (r: TimeClockDayRow) => r.overtimeMinutes ? formatMinutes(r.overtimeMinutes) : "—" },
                { key: "status", header: "Status", render: (r: TimeClockDayRow) => r.status },
              ]}
              rows={historico ?? []}
            />
          </>
        )}

        {tab === "ajustes" && canApprove && (
          <DataTable
            loading={loadingAjustes}
            error={null}
            columns={[
              { key: "emp", header: "Funcionário", render: (r: TimeClockDayRow) => r.employee.name },
              {
                key: "date",
                header: "Data",
                render: (r: TimeClockDayRow) => new Date(r.workDate).toLocaleDateString("pt-BR"),
              },
              { key: "status", header: "Status", render: (r: TimeClockDayRow) => r.status },
              {
                key: "actions",
                header: "Ações",
                render: (r: TimeClockDayRow) => (
                  <div className="flex gap-2">
                    <button type="button" className="text-[#0057D9] text-[13px]" onClick={() => approve.mutate(r.id)}>Aprovar</button>
                    <button type="button" className="text-red-600 text-[13px]" onClick={() => reject.mutate(r.id)}>Recusar</button>
                  </div>
                ),
              },
            ]}
            rows={ajustes ?? []}
          />
        )}
      </ModulePageShell>

      <FormDrawer
        open={adjustDrawer}
        onClose={() => setAdjustDrawer(false)}
        title="Ajuste manual de ponto"
        onSubmit={(e) => {
          e.preventDefault();
          saveAdjust.mutate();
        }}
        loading={saveAdjust.isPending}
      >
        <FormField label="Funcionário *">
          <select className={selectClass} value={adjustForm.employeeId} onChange={(e) => setAdjustForm((f) => ({ ...f, employeeId: e.target.value }))} required>
            <option value="">Selecione</option>
            {(employees ?? []).map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Data *">
          <input type="date" className={inputClass} value={adjustForm.workDate} onChange={(e) => setAdjustForm((f) => ({ ...f, workDate: e.target.value }))} />
        </FormField>
        <FormField label="Entrada">
          <input type="time" className={inputClass} value={adjustForm.clockIn} onChange={(e) => setAdjustForm((f) => ({ ...f, clockIn: e.target.value }))} />
        </FormField>
        <FormField label="Intervalo início">
          <input type="time" className={inputClass} value={adjustForm.breakStart} onChange={(e) => setAdjustForm((f) => ({ ...f, breakStart: e.target.value }))} />
        </FormField>
        <FormField label="Intervalo fim">
          <input type="time" className={inputClass} value={adjustForm.breakEnd} onChange={(e) => setAdjustForm((f) => ({ ...f, breakEnd: e.target.value }))} />
        </FormField>
        <FormField label="Saída">
          <input type="time" className={inputClass} value={adjustForm.clockOut} onChange={(e) => setAdjustForm((f) => ({ ...f, clockOut: e.target.value }))} />
        </FormField>
        <FormField label="Observações">
          <textarea className={inputClass} rows={3} value={adjustForm.notes} onChange={(e) => setAdjustForm((f) => ({ ...f, notes: e.target.value }))} />
        </FormField>
      </FormDrawer>
    </>
  );
}
