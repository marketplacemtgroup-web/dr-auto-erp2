import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Printer } from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import ModulePageShell from "../../components/modules/ModulePageShell";
import ModuleFilters, { FilterSelect } from "../../components/modules/ModuleFilters";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import VehicleSearchSelect from "../../components/vehicles/VehicleSearchSelect";
import KpiStrip from "../../components/modules/KpiStrip";
import DataTable from "../../components/modules/DataTable";
import { api } from "../../lib/api";
import { formatDateTime, formatMoney } from "../../lib/format";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";
import { osStatusLabel, osStatusToVariant } from "../../lib/service-order-status";
import { routes } from "../../lib/routes";

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

const OPEN_STATUSES = [
  "RECEIVED",
  "DIAGNOSIS",
  "AWAITING_QUOTE",
  "AWAITING_APPROVAL",
  "APPROVED",
  "IN_PROGRESS",
  "AWAITING_PART",
  "PAUSED",
  "AWAITING_PAYMENT",
] as const;

const HISTORY_STATUSES = ["FINISHED", "DELIVERED"] as const;

type ViewTab = "ativas" | "historico";

export default function ServiceOrdersPage() {
  const navigate = useNavigate();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewTab, setViewTab] = useState<ViewTab>("ativas");
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

  const open = data?.filter((o) => OPEN_STATUSES.includes(o.status as (typeof OPEN_STATUSES)[number]))
    .length;

  const historyRows =
    data?.filter((o) =>
      HISTORY_STATUSES.includes(o.status as (typeof HISTORY_STATUSES)[number]),
    ) ?? [];

  const activeRows =
    data?.filter((o) => {
      if (!OPEN_STATUSES.includes(o.status as (typeof OPEN_STATUSES)[number])) return false;
      if (statusFilter && o.status !== statusFilter) return false;
      return true;
    }) ?? [];

  function openOs(id: string) {
    navigate(routes.ordemDeServicoDetalhe(id));
  }

  function openOsPrint(id: string) {
    navigate(`${routes.ordemDeServicoDetalhe(id)}?print=1`);
  }

  return (
    <>
      <ModulePageShell
        title="Ordem de Servico"
        description={
          viewTab === "historico"
            ? "Servicos finalizados e entregues — abra ou imprima quando precisar"
            : "Checklist, diagnostico, pecas e execucao"
        }
        actionLabel="Nova OS"
        onAction={() => setDrawerOpen(true)}
        onSearch={setSearch}
      >
        <div className="flex gap-2 mb-4 border-b border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => {
              setViewTab("ativas");
              setStatusFilter("");
            }}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px ${
              viewTab === "ativas"
                ? "border-[#0E7490] text-[#0E7490]"
                : "border-transparent text-[#64748B] hover:text-[#1E293B]"
            }`}
          >
            Em andamento
          </button>
          <button
            type="button"
            onClick={() => {
              setViewTab("historico");
              setStatusFilter("");
            }}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px ${
              viewTab === "historico"
                ? "border-[#0E7490] text-[#0E7490]"
                : "border-transparent text-[#64748B] hover:text-[#1E293B]"
            }`}
          >
            Historico ({historyRows.length})
          </button>
        </div>

        {viewTab === "ativas" ? (
          <ModuleFilters>
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "", label: "Todos em andamento" },
                ...OPEN_STATUSES.map((s) => ({
                  value: s,
                  label: osStatusLabel(s),
                })),
              ]}
            />
          </ModuleFilters>
        ) : (
          <ModuleFilters>
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "", label: "Finalizadas e entregues" },
                ...HISTORY_STATUSES.map((s) => ({
                  value: s,
                  label: osStatusLabel(s),
                })),
              ]}
            />
          </ModuleFilters>
        )}
        <KpiStrip
          items={[
            { label: "Em andamento", value: String(open ?? 0), tone: "warning" },
            {
              label: "Historico",
              value: String(historyRows.length),
              tone: "success",
            },
            { label: "Total listado", value: String(data?.length ?? 0) },
          ]}
        />
        {viewTab === "ativas" ? (
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
          rows={activeRows}
          loading={isLoading}
          error={error}
          emptyMessage="Nenhuma OS em andamento."
          onRowClick={(os) => openOs(os.id)}
        />
        ) : (
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            {isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-[#64748B]">Carregando...</p>
            ) : error ? (
              <p className="px-4 py-8 text-center text-sm text-red-600">{error.message}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F8FAFC] text-left text-[#64748B] text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">OS</th>
                    <th className="px-4 py-3 font-medium">Cliente / Veiculo</th>
                    <th className="px-4 py-3 font-medium">Placa</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Concluida em</th>
                    <th className="px-4 py-3 font-medium text-right">Valor</th>
                    <th className="px-4 py-3 font-medium text-right w-40">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {(statusFilter
                    ? historyRows.filter((o) => o.status === statusFilter)
                    : historyRows
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-[#94A3B8]">
                        Nenhuma OS finalizada ou entregue ainda.
                      </td>
                    </tr>
                  ) : (
                    (statusFilter
                      ? historyRows.filter((o) => o.status === statusFilter)
                      : historyRows
                    ).map((os) => (
                      <tr
                        key={os.id}
                        className="border-t border-[#F1F5F9] hover:bg-[#F8FAFC] cursor-pointer"
                        onClick={() => openOs(os.id)}
                      >
                        <td className="px-4 py-3 font-bold text-[#0E7490]">#{os.number}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{os.vehicle.customer.name}</p>
                          <p className="text-xs text-[#94A3B8]">
                            {[os.vehicle.brand, os.vehicle.model].filter(Boolean).join(" ")}
                          </p>
                        </td>
                        <td className="px-4 py-3">{os.vehicle.plate}</td>
                        <td className="px-4 py-3">
                          <StatusBadge variant={osStatusToVariant(os.status)} />
                          <span className="sr-only">{osStatusLabel(os.status)}</span>
                        </td>
                        <td className="px-4 py-3 text-[#64748B]">{formatDateTime(os.updatedAt)}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatMoney(os.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              title="Abrir OS"
                              onClick={() => openOs(os.id)}
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-[#E2E8F0] text-[11px] text-[#64748B] hover:bg-white"
                            >
                              <ExternalLink size={14} />
                              Abrir
                            </button>
                            <button
                              type="button"
                              title="Imprimir OS"
                              onClick={() => openOsPrint(os.id)}
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-[#0E7490] text-[11px] text-[#0E7490] hover:bg-[#ECFEFF]"
                            >
                              <Printer size={14} />
                              Imprimir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
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
        <FormField label="Cliente / placa *">
          <VehicleSearchSelect
            vehicles={vehicles}
            value={form.vehicleId}
            onChange={(vehicleId) => setForm((f) => ({ ...f, vehicleId }))}
            required
            placeholder="Digite o nome do cliente ou a placa..."
          />
        </FormField>
        <FormField label="Relato do cliente">
          <textarea
            className={`${inputClass} min-h-[56px] py-1.5`}
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
