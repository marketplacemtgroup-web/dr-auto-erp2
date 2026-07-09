import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import ServiceCatalogSearchSelect from "../../components/inventory/ServiceCatalogSearchSelect";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import DataTable from "../../components/modules/DataTable";
import { api, type CommissionRuleRow } from "../../lib/api";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";

const BASE_LABELS: Record<string, string> = {
  MAO_DE_OBRA: "Mão de obra",
  PECAS: "Peças",
  TOTAL_OS: "Total da OS",
  SERVICO_ESPECIFICO: "Serviço específico",
  PRODUTO_ESPECIFICO: "Produto específico",
  OS_FINALIZADA: "OS finalizada",
};

const TRIGGER_LABELS: Record<string, string> = {
  OS_FINALIZADA: "OS finalizada",
  OS_ENTREGUE: "OS entregue",
  SERVICO_FINALIZADO: "Serviço finalizado",
  PAGAMENTO_RECEBIDO: "Pagamento recebido",
  ORCAMENTO_APROVADO: "Orçamento aprovado",
};

export default function CommissionRulesPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    ruleType: "PERCENTUAL",
    baseCalculation: "MAO_DE_OBRA",
    percentage: "30",
    fixedAmount: "",
    trigger: "OS_FINALIZADA",
    catalogItemId: "",
    isActive: true,
  });

  const { data: employeesRes } = useApiQuery(["employees-picker"], (t) =>
    api.employees(t, { limit: 50 }),
  );
  const employees = employeesRes?.data;
  const { data, isLoading, error } = useApiQuery(["commission-rules"], (t) =>
    api.commissionRules(t),
  );
  const { data: audit } = useApiQuery(["commission-rules-audit"], (t) =>
    api.commissionRulesAudit(t),
  );

  const auditIssues = [
    ...(audit?.missingLaborRule ?? []),
    ...(audit?.riskyTotalOsRules ?? []),
    ...(audit?.wrongPercentage ?? []),
  ];

  const save = useMutation({
    mutationFn: () =>
      api.createCommissionRule(token!, {
        employeeId: form.employeeId,
        ruleType: form.ruleType,
        baseCalculation: form.baseCalculation,
        percentage: form.percentage ? Number(form.percentage) : undefined,
        fixedAmount: form.fixedAmount ? Number(form.fixedAmount) : undefined,
        trigger: form.trigger,
        catalogItemId: form.catalogItemId || undefined,
        isActive: form.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-rules"] });
      setDrawerOpen(false);
    },
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => api.duplicateCommissionRule(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["commission-rules"] }),
  });

  return (
    <>
      <ModulePageShell
        title="Regras de Comissão"
        description="Configure como cada funcionário recebe por serviços, peças, OS e metas."
        actionLabel="Nova regra"
        onAction={() => setDrawerOpen(true)}
      >
        {audit && !audit.ok && auditIssues.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 space-y-1">
            <p className="font-medium">Atenção — revisar regras de comissão dos mecânicos</p>
            {auditIssues.slice(0, 6).map((issue, idx) => (
              <p key={`${issue.issue}-${idx}`} className="text-xs">
                {issue.name}: {issue.message}
              </p>
            ))}
            {auditIssues.length > 6 && (
              <p className="text-xs text-amber-800">+ {auditIssues.length - 6} alerta(s)</p>
            )}
            <p className="text-xs pt-1 border-t border-amber-200">
              Comissão de mecânico deve ser sobre mão de obra executada (MAO_DE_OBRA), não sobre o
              total da OS.
            </p>
          </div>
        )}
        <DataTable
          loading={isLoading}
          error={error ?? null}
          columns={[
            {
              key: "emp",
              header: "Funcionário",
              render: (r: CommissionRuleRow) => r.employee?.name ?? "—",
            },
            {
              key: "base",
              header: "Base",
              render: (r: CommissionRuleRow) => BASE_LABELS[r.baseCalculation] ?? r.baseCalculation,
            },
            {
              key: "pct",
              header: "%",
              render: (r: CommissionRuleRow) =>
                r.percentage != null ? `${r.percentage}%` : "—",
            },
            {
              key: "fix",
              header: "Valor fixo",
              render: (r: CommissionRuleRow) =>
                r.fixedAmount != null ? `R$ ${r.fixedAmount}` : "—",
            },
            {
              key: "trigger",
              header: "Quando gera",
              render: (r: CommissionRuleRow) => TRIGGER_LABELS[r.trigger] ?? r.trigger,
            },
            {
              key: "status",
              header: "Status",
              render: (r: CommissionRuleRow) => (r.isActive ? "Ativa" : "Inativa"),
            },
            {
              key: "actions",
              header: "Ações",
              render: (r: CommissionRuleRow) => (
                <button
                  type="button"
                  className="text-xs text-[#0057D9] hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicate.mutate(r.id);
                  }}
                >
                  Duplicar
                </button>
              ),
            },
          ]}
          rows={data ?? []}
        />
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Nova regra de comissão"
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
          >
            <option value="">Selecione</option>
            {(employees ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Tipo">
          <select
            className={selectClass}
            value={form.ruleType}
            onChange={(e) => setForm((f) => ({ ...f, ruleType: e.target.value }))}
          >
            <option value="PERCENTUAL">Percentual</option>
            <option value="VALOR_FIXO">Valor fixo</option>
          </select>
        </FormField>
        <FormField label="Base de cálculo">
          <select
            className={selectClass}
            value={form.baseCalculation}
            onChange={(e) => setForm((f) => ({ ...f, baseCalculation: e.target.value }))}
          >
            {Object.entries(BASE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </FormField>
        {form.ruleType === "PERCENTUAL" ? (
          <FormField label="Percentual (%)">
            <input
              type="number"
              className={inputClass}
              value={form.percentage}
              onChange={(e) => setForm((f) => ({ ...f, percentage: e.target.value }))}
            />
          </FormField>
        ) : (
          <FormField label="Valor fixo (R$)">
            <input
              type="number"
              className={inputClass}
              value={form.fixedAmount}
              onChange={(e) => setForm((f) => ({ ...f, fixedAmount: e.target.value }))}
            />
          </FormField>
        )}
        {form.baseCalculation === "SERVICO_ESPECIFICO" && (
          <FormField label="Serviço específico">
            <ServiceCatalogSearchSelect
              value={form.catalogItemId}
              onChange={(catalogItemId) => setForm((f) => ({ ...f, catalogItemId }))}
              manualLabel="Qualquer serviço (sem filtro específico)"
            />
          </FormField>
        )}
        <FormField label="Quando gerar">
          <select
            className={selectClass}
            value={form.trigger}
            onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value }))}
          >
            {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </FormField>
      </FormDrawer>
    </>
  );
}
