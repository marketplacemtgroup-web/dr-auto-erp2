import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Link2, Pencil, Plus, Printer, Trash2, Upload, X } from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import ConfirmDialog from "../../components/modules/ConfirmDialog";
import ShareLinkDialog, { type ShareLinkDialogData } from "../../components/share/ShareLinkDialog";
import { api, type QuoteLineRow, type ServiceOrderItemRow } from "../../lib/api";
import { formatDateTime, formatMoney } from "../../lib/format";
import {
  lineApprovalLabel,
  lineApprovalVariant,
  osStatusLabel,
  osStatusToVariant,
  quoteStatusLabel,
  quoteStatusVariant,
} from "../../lib/service-order-status";
import { portalAccessUrl, portalPublicQuoteUrl, routes } from "../../lib/routes";
import { applyUrlTemplate, defaultPortalWhatsAppMessage, defaultQuoteWhatsAppMessage, resolveOrganizationWhatsApp } from "../../lib/shareLink";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";
import { useOrganizationBranding } from "../../hooks/useOrganizationBranding";
import PrintPortal from "../../components/print/PrintPortal";
import QuotePrintSheet, { buildQuotePrintData } from "../../components/quotes/QuotePrintSheet";
import ServiceOrderPrintSheet from "../../components/service-orders/ServiceOrderPrintSheet";
import { printDocument } from "../../lib/print";
import AttachmentGrid from "../../components/attachments/AttachmentGrid";

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

type OsQuote = {
  id: string;
  number?: number | null;
  status: string;
  amount: string | number;
  createdAt: string;
  paymentAgreement?: string | null;
  lines?: QuoteLineRow[];
};

function getActiveQuote(quotes: OsQuote[]) {
  return (
    quotes.find((q) => q.status === "PENDING") ??
    quotes.find((q) => q.status === "DRAFT") ??
    quotes[0] ??
    null
  );
}

function getLineForItem(
  item: ServiceOrderItemRow,
  itemIndex: number,
  quote: OsQuote | null,
): QuoteLineRow | null {
  if (!quote?.lines?.length) return null;
  const byId = quote.lines.find((l) => l.serviceOrderItemId === item.id);
  if (byId) return byId;
  return quote.lines[itemIndex] ?? null;
}

export default function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<
    "dados" | "equipe" | "orcamento" | "itens" | "checklist" | "midia" | "timeline"
  >("dados");
  const [uploading, setUploading] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [itemDrawer, setItemDrawer] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceOrderItemRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareDialog, setShareDialog] = useState<ShareLinkDialogData | null>(null);
  const [itemForm, setItemForm] = useState({
    description: "",
    itemType: "SERVICE" as "SERVICE" | "PART",
    quantity: "1",
    unitPrice: "",
    productId: "",
    catalogItemId: "",
    executorId: "",
    soldById: "",
    appliedById: "",
  });

  const { data: os, isLoading, error } = useApiQuery(
    ["service-order", id ?? ""],
    (t) => api.serviceOrder(t, id!),
    !!id,
  );

  const { data: products } = useApiQuery(["products-all"], (t) => api.products(t));
  const { data: catalog } = useApiQuery(["service-catalog-all"], (t) => api.serviceCatalog(t));
  const { data: activeEmployees } = useApiQuery(["employees-active"], (t) => api.employees(t, { status: "ACTIVE" }));
  const { data: technicians } = useApiQuery(["employee-technicians"], (t) => api.employeeTechnicians(t));
  const org = useOrganizationBranding();

  useEffect(() => {
    if (!os || searchParams.get("print") !== "1") return;
    const timer = window.setTimeout(() => {
      printDocument("os");
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("print");
          return next;
        },
        { replace: true },
      );
    }, 500);
    return () => window.clearTimeout(timer);
  }, [os, searchParams, setSearchParams]);

  const saveMeta = useMutation({
    mutationFn: (payload: Parameters<typeof api.updateServiceOrder>[2]) =>
      api.updateServiceOrder(token!, id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order", id] });
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
    },
  });

  const resetItemForm = () => {
    setEditingItem(null);
    setItemForm({
      description: "",
      itemType: "SERVICE",
      quantity: "1",
      unitPrice: "",
      productId: "",
      catalogItemId: "",
      executorId: "",
      soldById: "",
      appliedById: "",
    });
  };

  const openAddItem = () => {
    resetItemForm();
    setItemDrawer(true);
  };

  const openEditItem = (item: ServiceOrderItemRow) => {
    setEditingItem(item);
    setItemForm({
      description: item.description,
      itemType: item.itemType,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      productId: item.product?.id ?? "",
      catalogItemId: "",
      executorId: item.executor?.id ?? "",
      soldById: item.soldBy?.id ?? "",
      appliedById: item.appliedBy?.id ?? "",
    });
    setItemDrawer(true);
  };

  const saveItem = useMutation({
    mutationFn: () => {
      const payload = {
        description: itemForm.description,
        itemType: itemForm.itemType,
        quantity: Number(itemForm.quantity) || 1,
        unitPrice: Number(itemForm.unitPrice),
        executorId: itemForm.executorId || null,
        soldById: itemForm.soldById || null,
        appliedById: itemForm.appliedById || null,
      };
      if (editingItem) {
        return api.updateServiceOrderItem(token!, id!, editingItem.id, payload);
      }
      return api.addServiceOrderItem(token!, id!, {
        ...payload,
        productId: itemForm.productId || undefined,
        catalogItemId: itemForm.catalogItemId || undefined,
        executorId: itemForm.executorId || undefined,
        soldById: itemForm.soldById || undefined,
        appliedById: itemForm.appliedById || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order", id] });
      setItemDrawer(false);
      resetItemForm();
    },
  });

  const approveQuote = useMutation({
    mutationFn: (quoteId: string) => api.approveQuote(token!, quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order", id] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  const rejectQuote = useMutation({
    mutationFn: (quoteId: string) => api.rejectQuote(token!, quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order", id] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  const saveQuoteMeta = useMutation({
    mutationFn: ({ quoteId, payload }: { quoteId: string; payload: Parameters<typeof api.updateQuote>[2] }) =>
      api.updateQuote(token!, quoteId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order", id] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
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

  async function handleDeleteAttachment(attachmentId: string) {
    if (!token || !id) return;
    if (!confirm("Remover esta mídia? Esta ação não pode ser desfeita.")) return;
    setDeletingAttachmentId(attachmentId);
    try {
      await api.deleteAttachment(token, attachmentId);
      queryClient.invalidateQueries({ queryKey: ["service-order", id] });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao remover mídia");
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  async function handleUpload(file: File) {
    if (!token || !id) return;
    setUploading(true);
    try {
      await api.uploadServiceOrderAttachment(token, id, file, {
        visibleToCustomer: true,
        showOnQuote: true,
      });
      queryClient.invalidateQueries({ queryKey: ["service-order", id] });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  }

  async function shareQuoteLink(quoteId: string) {
    if (!token || !os) return;
    try {
      const link = await api.createQuoteShareLink(token, quoteId);
      const url = portalPublicQuoteUrl(link.token);
      if (!url.startsWith("http")) {
        alert("Configure VITE_PORTAL_URL no .env (URL do portal do cliente) para gerar links válidos.");
        return;
      }
      const customer = os.vehicle.customer;
      const active = os.quotes.find((q) => q.id === quoteId);
      const whatsappMessage = link.whatsappMessage
        ? applyUrlTemplate(link.whatsappMessage, url)
        : defaultQuoteWhatsAppMessage({
            customerName: customer.name,
            plate: os.vehicle.plate,
            quoteNumber: active?.number,
            url,
          });
      setShareDialog({
        title: "Link do orçamento",
        subtitle: `${customer.name} · ${os.vehicle.plate}`,
        url,
        expiresAt: link.expiresAt,
        whatsappMessage,
        whatsappPhone: resolveOrganizationWhatsApp(),
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao gerar link");
    }
  }

  async function sharePortalLink() {
    if (!token || !id || !os) return;
    try {
      const link = await api.serviceOrderPortalLink(token, id);
      const url = portalAccessUrl(link.token);
      if (!url.startsWith("http")) {
        alert("Configure VITE_PORTAL_URL no .env (URL do portal do cliente) para gerar links válidos.");
        return;
      }
      const customer = os.vehicle.customer;
      const whatsappMessage = link.whatsappMessage
        ? applyUrlTemplate(link.whatsappMessage, url)
        : defaultPortalWhatsAppMessage({
            customerName: customer.name,
            plate: os.vehicle.plate,
            url,
          });
      setShareDialog({
        title: "Link do portal",
        subtitle: `Acompanhar OS #${os.number} · ${os.vehicle.plate}`,
        url,
        expiresAt: link.expiresAt,
        whatsappMessage,
        whatsappPhone: resolveOrganizationWhatsApp(),
      });
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
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Ordem de servico nao encontrada.";
    return (
      <main className="px-6 pb-8">
        <p className="text-red-600 text-sm">{message}</p>
        <Link to={routes.ordemDeServico} className="text-[#0E7490] text-sm mt-2 inline-block">
          Voltar
        </Link>
      </main>
    );
  }

  const activeQuote = getActiveQuote(os.quotes);
  const canManageQuote = !activeQuote || activeQuote.status !== "APPROVED";
  const quoteTotal = Number(activeQuote?.amount ?? os.totalAmount);
  const canPrintQuote = os.items.length > 0;
  const quotePrintData = buildQuotePrintData(os, activeQuote);

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
            onClick={() => printDocument("os")}
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
                api.financialFromServiceOrder(token, os.id).then((entry) => {
                  navigate(routes.financeiro, {
                    state: { tab: "cash", payEntry: entry },
                  });
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
            ["equipe", "Equipe"],
            ["orcamento", "Orçamento"],
            ["itens", `Itens (${os.items.length})`],
            ["checklist", "Checklist"],
            ["midia", "Mídia"],
            ["timeline", "Timeline"],
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

      {tab === "equipe" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 max-w-3xl">
          <h2 className="text-sm font-semibold text-[#1E293B] mb-4">Equipe da OS</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {(
              [
                ["generalResponsibleId", "Responsável geral", os.generalResponsible?.id],
                ["checklistById", "Checklist por", os.checklistBy?.id],
                ["diagnosisById", "Diagnóstico por", os.diagnosisBy?.id],
                ["quoteById", "Orçamento por", os.quoteBy?.id],
                ["executionById", "Execução por", os.executionBy?.id],
                ["finalizedById", "Finalização por", os.finalizedBy?.id],
              ] as const
            ).map(([field, label, current]) => (
              <FormField key={field} label={label}>
                <select
                  className={selectClass}
                  value={current ?? ""}
                  onChange={(e) =>
                    saveMeta.mutate({
                      [field]: e.target.value || null,
                    } as Parameters<typeof api.updateServiceOrder>[2])
                  }
                >
                  <option value="">—</option>
                  {(activeEmployees ?? []).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </FormField>
            ))}
          </div>
        </div>
      )}

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
            <FormField label="Pagamento combinado">
              <p className="text-xs text-[#94A3B8] mb-2">
                Lembrete do combinado com o cliente. Não registra cobrança no financeiro.
              </p>
              <textarea
                className={`${inputClass} min-h-[72px] py-2`}
                placeholder="Ex.: 50% à vista e 50% na entrega, PIX, 3x no cartão..."
                defaultValue={os.paymentAgreement ?? ""}
                onBlur={(e) => {
                  if (e.target.value !== (os.paymentAgreement ?? "")) {
                    saveMeta.mutate({ paymentAgreement: e.target.value });
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

      {tab === "orcamento" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#1E293B]">Orçamento da OS</p>
                {activeQuote ? (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-sm font-semibold text-[#0F3D4C]">
                      #{activeQuote.number ?? "—"}
                    </span>
                    <StatusBadge variant={quoteStatusVariant(activeQuote.status)} />
                    <span className="text-sm text-[#64748B]">
                      {quoteStatusLabel(activeQuote.status)}
                    </span>
                  </div>
                ) : canPrintQuote ? (
                  <p className="text-sm text-[#64748B] mt-1">
                    Itens lançados — imprima ou envie o link ao cliente para aprovação.
                  </p>
                ) : (
                  <p className="text-sm text-[#94A3B8] mt-1">
                    Adicione serviços e peças abaixo para montar o orçamento.
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs uppercase tracking-wide text-[#64748B]">
                  Total do orçamento
                </p>
                <p className="text-2xl font-bold text-[#0F3D4C] tabular-nums">
                  {formatMoney(quoteTotal)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#F1F5F9]">
              <button
                type="button"
                disabled={!canPrintQuote}
                onClick={() => printDocument("quote")}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[#0F3D4C] text-white text-sm font-medium hover:bg-[#0a2d38] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Printer size={16} />
                Imprimir orçamento
              </button>
              {activeQuote?.status === "PENDING" && activeQuote.id && (
                <button
                  type="button"
                  onClick={() => void shareQuoteLink(activeQuote.id)}
                  className="inline-flex items-center gap-1 h-10 px-3 rounded-lg border border-[#0E7490] text-sm text-[#0E7490] hover:bg-[#ECFEFF]"
                >
                  <Link2 size={16} />
                  Link cliente
                </button>
              )}
              {activeQuote && activeQuote.status !== "APPROVED" && (
                <button
                  type="button"
                  disabled={approveQuote.isPending}
                  onClick={() => {
                    if (
                      confirm(
                        "Marcar orçamento como aprovado? Use quando o cliente aprovou fora do app.",
                      )
                    ) {
                      approveQuote.mutate(activeQuote.id);
                    }
                  }}
                  className="inline-flex items-center gap-1 h-10 px-3 rounded-lg bg-[#16A34A] text-white text-sm disabled:opacity-50"
                >
                  <Check size={16} />
                  Aprovado
                </button>
              )}
              {activeQuote && activeQuote.status !== "REJECTED" && (
                <button
                  type="button"
                  disabled={rejectQuote.isPending}
                  onClick={() => {
                    if (
                      confirm(
                        "Marcar orçamento como recusado? Use quando o cliente recusou fora do app.",
                      )
                    ) {
                      rejectQuote.mutate(activeQuote.id);
                    }
                  }}
                  className="inline-flex items-center gap-1 h-10 px-3 rounded-lg border border-red-300 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <X size={16} />
                  Recusado
                </button>
              )}
              {activeQuote?.id && (
                <Link
                  to={routes.orcamentoDetalhe(activeQuote.id)}
                  className="inline-flex items-center h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Abrir tela do orçamento
                </Link>
              )}
            </div>

            {activeQuote && (
              <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
                <FormField label="Pagamento combinado (orçamento)">
                  <p className="text-xs text-[#94A3B8] mb-2">
                    Lembrete do combinado com o cliente. Não registra cobrança no financeiro.
                  </p>
                  <textarea
                    className={`${inputClass} min-h-[72px] py-2`}
                    placeholder="Ex.: 50% à vista e 50% na entrega, PIX, 3x no cartão..."
                    defaultValue={activeQuote.paymentAgreement ?? ""}
                    disabled={!canManageQuote}
                    onBlur={(e) => {
                      if (!canManageQuote || !activeQuote.id) return;
                      if (e.target.value !== (activeQuote.paymentAgreement ?? "")) {
                        saveQuoteMeta.mutate({
                          quoteId: activeQuote.id,
                          payload: { paymentAgreement: e.target.value },
                        });
                      }
                    }}
                  />
                </FormField>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div className="flex justify-between items-center px-5 py-3 border-b border-[#F1F5F9]">
              <p className="text-sm font-medium text-[#1E293B]">Serviços e peças do orçamento</p>
              {canManageQuote && (
                <button
                  type="button"
                  onClick={openAddItem}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-[#0F3D4C] text-white text-sm"
                >
                  <Plus size={16} />
                  Adicionar
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] text-xs text-[#64748B] uppercase">
                  <th className="px-4 py-2 text-left">Descrição</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-right">Qtd</th>
                  <th className="px-4 py-2 text-right">Unit.</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-left">Executor</th>
                  <th className="px-4 py-2 text-right">Comissão prev.</th>
                  {canManageQuote && <th className="w-24" />}
                </tr>
              </thead>
              <tbody>
                {os.items.length === 0 && (
                  <tr>
                    <td
                      colSpan={canManageQuote ? 8 : 7}
                      className="px-4 py-8 text-center text-[#94A3B8]"
                    >
                      Nenhum item no orçamento. Adicione serviços ou peças.
                    </td>
                  </tr>
                )}
                {os.items.map((item) => (
                  <tr key={item.id} className="border-t border-[#F1F5F9]">
                    <td className="px-4 py-3">{item.description}</td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {item.itemType === "PART" ? "Peça" : "Serviço"}
                    </td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(Number(item.unitPrice) * item.quantity)}
                    </td>
                    <td className="px-4 py-3 text-[#64748B] text-xs">
                      {item.itemType === "SERVICE"
                        ? item.executor?.name ?? os.executionBy?.name ?? "—"
                        : item.soldBy?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-[#64748B]">
                      {item.expectedCommission != null
                        ? formatMoney(item.expectedCommission)
                        : "—"}
                    </td>
                    {canManageQuote && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditItem(item)}
                            className="p-1.5 text-[#0E7490] hover:bg-[#ECFEFF] rounded"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem.mutate(item.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Remover"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {os.items.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[#0F3D4C] bg-[#F8FAFC]">
                    <td colSpan={canManageQuote ? 6 : 6} className="px-4 py-3 text-right font-semibold">
                      Total do orçamento
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#0F3D4C]">
                      {formatMoney(quoteTotal)}
                    </td>
                    {canManageQuote && <td />}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {os.quotes.length > 1 && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
              <p className="px-5 py-3 text-sm font-medium text-[#1E293B] border-b border-[#F1F5F9]">
                Histórico de orçamentos
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F8FAFC] text-xs text-[#64748B] uppercase">
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Data</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {os.quotes.map((q) => (
                    <tr key={q.id} className="border-t border-[#F1F5F9]">
                      <td className="px-4 py-3">{q.number ?? "—"}</td>
                      <td className="px-4 py-3">{formatDateTime(q.createdAt)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge variant={quoteStatusVariant(q.status)} />
                        <span className="ml-2 text-xs text-[#64748B]">
                          {quoteStatusLabel(q.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatMoney(q.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "itens" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#F1F5F9]">
            <p className="text-sm font-medium text-[#1E293B]">Itens e status de aprovação</p>
            <p className="text-xs text-[#94A3B8] mt-1">
              Acompanhe o que foi aprovado, recusado ou ainda aguarda resposta do cliente.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] text-xs text-[#64748B] uppercase">
                <th className="px-4 py-2 text-left">Descrição</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-right">Qtd</th>
                <th className="px-4 py-2 text-right">Unit.</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-left">Executor</th>
                <th className="px-4 py-2 text-right">Comissão</th>
                <th className="px-4 py-2 text-left">Aprovação</th>
              </tr>
            </thead>
            <tbody>
              {os.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#94A3B8]">
                    Nenhum item. Adicione serviços ou peças na aba Orçamento.
                  </td>
                </tr>
              )}
              {os.items.map((item, index) => {
                const line = getLineForItem(item, index, activeQuote);
                const approvalStatus = line?.approved;
                const quoteStatus = activeQuote?.status;
                return (
                  <tr key={item.id} className="border-t border-[#F1F5F9]">
                    <td className="px-4 py-3">{item.description}</td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {item.itemType === "PART" ? "Peça" : "Serviço"}
                    </td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(Number(item.unitPrice) * item.quantity)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">
                      {item.itemType === "SERVICE"
                        ? item.executor?.name ?? os.executionBy?.name ?? "—"
                        : [item.soldBy?.name, item.appliedBy?.name].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-[#64748B]">
                      {item.expectedCommission != null
                        ? formatMoney(item.expectedCommission)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        variant={lineApprovalVariant(approvalStatus, quoteStatus)}
                      />
                      <span className="ml-2 text-xs text-[#64748B]">
                        {lineApprovalLabel(approvalStatus, quoteStatus)}
                      </span>
                    </td>
                  </tr>
                );
              })}
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
          <AttachmentGrid
            attachments={os.attachments ?? []}
            deletingId={deletingAttachmentId}
            onDelete={(attachmentId) => void handleDeleteAttachment(attachmentId)}
            emptyLabel="Nenhuma mídia ainda. Envie fotos ou vídeos para o cliente ver no portal."
          />
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

      <FormDrawer
        open={itemDrawer}
        title={editingItem ? "Editar item do orçamento" : "Novo item no orçamento"}
        onClose={() => {
          setItemDrawer(false);
          resetItemForm();
        }}
        onSubmit={(e) => {
          e.preventDefault();
          saveItem.mutate();
        }}
        loading={saveItem.isPending}
        submitLabel={editingItem ? "Salvar" : "Adicionar"}
      >
        {!editingItem && (
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
              <option value="SERVICE">Serviço</option>
              <option value="PART">Peça</option>
            </select>
          </FormField>
        )}
        {!editingItem && itemForm.itemType === "SERVICE" && (
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
        {!editingItem && itemForm.itemType === "PART" && (
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
        {itemForm.itemType === "SERVICE" && (
          <FormField label="Executor do serviço">
            <select
              className={selectClass}
              value={itemForm.executorId}
              onChange={(e) => setItemForm((f) => ({ ...f, executorId: e.target.value }))}
            >
              <option value="">
                {os.executionBy?.name
                  ? `Padrão: ${os.executionBy.name}`
                  : "Selecione o executor"}
              </option>
              {(technicians ?? activeEmployees ?? []).map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </FormField>
        )}
        {itemForm.itemType === "PART" && (
          <>
            <FormField label="Vendido por">
              <select
                className={selectClass}
                value={itemForm.soldById}
                onChange={(e) => setItemForm((f) => ({ ...f, soldById: e.target.value }))}
              >
                <option value="">—</option>
                {(activeEmployees ?? []).map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Aplicado por">
              <select
                className={selectClass}
                value={itemForm.appliedById}
                onChange={(e) => setItemForm((f) => ({ ...f, appliedById: e.target.value }))}
              >
                <option value="">—</option>
                {(technicians ?? activeEmployees ?? []).map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </FormField>
          </>
        )}
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
    <ShareLinkDialog data={shareDialog} onClose={() => setShareDialog(null)} />
    <PrintPortal>
      <ServiceOrderPrintSheet os={os} org={org} />
      {canPrintQuote ? <QuotePrintSheet quote={quotePrintData} org={org} /> : null}
    </PrintPortal>
    </>
  );
}
