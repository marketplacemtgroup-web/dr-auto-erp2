import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
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
    percentage: "20",
    fixedAmount: "",
    trigger: "OS_FINALIZADA",
    catalogItemId: "",
    isActive: true,
  });

  const { data: employees } = useApiQuery(["employees-all"], (t) => api.employees(t));
  const { data: catalog } = useApiQuery(["service-catalog-all"], (t) => api.serviceCatalog(t));
  const { data, isLoading, error } = useApiQuery(["commission-rules"], (t) =>
    api.commissionRules(t),
  );

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
            <select
              className={selectClass}
              value={form.catalogItemId}
              onChange={(e) => setForm((f) => ({ ...f, catalogItemId: e.target.value }))}
            >
              <option value="">Qualquer</option>
              {(catalog ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
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
