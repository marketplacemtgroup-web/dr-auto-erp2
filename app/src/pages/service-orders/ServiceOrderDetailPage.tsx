import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Link2, Plus, Printer, Trash2, Upload } from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import ConfirmDialog from "../../components/modules/ConfirmDialog";
import { api } from "../../lib/api";
import { copyTextToClipboard } from "../../lib/clipboard";
import { formatDateTime, formatMoney } from "../../lib/format";
import { osStatusLabel, osStatusToVariant, quoteStatusLabel } from "../../lib/service-order-status";
import { portalAccessUrl, portalPublicQuoteUrl, routes } from "../../lib/routes";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";
import { useOrganizationBranding } from "../../hooks/useOrganizationBranding";
import { attachmentFileUrl } from "../../lib/mediaUrl";
import { isImageMime, isVideoMime } from "../../lib/mediaTypes";
import ServiceOrderPrintSheet from "../../components/service-orders/ServiceOrderPrintSheet";

const STATUS_OPTIONS = [
  "RECEIVED",
  "DIAGNOSIS",
  "AWAITING_QUOTE",
  "AWAITING_APPROVAL",
  "APPROVED",
  "IN_PROGRESS",
  "AWAITING_PART",
  "PAUSED",
  "AWAITING_PAYMENT",
  "FINISHED",
  "DELIVERED",
  "CANCELLED",
] as const;

const CHECKLIST_RESULT_OPTIONS = [
  { value: "", label: "—" },
  { value: "OK", label: "OK" },
  { value: "ATTENTION", label: "Atenção" },
  { value: "DAMAGED", label: "Avariado" },
  { value: "NA", label: "N/A" },
] as const;

export default function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<
    "dados" | "itens" | "checklist" | "midia" | "timeline" | "orcamentos"
  >("dados");
  const [uploading, setUploading] = useState(false);
  const [itemDrawer, setItemDrawer] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [itemForm, setItemForm] = useState({
    description: "",
    itemType: "SERVICE" as "SERVICE" | "PART",
    quantity: "1",
    unitPrice: "",
    productId: "",
    catalogItemId: "",
  });

  const { data: os, isLoading, error } = useApiQuery(
    ["service-order", id ?? ""],
    (t) => api.serviceOrder(t, id!),
    !!id,
  );

  const { data: products } = useApiQuery(["products-all"], (t) => api.products(t));
  const { data: catalog } = useApiQuery(["service-catalog-all"], (t) => api.serviceCatalog(t));
  const org = useOrganizationBranding();

  const saveMeta = useMutation({
    mutationFn: (payload: Parameters<typeof api.updateServiceOrder>[2]) =>
      api.updateServiceOrder(token!, id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order", id] });
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
    },
  });

  const addItem = useMutation({
    mutationFn: () =>
      api.addServiceOrderItem(token!, id!, {
        description: itemForm.description,
        itemType: itemForm.itemType,
        quantity: Number(itemForm.quantity) || 1,
        unitPrice: Number(itemForm.unitPrice),
        productId: itemForm.productId || undefined,
        catalogItemId: itemForm.catalogItemId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order", id] });
      setItemDrawer(false);
      setItemForm({
        description: "",
        itemType: "SERVICE",
        quantity: "1",
        unitPrice: "",
        productId: "",
        catalogItemId: "",
      });
    },
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => api.removeServiceOrderItem(token!, id!, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service-order", id] }),
  });

  const deleteOs = useMutation({
    mutationFn: () => api.deleteServiceOrder(token!, id!),
    onSuccess: () => navigate(routes.ordemDeServico),
  });

  const saveChecklist = useMutation({
    mutationFn: (items: Array<{ id: string; result?: string | null; notes?: string }>) =>
      api.updateServiceOrderChecklist(token!, id!, items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service-order", id] }),
  });

  async function handleUpload(file: File) {
    if (!token || !id) return;
    setUploading(true);
    try {
      await api.uploadServiceOrderAttachment(token, id, file, {
        visibleToCustomer: true,
        showOnQuote: true,
      });
      queryClient.invalidateQueries({ queryKey: ["service-order", id] });
    } finally {
      setUploading(false);
    }
  }

  async function notifyLinkCopied(url: string, expiresAt: string, copied: boolean) {
    const validity = new Date(expiresAt).toLocaleDateString("pt-BR");
    if (copied) {
      alert(`Link copiado (válido até ${validity}):\n${url}`);
    } else {
      alert(
        `Não foi possível copiar automaticamente (permissão do navegador). Copie manualmente (válido até ${validity}):\n\n${url}`,
      );
    }
  }

  async function shareQuoteLink(quoteId: string) {
    if (!token) return;
    try {
      const link = await api.createQuoteShareLink(token, quoteId);
      const url = portalPublicQuoteUrl(link.token);
      const copied = await copyTextToClipboard(url);
      await notifyLinkCopied(url, link.expiresAt, copied);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao gerar link");
    }
  }

  async function sharePortalLink() {
    if (!token || !id) return;
    try {
      const link = await api.serviceOrderPortalLink(token, id);
      const url = portalAccessUrl(link.token);
      const copied = await copyTextToClipboard(url);
      await notifyLinkCopied(url, link.expiresAt, copied);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao gerar link do portal");
    }
  }

  if (isLoading && !os) {
    return (
      <main className="px-6 pb-8 text-sm text-[#64748B]">Carregando ordem de servico...</main>
    );
  }

  if (error || !os) {
    return (
      <main className="px-6 pb-8">
        <p className="text-red-600 text-sm">Ordem de servico nao encontrada.</p>
        <Link to={routes.ordemDeServico} className="text-[#0E7490] text-sm mt-2 inline-block">
          Voltar
        </Link>
      </main>
    );
  }

  return (
    <>
    <main className="px-6 pb-8 print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <Link
            to={routes.ordemDeServico}
            className="inline-flex items-center gap-1 text-sm text-[#64748B] hover:text-[#0E7490] mb-2"
          >
            <ArrowLeft size={16} />
            Voltar para OS
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[22px] font-semibold text-[#1E293B]">OS #{os.number}</h1>
            <StatusBadge variant={osStatusToVariant(os.status)} />
            <span className="text-sm text-[#64748B]">{osStatusLabel(os.status)}</span>
          </div>
          <p className="text-[13px] text-[#64748B] mt-1">
            {os.vehicle.customer.name} · {os.vehicle.plate}
            {[os.vehicle.brand, os.vehicle.model].filter(Boolean).length > 0 &&
              ` · ${[os.vehicle.brand, os.vehicle.model].filter(Boolean).join(" ")}`}
          </p>
        </div>
        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={() => void sharePortalLink()}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-[#0E7490] text-sm text-[#0E7490] hover:bg-[#ECFEFF] print:hidden"
          >
            <Link2 size={16} />
            Link portal
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC] print:hidden"
          >
            <Printer size={16} />
            Imprimir
          </button>
          {Number(os.totalAmount) > 0 && token ? (
            <button
              type="button"
              className="h-9 px-3 rounded-lg bg-[#16A34A] text-white text-sm print:hidden"
              onClick={() =>
                api.financialFromServiceOrder(token, os.id).then(() => {
                  navigate(routes.financeiro);
                })
              }
            >
              Gerar recebivel
            </button>
          ) : null}
          <div className="text-right">
            <p className="text-xs text-[#64748B]">Total</p>
            <p className="text-xl font-bold text-[#0F3D4C]">{formatMoney(os.totalAmount)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5 border-b border-[#E2E8F0] print:hidden">
        {(
          [
            ["dados", "Dados"],
            ["itens", `Itens (${os.items.length})`],
            ["checklist", "Checklist"],
            ["midia", "Mídia"],
            ["timeline", "Timeline"],
            ["orcamentos", `Orçamentos (${os.quotes.length})`],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t
                ? "border-[#0E7490] text-[#0E7490]"
                : "border-transparent text-[#64748B]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "dados" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-4">
            <FormField label="Status">
              <select
                className={selectClass}
                value={os.status}
                onChange={(e) => saveMeta.mutate({ status: e.target.value })}
              >
                {STATUS_OPTIONS.map((s) => (
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
                value={
                  os.estimatedAt
                    ? new Date(os.estimatedAt).toISOString().slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  saveMeta.mutate({
                    estimatedAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })
                }
              />
            </FormField>
            <FormField label="Relato do cliente">
              <textarea
                className={`${inputClass} min-h-[80px] py-2`}
                defaultValue={os.complaint ?? ""}
                onBlur={(e) => {
                  if (e.target.value !== (os.complaint ?? "")) {
                    saveMeta.mutate({ complaint: e.target.value });
                  }
                }}
              />
            </FormField>
            <FormField label="Diagnostico">
              <textarea
                className={`${inputClass} min-h-[80px] py-2`}
                defaultValue={os.diagnosis ?? ""}
                onBlur={(e) => {
                  if (e.target.value !== (os.diagnosis ?? "")) {
                    saveMeta.mutate({ diagnosis: e.target.value });
                  }
                }}
              />
            </FormField>
            <FormField label="Observacoes internas">
              <textarea
                className={`${inputClass} min-h-[80px] py-2`}
                defaultValue={os.internalNotes ?? ""}
                onBlur={(e) => {
                  if (e.target.value !== (os.internalNotes ?? "")) {
                    saveMeta.mutate({ internalNotes: e.target.value });
                  }
                }}
              />
            </FormField>
          </div>
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
            <FormField label="KM na entrada">
              <input
                type="number"
                className={inputClass}
                defaultValue={os.entryKm ?? ""}
                onBlur={(e) => {
                  const v = e.target.value ? Number(e.target.value) : undefined;
                  if (v !== os.entryKm) saveMeta.mutate({ entryKm: v });
                }}
              />
            </FormField>
            <FormField label="Box / elevador">
              <input
                className={inputClass}
                defaultValue={os.bay ?? ""}
                onBlur={(e) => {
                  if (e.target.value !== (os.bay ?? "")) saveMeta.mutate({ bay: e.target.value });
                }}
              />
            </FormField>
            <FormField label="Observações visíveis ao cliente">
              <textarea
                className={`${inputClass} min-h-[60px] py-2`}
                defaultValue={os.customerVisibleNotes ?? ""}
                onBlur={(e) => {
                  if (e.target.value !== (os.customerVisibleNotes ?? "")) {
                    saveMeta.mutate({ customerVisibleNotes: e.target.value });
                  }
                }}
              />
            </FormField>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="mt-8 text-sm text-red-600 hover:underline"
            >
              Excluir esta OS
            </button>
          </div>
        </div>
      )}

      {tab === "itens" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="flex justify-between items-center px-5 py-3 border-b border-[#F1F5F9]">
            <p className="text-sm font-medium text-[#1E293B]">Servicos e pecas</p>
            <button
              type="button"
              onClick={() => setItemDrawer(true)}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-[#0F3D4C] text-white text-sm"
            >
              <Plus size={16} />
              Adicionar item
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] text-xs text-[#64748B] uppercase">
                <th className="px-4 py-2 text-left">Descricao</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-right">Qtd</th>
                <th className="px-4 py-2 text-right">Unit.</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {os.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#94A3B8]">
                    Nenhum item. Adicione servicos ou pecas.
                  </td>
                </tr>
              )}
              {os.items.map((item) => (
                <tr key={item.id} className="border-t border-[#F1F5F9]">
                  <td className="px-4 py-3">{item.description}</td>
                  <td className="px-4 py-3 text-[#64748B]">
                    {item.itemType === "PART" ? "Peca" : "Servico"}
                  </td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(item.unitPrice)}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatMoney(Number(item.unitPrice) * item.quantity)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => removeItem.mutate(item.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "checklist" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <p className="px-5 py-3 text-sm text-[#64748B] border-b border-[#F1F5F9]">
            Checklist de entrada do veículo
          </p>
          <div className="divide-y divide-[#F1F5F9]">
            {(os.checklistItems ?? []).map((item) => (
              <div key={item.id} className="px-5 py-3 flex flex-wrap gap-3 items-center">
                <span className="text-sm text-[#1E293B] flex-1 min-w-[200px]">{item.label}</span>
                <select
                  className={`${selectClass} w-36`}
                  value={item.result ?? ""}
                  onChange={(e) => {
                    const items = (os.checklistItems ?? []).map((c) =>
                      c.id === item.id
                        ? { id: c.id, result: e.target.value || null, notes: c.notes ?? undefined }
                        : { id: c.id, result: c.result, notes: c.notes ?? undefined },
                    );
                    saveChecklist.mutate(items);
                  }}
                >
                  {CHECKLIST_RESULT_OPTIONS.map((o) => (
                    <option key={o.value || "empty"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "midia" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm font-medium text-[#1E293B]">Fotos, vídeos e anexos</p>
            <label className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-[#0F3D4C] text-white text-sm cursor-pointer">
              <Upload size={16} />
              {uploading ? "Enviando..." : "Enviar mídia"}
              <input
                type="file"
                accept="image/*,video/*"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(os.attachments ?? []).map((a) => (
              <a
                key={a.id}
                href={attachmentFileUrl(a)}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border border-[#E2E8F0] overflow-hidden"
              >
                {isImageMime(a.mimeType) ? (
                  <img
                    src={attachmentFileUrl(a)}
                    alt={a.fileName}
                    className="w-full h-32 object-cover"
                  />
                ) : isVideoMime(a.mimeType) ? (
                  <video
                    src={attachmentFileUrl(a)}
                    controls
                    className="w-full h-32 object-cover bg-black"
                    preload="metadata"
                  />
                ) : (
                  <div className="h-32 flex items-center justify-center text-xs text-[#64748B] p-2">
                    {a.fileName}
                  </div>
                )}
              </a>
            ))}
            {(os.attachments ?? []).length === 0 && (
              <p className="col-span-full text-sm text-[#94A3B8]">Nenhum anexo ainda.</p>
            )}
          </div>
        </div>
      )}

      {tab === "timeline" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <h3 className="text-sm font-semibold text-[#1E293B] mb-4">Histórico de status</h3>
          <ul className="space-y-4">
            {(os.statusHistory ?? []).map((h) => (
              <li key={h.id} className="text-sm border-l-2 border-[#0E7490] pl-3">
                <p className="font-medium text-[#1E293B]">
                  {h.fromStatus ? `${osStatusLabel(h.fromStatus)} → ` : ""}
                  {osStatusLabel(h.toStatus)}
                </p>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {formatDateTime(h.createdAt)}
                  {h.user?.name ? ` · ${h.user.name}` : ""}
                </p>
                {h.notes && <p className="text-xs text-[#64748B] mt-1">{h.notes}</p>}
              </li>
            ))}
            {(os.statusHistory ?? []).length === 0 && (
              <li className="text-sm text-[#94A3B8]">Sem histórico registrado.</li>
            )}
          </ul>
        </div>
      )}

      {tab === "orcamentos" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] text-xs text-[#64748B] uppercase">
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {os.quotes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#94A3B8]">
                    Adicione itens na OS para gerar orçamento automático no portal.
                  </td>
                </tr>
              )}
              {os.quotes.map((q) => (
                <tr key={q.id} className="border-t border-[#F1F5F9]">
                  <td className="px-4 py-3">{q.number ?? "—"}</td>
                  <td className="px-4 py-3">{formatDateTime(q.createdAt)}</td>
                  <td className="px-4 py-3">{quoteStatusLabel(q.status)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatMoney(q.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    {q.status === "PENDING" && (
                      <button
                        type="button"
                        onClick={() => void shareQuoteLink(q.id)}
                        className="inline-flex items-center gap-1 text-[#0E7490] hover:underline text-xs"
                      >
                        <Link2 size={14} />
                        Link cliente
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormDrawer
        open={itemDrawer}
        title="Novo item na OS"
        onClose={() => setItemDrawer(false)}
        onSubmit={(e) => {
          e.preventDefault();
          addItem.mutate();
        }}
        loading={addItem.isPending}
        submitLabel="Adicionar"
      >
        <FormField label="Tipo">
          <select
            className={selectClass}
            value={itemForm.itemType}
            onChange={(e) =>
              setItemForm((f) => ({
                ...f,
                itemType: e.target.value as "SERVICE" | "PART",
              }))
            }
          >
            <option value="SERVICE">Servico</option>
            <option value="PART">Peca</option>
          </select>
        </FormField>
        {itemForm.itemType === "SERVICE" && (
          <FormField label="Servico do catalogo">
            <select
              className={selectClass}
              value={itemForm.catalogItemId}
              onChange={(e) => {
                const s = catalog?.find((x) => x.id === e.target.value);
                setItemForm((f) => ({
                  ...f,
                  catalogItemId: e.target.value,
                  description: s ? s.name : f.description,
                  unitPrice: s ? String(s.defaultPrice) : f.unitPrice,
                }));
              }}
            >
              <option value="">Manual / outro</option>
              {catalog?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.category ? ` (${s.category})` : ""}
                </option>
              ))}
            </select>
          </FormField>
        )}
        {itemForm.itemType === "PART" && (
          <FormField label="Produto (estoque)">
            <select
              className={selectClass}
              value={itemForm.productId}
              onChange={(e) => {
                const p = products?.find((x) => x.id === e.target.value);
                setItemForm((f) => ({
                  ...f,
                  productId: e.target.value,
                  description: p ? p.name : f.description,
                  unitPrice: p ? String(p.salePrice) : f.unitPrice,
                }));
              }}
            >
              <option value="">Manual</option>
              {products?.map((p) => {
                const avail = p.stock - (p.reservedStock ?? 0);
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} (disp.: {avail})
                  </option>
                );
              })}
            </select>
          </FormField>
        )}
        <FormField label="Descricao *">
          <input
            className={inputClass}
            value={itemForm.description}
            onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
            required
          />
        </FormField>
        <FormField label="Quantidade">
          <input
            type="number"
            min={1}
            className={inputClass}
            value={itemForm.quantity}
            onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))}
          />
        </FormField>
        <FormField label="Valor unitario (R$) *">
          <input
            type="number"
            step="0.01"
            className={inputClass}
            value={itemForm.unitPrice}
            onChange={(e) => setItemForm((f) => ({ ...f, unitPrice: e.target.value }))}
            required
          />
        </FormField>
      </FormDrawer>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir OS"
        message={`Confirma excluir a OS #${os.number}? Esta acao nao pode ser desfeita.`}
        loading={deleteOs.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => deleteOs.mutate()}
      />
    </main>
    <ServiceOrderPrintSheet os={os} org={org} />
    </>
  );
}
