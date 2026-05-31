import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import StatusBadge from "../../components/StatusBadge";
import ModulePageShell from "../../components/modules/ModulePageShell";
import ModuleFilters, { FilterSelect } from "../../components/modules/ModuleFilters";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import KpiStrip from "../../components/modules/KpiStrip";
import DataTable from "../../components/modules/DataTable";
import { api } from "../../lib/api";
import { formatDateTime, formatMoney } from "../../lib/format";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";
import { osStatusLabel, osStatusToVariant } from "../../lib/service-order-status";
import { routes } from "../../lib/routes";

const STATUS_OPTIONS = [
  "",
  "RECEIVED",
  "DIAGNOSIS",
  "AWAITING_QUOTE",
  "AWAITING_APPROVAL",
  "APPROVED",
  "IN_PROGRESS",
  "AWAITING_PART",
  "FINISHED",
  "DELIVERED",
  "CANCELLED",
] as const;

const CREATE_STATUS = [
  "RECEIVED",
  "DIAGNOSIS",
  "AWAITING_QUOTE",
  "AWAITING_APPROVAL",
  "APPROVED",
  "IN_PROGRESS",
  "AWAITING_PART",
  "FINISHED",
  "DELIVERED",
] as const;

export default function ServiceOrdersPage() {
  const navigate = useNavigate();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    vehicleId: "",
    status: "RECEIVED",
    estimatedAt: "",
    complaint: "",
  });

  const { data: vehicles } = useApiQuery(["vehicles-all"], (t) => api.vehicles(t));
  const { data, isLoading, error } = useApiQuery(
    ["service-orders", search, statusFilter],
    (t) => api.serviceOrders(t, search || undefined, false, statusFilter || undefined),
  );

  const create = useMutation({
    mutationFn: () =>
      api.createServiceOrder(token!, {
        vehicleId: form.vehicleId,
        status: form.status,
        estimatedAt: form.estimatedAt || undefined,
        complaint: form.complaint || undefined,
      }),
    onSuccess: (os) => {
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      setDrawerOpen(false);
      setForm({ vehicleId: "", status: "RECEIVED", estimatedAt: "", complaint: "" });
      navigate(routes.ordemDeServicoDetalhe(os.id));
    },
  });

  const open = data?.filter((o) =>
    [
      "RECEIVED",
      "DIAGNOSIS",
      "AWAITING_QUOTE",
      "AWAITING_APPROVAL",
      "IN_PROGRESS",
      "AWAITING_PART",
    ].includes(o.status),
  ).length;

  return (
    <>
      <ModulePageShell
        title="Ordem de Servico"
        description="Checklist, diagnostico, pecas e execucao"
        actionLabel="Nova OS"
        onAction={() => setDrawerOpen(true)}
        onSearch={setSearch}
      >
        <ModuleFilters>
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "", label: "Todos" },
              ...STATUS_OPTIONS.filter(Boolean).map((s) => ({
                value: s,
                label: osStatusLabel(s),
              })),
            ]}
          />
        </ModuleFilters>
        <KpiStrip
          items={[
            { label: "Total", value: String(data?.length ?? 0) },
            { label: "Em aberto", value: String(open ?? 0), tone: "warning" },
            {
              label: "Finalizadas",
              value: String(
                data?.filter((o) => o.status === "FINISHED" || o.status === "DELIVERED")
                  .length ?? 0,
              ),
              tone: "success",
            },
          ]}
        />
        <DataTable
          columns={[
            {
              key: "num",
              header: "OS",
              render: (os) => (
                <span className="font-bold text-[#0E7490]">#{os.number}</span>
              ),
            },
            {
              key: "client",
              header: "Cliente / Veiculo",
              render: (os) => (
                <div>
                  <p className="font-medium">{os.vehicle.customer.name}</p>
                  <p className="text-xs text-[#94A3B8]">
                    {[os.vehicle.brand, os.vehicle.model].filter(Boolean).join(" ")}
                  </p>
                </div>
              ),
            },
            { key: "plate", header: "Placa", render: (os) => os.vehicle.plate },
            {
              key: "status",
              header: "Status",
              render: (os) => (
                <>
                  <StatusBadge variant={osStatusToVariant(os.status)} />
                  <span className="sr-only">{osStatusLabel(os.status)}</span>
                </>
              ),
            },
            {
              key: "eta",
              header: "Previsao",
              render: (os) => formatDateTime(os.estimatedAt),
            },
            {
              key: "total",
              header: "Valor",
              className: "text-right",
              render: (os) => (
                <span className="font-semibold">{formatMoney(os.totalAmount)}</span>
              ),
            },
          ]}
          rows={data ?? []}
          loading={isLoading}
          error={error}
          emptyMessage="Nenhuma OS. Abra a primeira ordem de servico."
          onRowClick={(os) => navigate(routes.ordemDeServicoDetalhe(os.id))}
        />
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        title="Nova ordem de servico"
        subtitle="Entrada do veiculo na oficina"
        onClose={() => setDrawerOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        loading={create.isPending}
        submitLabel="Abrir OS"
      >
        <FormField label="Veiculo *">
          <select
            className={selectClass}
            value={form.vehicleId}
            onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
            required
          >
            <option value="">Selecione placa...</option>
            {vehicles?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} — {v.customer.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Relato do cliente">
          <textarea
            className={`${inputClass} min-h-[72px] py-2`}
            value={form.complaint}
            onChange={(e) => setForm((f) => ({ ...f, complaint: e.target.value }))}
          />
        </FormField>
        <FormField label="Status inicial">
          <select
            className={selectClass}
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            {CREATE_STATUS.map((s) => (
              <option key={s} value={s}>
                {osStatusLabel(s)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Previsao de entrega">
          <input
            type="datetime-local"
            className={inputClass}
            value={form.estimatedAt}
            onChange={(e) => setForm((f) => ({ ...f, estimatedAt: e.target.value }))}
          />
        </FormField>
      </FormDrawer>
    </>
  );
}
