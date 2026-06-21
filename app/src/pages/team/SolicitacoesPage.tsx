import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import DataTable from "../../components/modules/DataTable";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import { api, type EmployeeRequestRow } from "../../lib/api";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";
import { usePermissions } from "../../hooks/usePermissions";

const REQUEST_TYPES: Record<string, string> = {
  AJUSTE_PONTO: "Ajuste de ponto",
  JUSTIFICATIVA_ATRASO: "Justificativa de atraso",
  JUSTIFICATIVA_FALTA: "Justificativa de falta",
  FOLGA: "Folga",
  TROCA_ESCALA: "Troca de escala",
  OBSERVACAO_GERENTE: "Observação ao gerente",
};

const STATUS_LABELS: Record<string, string> = {
  ENVIADA: "Enviada",
  EM_ANALISE: "Em análise",
  APROVADA: "Aprovada",
  RECUSADA: "Recusada",
  CANCELADA: "Cancelada",
};

function monthBounds() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
}

export default function SolicitacoesPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const bounds = monthBounds();

  const canCreate = has("solicitacoes.criar") || has("team.manage") || has("admin.access");
  const canApprove = has("solicitacoes.aprovar") || has("team.manage") || has("admin.access");

  const [periodStart, setPeriodStart] = useState(bounds.start);
  const [periodEnd, setPeriodEnd] = useState(bounds.end);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    requestType: "FOLGA",
    referenceDate: new Date().toISOString().slice(0, 10),
    description: "",
  });

  const { data: employees } = useApiQuery(["employees-active"], (t) =>
    api.employees(t, { status: "ACTIVE" }),
  );

  const { data, isLoading, error } = useApiQuery(
    ["solicitacoes", periodStart, periodEnd, employeeFilter, typeFilter, statusFilter],
    (t) =>
      api.solicitacoesFuncionarios(t, {
        periodStart,
        periodEnd,
        employeeId: employeeFilter || undefined,
        requestType: typeFilter || undefined,
        status: statusFilter || undefined,
      }),
  );

  const save = useMutation({
    mutationFn: () =>
      api.createSolicitacaoFuncionario(token!, {
        ...form,
        employeeId: form.employeeId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solicitacoes"] });
      setDrawerOpen(false);
    },
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.aprovarSolicitacaoFuncionario(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solicitacoes"] });
      queryClient.invalidateQueries({ queryKey: ["escalas"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-painel"] });
    },
  });

  const reject = useMutation({
    mutationFn: (id: string) =>
      api.recusarSolicitacaoFuncionario(token!, id, "Recusado pelo gestor"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["solicitacoes"] }),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.cancelarSolicitacaoFuncionario(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["solicitacoes"] }),
  });

  return (
    <>
      <ModulePageShell
        title="Solicitações"
        description="Folgas, trocas de escala, justificativas e ajustes de ponto."
        actionLabel={canCreate ? "Nova solicitação" : undefined}
        onAction={canCreate ? () => setDrawerOpen(true) : undefined}
      >
        <div className="flex flex-wrap gap-3 mb-4">
          <input type="date" className={inputClass} value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          <input type="date" className={inputClass} value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          <select className={selectClass} value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
            <option value="">Todos funcionários</option>
            {(employees ?? []).map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <select className={selectClass} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Todos tipos</option>
            {Object.entries(REQUEST_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <DataTable
          loading={isLoading}
          error={error ?? null}
          columns={[
            { key: "emp", header: "Funcionário", render: (r: EmployeeRequestRow) => r.employee.name },
            {
              key: "type",
              header: "Tipo",
              render: (r: EmployeeRequestRow) => REQUEST_TYPES[r.requestType] ?? r.requestType,
            },
            {
              key: "date",
              header: "Data ref.",
              render: (r: EmployeeRequestRow) => new Date(r.referenceDate).toLocaleDateString("pt-BR"),
            },
            {
              key: "desc",
              header: "Descrição",
              render: (r: EmployeeRequestRow) =>
                r.description.length > 60 ? `${r.description.slice(0, 60)}…` : r.description,
            },
            {
              key: "status",
              header: "Status",
              render: (r: EmployeeRequestRow) => STATUS_LABELS[r.status] ?? r.status,
            },
            {
              key: "created",
              header: "Criado em",
              render: (r: EmployeeRequestRow) => new Date(r.createdAt).toLocaleString("pt-BR"),
            },
            {
              key: "actions",
              header: "Ações",
              render: (r: EmployeeRequestRow) => (
                <div className="flex gap-2 flex-wrap">
                  {canApprove && (r.status === "ENVIADA" || r.status === "EM_ANALISE") && (
                    <>
                      <button type="button" className="text-[#0057D9] text-[13px]" onClick={() => approve.mutate(r.id)}>Aprovar</button>
                      <button type="button" className="text-red-600 text-[13px]" onClick={() => reject.mutate(r.id)}>Recusar</button>
                    </>
                  )}
                  {(r.status === "ENVIADA" || r.status === "EM_ANALISE") && (
                    <button type="button" className="text-[#6B7280] text-[13px]" onClick={() => cancel.mutate(r.id)}>Cancelar</button>
                  )}
                </div>
              ),
            },
          ]}
          rows={data ?? []}
        />
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Nova solicitação"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        loading={save.isPending}
      >
        <FormField label="Funcionário (opcional se for o seu)">
          <select className={selectClass} value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}>
            <option value="">Meu cadastro</option>
            {(employees ?? []).map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Tipo *">
          <select className={selectClass} value={form.requestType} onChange={(e) => setForm((f) => ({ ...f, requestType: e.target.value }))}>
            {Object.entries(REQUEST_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Data de referência *">
          <input type="date" className={inputClass} value={form.referenceDate} onChange={(e) => setForm((f) => ({ ...f, referenceDate: e.target.value }))} required />
        </FormField>
        <FormField label="Descrição *">
          <textarea className={inputClass} rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
        </FormField>
      </FormDrawer>
    </>
  );
}
