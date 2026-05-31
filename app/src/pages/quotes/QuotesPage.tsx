import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import StatusBadge from "../../components/StatusBadge";
import ModulePageShell from "../../components/modules/ModulePageShell";
import ModuleFilters, { FilterSelect } from "../../components/modules/ModuleFilters";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import KpiStrip from "../../components/modules/KpiStrip";
import DataTable from "../../components/modules/DataTable";
import ConfirmDialog from "../../components/modules/ConfirmDialog";
import { api, type QuoteRow } from "../../lib/api";
import { formatDate, formatMoney } from "../../lib/format";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";
import { quoteStatusLabel, quoteStatusVariant } from "../../lib/service-order-status";

export default function QuotesPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<QuoteRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuoteRow | null>(null);
  const [form, setForm] = useState({ serviceOrderId: "", amount: "", status: "PENDING" });

  const { data: orders } = useApiQuery(["service-orders-all"], (t) => api.serviceOrders(t));
  const { data, isLoading, error } = useApiQuery(
    ["quotes", search, statusFilter],
    (t) => api.quotes(t, search || undefined, statusFilter || undefined),
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ serviceOrderId: "", amount: "", status: "PENDING" });
    setDrawerOpen(true);
  };

  const openEdit = (q: QuoteRow) => {
    setEditing(q);
    setForm({
      serviceOrderId: "",
      amount: String(q.amount),
      status: q.status,
    });
    setDrawerOpen(true);
  };

  const save = useMutation({
    mutationFn: () =>
      editing
        ? api.updateQuote(token!, editing.id, {
            amount: Number(form.amount),
            status: form.status,
          })
        : api.createQuote(token!, {
            serviceOrderId: form.serviceOrderId,
            amount: Number(form.amount),
            status: form.status,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      setDrawerOpen(false);
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: () => api.deleteQuote(token!, deleteTarget!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      setDeleteTarget(null);
    },
  });

  const pending = data?.filter((q) => q.status === "PENDING").length ?? 0;
  const pendingTotal =
    data?.filter((q) => q.status === "PENDING").reduce((s, q) => s + Number(q.amount), 0) ?? 0;

  return (
    <>
      <ModulePageShell
        title="Orcamentos"
        description="Envio e aprovacao pelo portal do cliente"
        actionLabel="Novo orcamento"
        onAction={openCreate}
        onSearch={setSearch}
      >
        <ModuleFilters>
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "", label: "Todos" },
              { value: "PENDING", label: "Pendente" },
              { value: "APPROVED", label: "Aprovado" },
              { value: "REJECTED", label: "Rejeitado" },
              { value: "DRAFT", label: "Rascunho" },
            ]}
          />
        </ModuleFilters>
        <KpiStrip
          items={[
            { label: "Pendentes", value: String(pending), tone: "warning" },
            { label: "Valor pendente", value: formatMoney(pendingTotal), tone: "warning" },
            { label: "Total", value: String(data?.length ?? 0) },
          ]}
        />
        <DataTable
          columns={[
            {
              key: "os",
              header: "OS",
              render: (q) => (
                <span className="font-bold text-[#0E7490]">#{q.serviceOrder.number}</span>
              ),
            },
            { key: "client", header: "Cliente", render: (q) => q.serviceOrder.vehicle.customer.name },
            { key: "plate", header: "Placa", render: (q) => q.serviceOrder.vehicle.plate },
            {
              key: "status",
              header: "Status",
              render: (q) => (
                <>
                  <StatusBadge variant={quoteStatusVariant(q.status)} />
                  <span className="ml-2 text-xs text-[#94A3B8]">
                    {quoteStatusLabel(q.status)}
                  </span>
                </>
              ),
            },
            {
              key: "amount",
              header: "Valor",
              className: "text-right",
              render: (q) => <span className="font-semibold">{formatMoney(q.amount)}</span>,
            },
            { key: "date", header: "Data", render: (q) => formatDate(q.createdAt) },
          ]}
          rows={data ?? []}
          loading={isLoading}
          error={error}
          emptyMessage="Nenhum orcamento."
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />
        <p className="text-xs text-[#94A3B8] mt-3">
          O cliente aprova em {typeof window !== "undefined" ? window.location.origin : ""}/ com
          CPF e placa cadastrados.
        </p>
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        title={editing ? "Editar orcamento" : "Novo orcamento"}
        subtitle="Cliente aprova no portal com CPF + placa"
        onClose={() => setDrawerOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        loading={save.isPending}
      >
        {!editing && (
          <FormField label="Ordem de servico *">
            <select
              className={selectClass}
              value={form.serviceOrderId}
              onChange={(e) => {
                const os = orders?.find((o) => o.id === e.target.value);
                setForm((f) => ({
                  ...f,
                  serviceOrderId: e.target.value,
                  amount: os ? String(os.totalAmount) : f.amount,
                }));
              }}
              required
            >
              <option value="">Selecione OS...</option>
              {orders?.map((o) => (
                <option key={o.id} value={o.id}>
                  #{o.number} — {o.vehicle.plate} ({formatMoney(o.totalAmount)})
                </option>
              ))}
            </select>
          </FormField>
        )}
        <FormField label="Valor total (R$) *">
          <input
            type="number"
            step="0.01"
            className={inputClass}
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
        </FormField>
        <FormField label="Status">
          <select
            className={selectClass}
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="PENDING">Pendente — cliente vê no portal e pode aprovar</option>
            <option value="DRAFT">Rascunho — só na oficina (não aparece no portal)</option>
            {editing && (
              <>
                <option value="APPROVED">Aprovado</option>
                <option value="REJECTED">Rejeitado</option>
              </>
            )}
          </select>
        </FormField>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir orcamento"
        message="Confirma exclusao deste orcamento?"
        loading={remove.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}
