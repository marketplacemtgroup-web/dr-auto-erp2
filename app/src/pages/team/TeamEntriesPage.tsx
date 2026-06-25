import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import DataTable from "../../components/modules/DataTable";
import { api, type EmployeeEntryRow } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";

const ENTRY_TYPES = [
  { value: "VALE", label: "Vale" },
  { value: "ADIANTAMENTO", label: "Adiantamento" },
  { value: "BONUS", label: "Bônus" },
  { value: "DESCONTO", label: "Desconto" },
  { value: "AJUSTE_POSITIVO", label: "Ajuste positivo" },
  { value: "AJUSTE_NEGATIVO", label: "Ajuste negativo" },
  { value: "DIARIA", label: "Diária" },
  { value: "AJUDA_CUSTO", label: "Ajuda de custo" },
];

export default function TeamEntriesPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    entryType: "VALE",
    description: "",
    amount: "",
    entryDate: new Date().toISOString().slice(0, 10),
  });

  const { data: employeesRes } = useApiQuery(["employees-picker"], (t) =>
    api.employees(t, { limit: 50 }),
  );
  const employees = employeesRes?.data;
  const { data, isLoading, error } = useApiQuery(["team-entries"], (t) => api.teamEntries(t));

  const save = useMutation({
    mutationFn: () =>
      api.createTeamEntry(token!, {
        ...form,
        amount: Number(form.amount),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-entries"] });
      setDrawerOpen(false);
    },
  });

  return (
    <>
      <ModulePageShell
        title="Lançamentos"
        description="Registre vales, adiantamentos, bônus, descontos e ajustes da equipe."
        actionLabel="Novo lançamento"
        onAction={() => setDrawerOpen(true)}
      >
        <DataTable
          loading={isLoading}
          error={error ?? null}
          columns={[
            {
              key: "date",
              header: "Data",
              render: (r: EmployeeEntryRow) =>
                new Date(r.entryDate).toLocaleDateString("pt-BR"),
            },
            {
              key: "emp",
              header: "Funcionário",
              render: (r: EmployeeEntryRow) => r.employee?.name ?? "—",
            },
            { key: "type", header: "Tipo", render: (r: EmployeeEntryRow) => r.entryType },
            { key: "desc", header: "Descrição", render: (r: EmployeeEntryRow) => r.description },
            {
              key: "amount",
              header: "Valor",
              render: (r: EmployeeEntryRow) => formatMoney(r.amount),
            },
            { key: "status", header: "Status", render: (r: EmployeeEntryRow) => r.status },
          ]}
          rows={data ?? []}
        />
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Novo lançamento"
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
            value={form.entryType}
            onChange={(e) => setForm((f) => ({ ...f, entryType: e.target.value }))}
          >
            {ENTRY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Descrição *">
          <input
            className={inputClass}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Valor (R$) *">
            <input
              type="number"
              className={inputClass}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </FormField>
          <FormField label="Data">
            <input
              type="date"
              className={inputClass}
              value={form.entryDate}
              onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))}
            />
          </FormField>
        </div>
      </FormDrawer>
    </>
  );
}
