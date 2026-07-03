import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass } from "../../components/modules/FormDrawer";
import DataTable from "../../components/modules/DataTable";
import ConfirmDialog from "../../components/modules/ConfirmDialog";
import { api, type OutsourcedServiceRow } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";

const emptyForm = {
  name: "",
  provider: "",
  category: "",
  costPrice: "",
  salePrice: "",
};

function margin(row: OutsourcedServiceRow) {
  return Number(row.salePrice) - Number(row.costPrice);
}

export default function OutsourcedServicesPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<OutsourcedServiceRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OutsourcedServiceRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading, error } = useApiQuery(["outsourced-services", search], (t) =>
    api.outsourcedServices(t, search || undefined),
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDrawerOpen(true);
  };

  const openEdit = (row: OutsourcedServiceRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      provider: row.provider ?? "",
      category: row.category ?? "",
      costPrice: String(row.costPrice),
      salePrice: String(row.salePrice),
    });
    setDrawerOpen(true);
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        provider: form.provider || undefined,
        category: form.category || undefined,
        costPrice: form.costPrice ? Number(form.costPrice) : 0,
        salePrice: form.salePrice ? Number(form.salePrice) : 0,
      };
      return editing
        ? api.updateOutsourcedService(token!, editing.id, payload)
        : api.createOutsourcedService(token!, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outsourced-services"] });
      setDrawerOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: () => api.deleteOutsourcedService(token!, deleteTarget!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outsourced-services"] });
      setDeleteTarget(null);
    },
  });

  return (
    <>
      <ModulePageShell
        title="Servicos terceirizados"
        description="Servicos feitos por terceiros (alinhamento, balanceamento, retifica...) — use na OS como um item terceirizado"
        actionLabel="Novo terceirizado"
        onAction={openCreate}
        onSearch={setSearch}
      >
        <DataTable
          columns={[
            { key: "name", header: "Servico", render: (r) => r.name },
            { key: "provider", header: "Executado por", render: (r) => r.provider ?? "—" },
            { key: "cat", header: "Categoria", render: (r) => r.category ?? "—" },
            {
              key: "cost",
              header: "Custo",
              className: "text-right",
              render: (r) => formatMoney(r.costPrice),
            },
            {
              key: "sale",
              header: "Venda",
              className: "text-right",
              render: (r) => formatMoney(r.salePrice),
            },
            {
              key: "margin",
              header: "Margem",
              className: "text-right",
              render: (r) => formatMoney(margin(r)),
            },
          ]}
          rows={data ?? []}
          loading={isLoading}
          error={error}
          emptyMessage="Nenhum servico terceirizado cadastrado."
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        title={editing ? "Editar terceirizado" : "Novo terceirizado"}
        onClose={() => setDrawerOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        loading={save.isPending}
      >
        <FormField label="Nome do servico *">
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Alinhamento, balanceamento, retifica..."
            required
          />
        </FormField>
        <FormField label="Executado por">
          <input
            className={inputClass}
            value={form.provider}
            onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
            placeholder="Nome do terceiro / oficina parceira"
          />
        </FormField>
        <FormField label="Categoria">
          <input
            className={inputClass}
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="Suspensao, motor, eletrica..."
          />
        </FormField>
        <FormField label="Valor de custo (R$)">
          <input
            type="number"
            step="0.01"
            min={0}
            className={inputClass}
            value={form.costPrice}
            onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
            placeholder="0,00"
          />
        </FormField>
        <FormField label="Valor de venda (R$) *">
          <input
            type="number"
            step="0.01"
            min={0}
            className={inputClass}
            value={form.salePrice}
            onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))}
            placeholder="0,00"
            required
          />
        </FormField>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Desativar terceirizado"
        message={`Desativar "${deleteTarget?.name}" do catalogo de terceirizados?`}
        loading={remove.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}
