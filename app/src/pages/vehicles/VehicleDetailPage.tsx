import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Printer, Upload } from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import KpiStrip from "../../components/modules/KpiStrip";
import FormDrawer, { FormField, inputClass } from "../../components/modules/FormDrawer";
import { api } from "../../lib/api";
import { formatDateTime, formatMoney } from "../../lib/format";
import { osStatusLabel, osStatusToVariant, quoteStatusLabel } from "../../lib/service-order-status";
import { routes } from "../../lib/routes";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";
import AttachmentGrid from "../../components/attachments/AttachmentGrid";

const KIND_LABEL: Record<string, string> = {
  CAR: "Carro",
  MOTORCYCLE: "Moto",
  TRUCK: "Caminhão",
  OTHER: "Outro",
};

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"visao" | "historico" | "orcamentos" | "midia" | "timeline">(
    "visao",
  );
  const [uploading, setUploading] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    chassis: "",
    renavam: "",
    fuelType: "",
    currentKm: "",
    notes: "",
  });

  const { data: v, isLoading, error } = useApiQuery(
    ["vehicle", id ?? ""],
    (t) => api.vehicle(t, id!),
    !!id,
  );

  const saveMeta = useMutation({
    mutationFn: () =>
      api.updateVehicle(token!, id!, {
        chassis: form.chassis || undefined,
        renavam: form.renavam || undefined,
        fuelType: form.fuelType || undefined,
        currentKm: form.currentKm ? Number(form.currentKm) : undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle", id] });
      setEditOpen(false);
    },
  });

  async function handleDeleteAttachment(attachmentId: string) {
    if (!token || !id) return;
    if (!confirm("Remover esta foto? Esta ação não pode ser desfeita.")) return;
    setDeletingAttachmentId(attachmentId);
    try {
      await api.deleteAttachment(token, attachmentId);
      queryClient.invalidateQueries({ queryKey: ["vehicle", id] });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao remover foto");
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  async function handleUpload(file: File) {
    if (!token || !id) return;
    setUploading(true);
    try {
      await api.uploadVehicleAttachment(token, id, file);
      queryClient.invalidateQueries({ queryKey: ["vehicle", id] });
    } finally {
      setUploading(false);
    }
  }

  if (isLoading && !v) {
    return <main className="px-6 pb-8 text-sm text-[#64748B]">Carregando veículo...</main>;
  }

  if (error || !v) {
    return (
      <main className="px-6 pb-8">
        <p className="text-red-600 text-sm">Veículo não encontrado.</p>
        <Link to={routes.veiculos} className="text-[#0E7490] text-sm mt-2 inline-block">
          Voltar
        </Link>
      </main>
    );
  }

  return (
    <main className="px-6 pb-8">
      <Link
        to={routes.veiculos}
        className="inline-flex items-center gap-1 text-sm text-[#64748B] hover:text-[#0E7490] mb-4"
      >
        <ArrowLeft size={16} />
        Veículos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1E293B]">{v.plate}</h1>
          <p className="text-sm text-[#64748B] mt-1">
            {[v.brand, v.model, v.year].filter(Boolean).join(" ")}
            {v.color ? ` · ${v.color}` : ""}
          </p>
          <Link
            to={routes.clienteDetalhe(v.customer.id)}
            className="text-sm text-[#0E7490] hover:underline mt-1 inline-block"
          >
            Cliente: {v.customer.name}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm({
              chassis: v.chassis ?? "",
              renavam: v.renavam ?? "",
              fuelType: v.fuelType ?? "",
              currentKm: v.currentKm ? String(v.currentKm) : "",
              notes: v.notes ?? "",
            });
            setEditOpen(true);
          }}
          className="h-9 px-4 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC]"
        >
          Editar dados técnicos
        </button>
      </div>

      <KpiStrip
        items={[
          { label: "Total em serviços", value: formatMoney(v.kpis.totalSpent) },
          { label: "Ordens de serviço", value: String(v.kpis.orderCount) },
          { label: "OS em aberto", value: String(v.kpis.openOrders), tone: v.kpis.openOrders > 0 ? "warning" : "default" },
          {
            label: "Último KM",
            value: v.kpis.lastKm != null ? `${v.kpis.lastKm.toLocaleString("pt-BR")} km` : "—",
          },
          {
            label: "Último serviço",
            value: v.kpis.lastService ? formatDateTime(v.kpis.lastService).split(" ")[0] : "—",
          },
        ]}
      />

      <div className="flex flex-wrap gap-2 mt-6 mb-5 border-b border-[#E2E8F0]">
        {(
          [
            ["visao", "Visão geral"],
            ["historico", `Histórico OS (${v.serviceOrders.length})`],
            ["orcamentos", `Orçamentos (${v.quotes.length})`],
            ["midia", `Mídia (${v.attachments.length})`],
            ["timeline", "Timeline"],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t ? "border-[#0E7490] text-[#0E7490]" : "border-transparent text-[#64748B]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "visao" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <p>
            <span className="text-[#64748B]">Tipo:</span>{" "}
            {KIND_LABEL[v.vehicleKind ?? "CAR"] ?? v.vehicleKind}
          </p>
          <p>
            <span className="text-[#64748B]">Combustível:</span> {v.fuelType ?? "—"}
          </p>
          <p>
            <span className="text-[#64748B]">Chassi:</span> {v.chassis ?? "—"}
          </p>
          <p>
            <span className="text-[#64748B]">RENAVAM:</span> {v.renavam ?? "—"}
          </p>
          <p>
            <span className="text-[#64748B]">KM atual:</span>{" "}
            {v.currentKm != null ? `${v.currentKm.toLocaleString("pt-BR")} km` : "—"}
          </p>
          {v.notes && (
            <p className="sm:col-span-2">
              <span className="text-[#64748B]">Observações:</span> {v.notes}
            </p>
          )}
        </div>
      )}

      {tab === "historico" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] text-xs text-[#64748B] uppercase">
                <th className="px-4 py-2 text-left">OS</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Atualizado</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-right w-36">Ações</th>
              </tr>
            </thead>
            <tbody>
              {v.serviceOrders.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-[#F1F5F9] hover:bg-[#F8FAFC] cursor-pointer"
                  onClick={() => navigate(routes.ordemDeServicoDetalhe(o.id))}
                >
                  <td className="px-4 py-3 font-medium">#{o.number}</td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={osStatusToVariant(o.status)} />
                  </td>
                  <td className="px-4 py-3 text-[#64748B]">{formatDateTime(o.updatedAt)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatMoney(o.totalAmount)}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => navigate(`${routes.ordemDeServicoDetalhe(o.id)}?print=1`)}
                      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-[#0E7490] text-[11px] text-[#0E7490] hover:bg-[#ECFEFF]"
                    >
                      <Printer size={14} />
                      Imprimir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "orcamentos" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] text-xs text-[#64748B] uppercase">
                <th className="px-4 py-2 text-left">OS</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {v.quotes.map((q) => (
                <tr key={q.id} className="border-t border-[#F1F5F9]">
                  <td className="px-4 py-3">#{q.serviceOrder.number}</td>
                  <td className="px-4 py-3">{quoteStatusLabel(q.status)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatMoney(q.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "midia" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <div className="flex justify-between mb-4">
            <p className="text-sm font-medium text-[#1E293B]">Fotos do veículo</p>
            <label className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-[#0F3D4C] text-white text-sm cursor-pointer">
              <Upload size={16} />
              {uploading ? "Enviando..." : "Enviar foto"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUpload(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <AttachmentGrid
            attachments={v.attachments}
            deletingId={deletingAttachmentId}
            onDelete={(attachmentId) => void handleDeleteAttachment(attachmentId)}
            emptyLabel="Nenhuma foto ainda."
          />
        </div>
      )}

      {tab === "timeline" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <ul className="space-y-4">
            {v.timeline.map((h) => (
              <li key={h.id} className="text-sm border-l-2 border-[#0E7490] pl-3">
                <p className="font-medium text-[#1E293B]">OS #{h.serviceOrder.number}</p>
                <p className="text-[#64748B]">
                  {h.fromStatus ? `${osStatusLabel(h.fromStatus)} → ` : ""}
                  {osStatusLabel(h.toStatus)}
                </p>
                <p className="text-xs text-[#94A3B8] mt-0.5">{formatDateTime(h.createdAt)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FormDrawer
        open={editOpen}
        title="Dados técnicos"
        onClose={() => setEditOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          saveMeta.mutate();
        }}
        loading={saveMeta.isPending}
        submitLabel="Salvar"
      >
        <FormField label="Chassi">
          <input
            className={inputClass}
            value={form.chassis}
            onChange={(e) => setForm((f) => ({ ...f, chassis: e.target.value }))}
          />
        </FormField>
        <FormField label="RENAVAM">
          <input
            className={inputClass}
            value={form.renavam}
            onChange={(e) => setForm((f) => ({ ...f, renavam: e.target.value }))}
          />
        </FormField>
        <FormField label="Combustível">
          <input
            className={inputClass}
            value={form.fuelType}
            onChange={(e) => setForm((f) => ({ ...f, fuelType: e.target.value }))}
          />
        </FormField>
        <FormField label="KM atual">
          <input
            type="number"
            className={inputClass}
            value={form.currentKm}
            onChange={(e) => setForm((f) => ({ ...f, currentKm: e.target.value }))}
          />
        </FormField>
        <FormField label="Observações">
          <textarea
            className={`${inputClass} min-h-[72px] py-2`}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </FormField>
      </FormDrawer>
    </main>
  );
}
