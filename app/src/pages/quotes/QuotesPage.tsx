import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import StatusBadge from "../../components/StatusBadge";
import ModulePageShell from "../../components/modules/ModulePageShell";
import ModuleFilters, { FilterSelect } from "../../components/modules/ModuleFilters";
import FormDrawer, { FormField, inputClass } from "../../components/modules/FormDrawer";
import KpiStrip from "../../components/modules/KpiStrip";
import DataTable from "../../components/modules/DataTable";
import ConfirmDialog from "../../components/modules/ConfirmDialog";
import ListPagination from "../../components/modules/ListPagination";
import VehicleSearchSelect from "../../components/vehicles/VehicleSearchSelect";
import { api, LIST_PAGE_SIZE, type QuoteRow } from "../../lib/api";
import { formatDate, formatMoney } from "../../lib/format";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";
import { quoteStatusLabel, quoteStatusVariant } from "../../lib/service-order-status";
import { routes } from "../../lib/routes";

export default function QuotesPage() {
  const navigate = useNavigate();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QuoteRow | null>(null);
  const [form, setForm] = useState({ vehicleId: "", complaint: "" });

  const { data, isLoading, error } = useApiQuery(
    ["quotes", search, statusFilter, String(page)],
    (t) => api.quotes(t, search || undefined, statusFilter || undefined, false, page, LIST_PAGE_SIZE),
  );

  const rows = data?.data ?? [];
  const totalPages = data?.pagination.totalPages ?? 0;
  const totalListed = data?.pagination.total ?? 0;

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const openCreate = () => {
    setForm({ vehicleId: "", complaint: "" });
    setDrawerOpen(true);
  };

  const create = useMutation({
    mutationFn: () =>
      api.createQuote(token!, {
        vehicleId: form.vehicleId,
        complaint: form.complaint || undefined,
        status: "PENDING",
      }),
    onSuccess: (quote) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      setDrawerOpen(false);
      navigate(routes.orcamentoDetalhe(quote.id));
    },
  });

  const remove = useMutation({
    mutationFn: () => api.deleteQuote(token!, deleteTarget!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      setDeleteTarget(null);
    },
  });

  const pending = rows.filter((q) => q.status === "PENDING").length;
  const pendingTotal =
    rows.filter((q) => q.status === "PENDING").reduce((s, q) => s + Number(q.amount), 0);

  return (
    <>
      <ModulePageShell
        title="Orçamentos"
        description="Monte o orçamento por cliente/veículo — ao aprovar, vira ordem de serviço"
        actionLabel="Novo orçamento"
        onAction={openCreate}
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
        }}
      >
        <ModuleFilters>
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "", label: "Ativos (sem aprovados)" },
              { value: "PENDING", label: "Aguardando aprovação" },
              { value: "REJECTED", label: "Recusado" },
              { value: "DRAFT", label: "Rascunho" },
            ]}
          />
        </ModuleFilters>
        <KpiStrip
          items={[
            { label: "Aguardando aprovação", value: String(pending), tone: "warning" },
            { label: "Valor pendente", value: formatMoney(pendingTotal), tone: "warning" },
            { label: "Ativos", value: String(totalListed) },
          ]}
        />
        <DataTable
          columns={[
            {
              key: "client",
              header: "Cliente",
              render: (q) => (
                <span className="font-medium text-[#1E293B]">
                  {q.serviceOrder.vehicle.customer.name}
                </span>
              ),
            },
            {
              key: "plate",
              header: "Placa",
              render: (q) => (
                <span className="font-bold text-[#0E7490]">{q.serviceOrder.vehicle.plate}</span>
              ),
            },
            {
              key: "number",
              header: "Orçamento",
              render: (q) => `#${q.number ?? "—"}`,
            },
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
          rows={rows}
          loading={isLoading}
          error={error}
          emptyMessage="Nenhum orçamento ativo. Crie um novo selecionando cliente e placa."
          onRowClick={(q) => navigate(routes.orcamentoDetalhe(q.id))}
          onDelete={setDeleteTarget}
        />
        <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        <p className="text-xs text-[#94A3B8] mt-3">
          Orçamentos aprovados saem desta lista e aparecem em Ordens de Serviço. O cliente aprova
          pelo app ou portal.
        </p>
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        title="Novo orçamento"
        subtitle="Selecione o cliente pela placa do veículo"
        onClose={() => setDrawerOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        loading={create.isPending}
        submitLabel="Criar e montar orçamento"
      >
        <FormField label="Cliente / placa *">
          <VehicleSearchSelect
            value={form.vehicleId}
            onChange={(vehicleId) => setForm((f) => ({ ...f, vehicleId }))}
            required
            placeholder="Digite o nome do cliente ou a placa..."
          />
        </FormField>
        <FormField label="Relato do cliente (opcional)">
          <textarea
            className={`${inputClass} min-h-[56px] py-1.5`}
            value={form.complaint}
            onChange={(e) => setForm((f) => ({ ...f, complaint: e.target.value }))}
            rows={3}
          />
        </FormField>
        <p className="text-xs text-[#94A3B8]">
          O status já inicia como <strong>aguardando aprovação</strong>. Na próxima tela você
          adiciona serviços e peças.
        </p>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir orçamento"
        message="Confirma exclusão deste orçamento?"
        loading={remove.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}
