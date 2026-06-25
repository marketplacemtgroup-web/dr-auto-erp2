import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import DataTable from "../../components/modules/DataTable";
import { api, type PayrollRow } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";

function monthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

const STATUS_LABELS: Record<string, string> = {
  ABERTA: "Aberto",
  FECHADA: "Fechado",
  PAGA: "Pago",
  CANCELADA: "Cancelado",
};

export default function PayrollPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const bounds = monthBounds();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState({
    employeeId: "",
    periodStart: bounds.start,
    periodEnd: bounds.end,
  });

  const { data: employeesRes } = useApiQuery(["employees-picker"], (t) =>
    api.employees(t, { limit: 50 }),
  );
  const employees = employeesRes?.data;
  const { data, isLoading, error } = useApiQuery(["payrolls"], (t) => api.payrolls(t));

  const { data: preview } = useApiQuery(
    ["payroll-preview", form.employeeId, form.periodStart, form.periodEnd],
    (t) =>
      api.payrollPreview(t, form.employeeId, form.periodStart, form.periodEnd),
    !!form.employeeId && drawerOpen,
  );

  const { data: detail } = useApiQuery(
    ["payroll-detail", detailId ?? ""],
    (t) => api.payroll(t, detailId!),
    !!detailId,
  );

  const create = useMutation({
    mutationFn: () => api.createPayroll(token!, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
      setDrawerOpen(false);
    },
  });

  const close = useMutation({
    mutationFn: (id: string) => api.closePayroll(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payrolls"] }),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => api.markPayrollPaid(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payrolls"] }),
  });

  return (
    <>
      <ModulePageShell
        title="Fechamento de Pagamento"
        description="Calcule salários, comissões, vales, bônus e descontos da equipe."
        actionLabel="Novo fechamento"
        onAction={() => setDrawerOpen(true)}
      >
        <DataTable
          loading={isLoading}
          error={error ?? null}
          columns={[
            {
              key: "emp",
              header: "Funcionário",
              render: (r: PayrollRow) => r.employee?.name ?? "—",
            },
            {
              key: "period",
              header: "Período",
              render: (r: PayrollRow) =>
                `${new Date(r.periodStart).toLocaleDateString("pt-BR")} — ${new Date(r.periodEnd).toLocaleDateString("pt-BR")}`,
            },
            {
              key: "salary",
              header: "Salário",
              render: (r: PayrollRow) => formatMoney(r.fixedSalary),
            },
            {
              key: "comm",
              header: "Comissões",
              render: (r: PayrollRow) => formatMoney(r.totalCommissions),
            },
            {
              key: "net",
              header: "Total líquido",
              render: (r: PayrollRow) => formatMoney(r.netTotal),
            },
            {
              key: "status",
              header: "Status",
              render: (r: PayrollRow) => STATUS_LABELS[r.status] ?? r.status,
            },
            {
              key: "actions",
              header: "Ações",
              render: (r: PayrollRow) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs text-[#0057D9]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailId(r.id);
                    }}
                  >
                    Ver
                  </button>
                  {r.status === "ABERTA" && (
                    <button
                      type="button"
                      className="text-xs text-[#0057D9]"
                      onClick={(e) => {
                        e.stopPropagation();
                        close.mutate(r.id);
                      }}
                    >
                      Fechar
                    </button>
                  )}
                  {r.status === "FECHADA" && (
                    <button
                      type="button"
                      className="text-xs text-green-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        markPaid.mutate(r.id);
                      }}
                    >
                      Pagar
                    </button>
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
        title="Novo fechamento"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        loading={create.isPending}
        submitLabel="Gerar prévia"
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
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Início">
            <input
              type="date"
              className={inputClass}
              value={form.periodStart}
              onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
            />
          </FormField>
          <FormField label="Fim">
            <input
              type="date"
              className={inputClass}
              value={form.periodEnd}
              onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
            />
          </FormField>
        </div>
        {preview && form.employeeId && (
          <div className="mt-4 p-4 rounded-lg bg-[#F7F8FA] text-sm space-y-1">
            <p>Salário fixo: {formatMoney(Number((preview as { fixedSalary: number }).fixedSalary))}</p>
            <p>Comissões: {formatMoney(Number((preview as { totalCommissions: number }).totalCommissions))}</p>
            <p>Bônus: {formatMoney(Number((preview as { totalBonus: number }).totalBonus))}</p>
            <p>Vales/adiant.: -{formatMoney(Number((preview as { totalAdvances: number }).totalAdvances))}</p>
            <p>Descontos: -{formatMoney(Number((preview as { totalDiscounts: number }).totalDiscounts))}</p>
            <p className="font-semibold pt-2">
              Total: {formatMoney(Number((preview as { netTotal: number }).netTotal))}
            </p>
          </div>
        )}
      </FormDrawer>

      {detailId && detail && (
        <FormDrawer
          open={!!detailId}
          onClose={() => setDetailId(null)}
          title={`Fechamento — ${(detail as { employee: { name: string } }).employee.name}`}
          onSubmit={(e) => {
            e.preventDefault();
            setDetailId(null);
          }}
          submitLabel="Fechar"
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <p>Salário: {formatMoney(Number((detail as unknown as PayrollRow).fixedSalary))}</p>
              <p>Comissões: {formatMoney(Number((detail as unknown as PayrollRow).totalCommissions))}</p>
              <p>Bônus: {formatMoney(Number((detail as unknown as PayrollRow).totalBonus))}</p>
              <p>Vales: -{formatMoney(Number((detail as unknown as PayrollRow).totalAdvances))}</p>
            </div>
            <p className="text-lg font-semibold text-[#0057D9]">
              Total: {formatMoney(Number((detail as unknown as PayrollRow).netTotal))}
            </p>
            {(detail as { commissions?: Array<{ description: string; commissionAmount: number }> }).commissions?.length ? (
              <div>
                <h4 className="font-medium mb-2">Comissões geradas</h4>
                <ul className="space-y-1 text-[#6B7280]">
                  {(detail as { commissions: Array<{ description: string; commissionAmount: number }> }).commissions.map((c, i) => (
                    <li key={i}>
                      {c.description} — {formatMoney(c.commissionAmount)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </FormDrawer>
      )}
    </>
  );
}
