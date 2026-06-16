import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass } from "../../components/modules/FormDrawer";
import DataTable from "../../components/modules/DataTable";
import ConfirmDialog from "../../components/modules/ConfirmDialog";
import { api, type ServiceCatalogRow } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";

const emptyForm = {
  name: "",
  category: "",
  estimatedMinutes: "",
  defaultPrice: "",
  warrantyDays: "",
};

export default function ServicesPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceCatalogRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceCatalogRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading, error } = useApiQuery(["service-catalog", search], (t) =>
    api.serviceCatalog(t, search || undefined),
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDrawerOpen(true);
  };

  const openEdit = (row: ServiceCatalogRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      category: row.category ?? "",
      estimatedMinutes: row.estimatedMinutes ? String(row.estimatedMinutes) : "",
      defaultPrice: String(row.defaultPrice),
      warrantyDays: row.warrantyDays ? String(row.warrantyDays) : "",
    });
    setDrawerOpen(true);
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        category: form.category || undefined,
        estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : undefined,
        defaultPrice: form.defaultPrice ? Number(form.defaultPrice) : 0,
        warrantyDays: form.warrantyDays ? Number(form.warrantyDays) : undefined,
      };
      return editing
        ? api.updateServiceCatalog(token!, editing.id, payload)
        : api.createServiceCatalog(token!, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-catalog"] });
      setDrawerOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: () => api.deleteServiceCatalog(token!, deleteTarget!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-catalog"] });
      setDeleteTarget(null);
    },
  });

  return (
    <>
      <ModulePageShell
        title="Catalogo de servicos"
        description="Servicos padrao da oficina — use na OS para preencher preco e descricao automaticamente"
        actionLabel="Novo servico"
        onAction={openCreate}
        onSearch={setSearch}
      >
        <DataTable
          columns={[
            { key: "name", header: "Servico", render: (r) => r.name },
            { key: "cat", header: "Categoria", render: (r) => r.category ?? "—" },
            {
              key: "time",
              header: "Tempo",
              render: (r) => (r.estimatedMinutes ? `${r.estimatedMinutes} min` : "—"),
            },
            {
              key: "price",
              header: "Preco",
              className: "text-right",
              render: (r) => formatMoney(r.defaultPrice),
            },
            {
              key: "warranty",
              header: "Garantia",
              render: (r) => (r.warrantyDays ? `${r.warrantyDays} dias` : "—"),
            },
          ]}
          rows={data ?? []}
          loading={isLoading}
          error={error}
          emptyMessage="Nenhum servico no catalogo."
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        title={editing ? "Editar servico" : "Novo servico"}
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
            required
          />
        </FormField>
        <FormField label="Categoria">
          <input
            className={inputClass}
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="Revisao, freios, motor..."
          />
        </FormField>
        <FormField label="Tempo estimado (min)">
          <input
            type="number"
            className={inputClass}
            value={form.estimatedMinutes}
            onChange={(e) => setForm((f) => ({ ...f, estimatedMinutes: e.target.value }))}
          />
        </FormField>
        <FormField label="Preco padrao (R$) *">
          <input
            type="number"
            step="0.01"
            className={inputClass}
            value={form.defaultPrice}
            onChange={(e) => setForm((f) => ({ ...f, defaultPrice: e.target.value }))}
            required
          />
        </FormField>
        <FormField label="Garantia (dias)">
          <input
            type="number"
            className={inputClass}
            value={form.warrantyDays}
            onChange={(e) => setForm((f) => ({ ...f, warrantyDays: e.target.value }))}
          />
        </FormField>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Desativar servico"
        message={`Desativar "${deleteTarget?.name}" do catalogo?`}
        loading={remove.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}
