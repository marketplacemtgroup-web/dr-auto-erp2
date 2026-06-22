import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Link2, Pencil, Plus, Printer, Trash2, Upload, X } from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import DateTimeField from "../../components/modules/DateTimeField";
import ConfirmDialog from "../../components/modules/ConfirmDialog";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "../../lib/datetimeLocal";
import ShareLinkDialog, { type ShareLinkDialogData } from "../../components/share/ShareLinkDialog";
import { api, type QuoteLineRow, type ServiceOrderItemRow } from "../../lib/api";
import { formatDateTime, formatMoney } from "../../lib/format";
import {
  itemTypeLabel,
  isCommissionEligibleItemType,
  SERVICE_ORDER_ITEM_TYPE_OPTIONS,
  type ServiceOrderItemType,
} from "../../lib/itemType";
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

const CHECKLIST_TEXT_ONLY_LABELS = new Set<string>();

const MAINTENANCE_INTERVAL_OPTIONS = [
  { value: "none", label: "Nenhum" },
  { value: "5000_km", label: "5.000 km" },
  { value: "10000_km", label: "10.000 km" },
  { value: "12_months", label: "12 meses" },
] as const;

function encodeMaintenanceInterval(
  km: number | null | undefined,
  months: number | null | undefined,
): string {
  if (months === 12) return "12_months";
  if (km === 5000) return "5000_km";
  if (km === 10000) return "10000_km";
  return "none";
}

function decodeMaintenanceInterval(value: string): {
  km: number | null;
  months: number | null;
} {
  if (value === "5000_km") return { km: 5000, months: null };
  if (value === "10000_km") return { km: 10000, months: null };
  if (value === "12_months") return { km: null, months: 12 };
  return { km: null, months: null };
}

type DadosFormState = {
  status: string;
  estimatedAt: string;
  complaint: string;
  diagnosis: string;
  internalNotes: string;
  entryKm: string;
  bay: string;
  customerVisibleNotes: string;
  paymentAgreement: string;
  revisionInterval: string;
  oilChangeInterval: string;
};

type EquipeFormState = {
  generalResponsibleId: string;
  checklistById: string;
  diagnosisById: string;
  quoteById: string;
  executionById: string;
  finalizedById: string;
};

type ChecklistDraftItem = { result: string; notes: string };

function buildDadosForm(os: {
  status: string;
  estimatedAt: string | null;
  complaint: string | null;
  diagnosis: string | null;
  internalNotes: string | null;
  entryKm?: number | null;
  bay?: string | null;
  customerVisibleNotes?: string | null;
  paymentAgreement?: string | null;
  revisionIntervalKm?: number | null;
  revisionIntervalMonths?: number | null;
  oilChangeIntervalKm?: number | null;
  oilChangeIntervalMonths?: number | null;
}): DadosFormState {
  return {
    status: os.status,
    estimatedAt: toDatetimeLocalValue(os.estimatedAt),
    complaint: os.complaint ?? "",
    diagnosis: os.diagnosis ?? "",
    internalNotes: os.internalNotes ?? "",
    entryKm: os.entryKm != null ? String(os.entryKm) : "",
    bay: os.bay ?? "",
    customerVisibleNotes: os.customerVisibleNotes ?? "",
    paymentAgreement: os.paymentAgreement ?? "",
    revisionInterval: encodeMaintenanceInterval(os.revisionIntervalKm, os.revisionIntervalMonths),
    oilChangeInterval: encodeMaintenanceInterval(os.oilChangeIntervalKm, os.oilChangeIntervalMonths),
  };
}

function buildEquipeForm(os: {
  generalResponsible?: { id: string } | null;
  checklistBy?: { id: string } | null;
  diagnosisBy?: { id: string } | null;
  quoteBy?: { id: string } | null;
  executionBy?: { id: string } | null;
  finalizedBy?: { id: string } | null;
}): EquipeFormState {
  return {
    generalResponsibleId: os.generalResponsible?.id ?? "",
    checklistById: os.checklistBy?.id ?? "",
    diagnosisById: os.diagnosisBy?.id ?? "",
    quoteById: os.quoteBy?.id ?? "",
    executionById: os.executionBy?.id ?? "",
    finalizedById: os.finalizedBy?.id ?? "",
  };
}

function dadosFormToPayload(form: DadosFormState): Parameters<typeof api.updateServiceOrder>[2] {
  const revision = decodeMaintenanceInterval(form.revisionInterval);
  const oil = decodeMaintenanceInterval(form.oilChangeInterval);
  return {
    status: form.status,
    estimatedAt: form.estimatedAt ? fromDatetimeLocalValue(form.estimatedAt) : null,
    complaint: form.complaint,
    diagnosis: form.diagnosis,
    internalNotes: form.internalNotes,
    entryKm: form.entryKm ? Number(form.entryKm) : undefined,
    bay: form.bay,
    customerVisibleNotes: form.customerVisibleNotes,
    paymentAgreement: form.paymentAgreement,
    revisionIntervalKm: revision.km,
    revisionIntervalMonths: revision.months,
    oilChangeIntervalKm: oil.km,
    oilChangeIntervalMonths: oil.months,
  };
}

function FormSaveBar({
  onSave,
  loading,
  disabled,
  label = "Salvar",
}: {
  onSave: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-[#F1F5F9]">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={onSave}
        className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-[#0F3D4C] text-white text-sm font-medium hover:bg-[#0a2d38] disabled:opacity-50"
      >
        {loading ? "Salvando..." : label}
      </button>
    </div>
  );
}

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
  const pending = quotes.find((q) => q.status === "PENDING");
  const draft = quotes.find((q) => q.status === "DRAFT");
  const approved = quotes.find((q) => q.status === "APPROVED");
  return pending ?? draft ?? approved ?? quotes[0] ?? null;
}

function getApprovedQuote(quotes: OsQuote[]) {
  return quotes.find((q) => q.status === "APPROVED") ?? null;
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

function isSupplementQuote(quote: OsQuote | null) {
  if (!quote?.lines?.length) return false;
  return (
    quote.lines.some((l) => l.approved === true) &&
    quote.lines.some((l) => l.approved === null)
  );
}

const SUPPLEMENT_OS_STATUSES = new Set(["IN_PROGRESS", "APPROVED", "AWAITING_PART"]);

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
  const [supplementUnlocked, setSupplementUnlocked] = useState(false);
  const [itemForm, setItemForm] = useState({
    description: "",
    itemType: "SERVICE" as ServiceOrderItemType,
    quantity: "1",
    unitPrice: "",
    productId: "",
    catalogItemId: "",
    executorId: "",
    soldById: "",
    appliedById: "",
  });

  const [dadosForm, setDadosForm] = useState<DadosFormState | null>(null);
  const [equipeForm, setEquipeForm] = useState<EquipeFormState | null>(null);
  const [checklistDraft, setChecklistDraft] = useState<Record<string, ChecklistDraftItem>>({});
  const [quotePaymentAgreement, setQuotePaymentAgreement] = useState("");
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const { data: os, isLoading, error } = useApiQuery(
    ["service-order", id ?? ""],
    (t) => api.serviceOrder(t, id!),
    !!id,
  );

  const serviceOrderQueryKey = ["service-order", id ?? "", token] as const;

  const applyServiceOrderUpdate = (updated: NonNullable<typeof os>) => {
    queryClient.setQueryData(serviceOrderQueryKey, updated);
    void queryClient.invalidateQueries({ queryKey: ["service-orders"] });
    void queryClient.invalidateQueries({ queryKey: ["quotes"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard", "kpis"] });
  };

  const { data: products } = useApiQuery(["products-all"], (t) => api.products(t));
  const { data: catalog } = useApiQuery(["service-catalog-all"], (t) => api.serviceCatalog(t));
  const { data: activeEmployees } = useApiQuery(["employees-active"], (t) => api.employees(t, { status: "ACTIVE" }));
  const { data: technicians } = useApiQuery(["employee-technicians"], (t) => api.employeeTechnicians(t));
  const org = useOrganizationBranding();

  useEffect(() => {
    if (!os) return;
    setDadosForm(buildDadosForm(os));
    setEquipeForm(buildEquipeForm(os));
    const draft: Record<string, ChecklistDraftItem> = {};
    for (const item of os.checklistItems ?? []) {
      draft[item.id] = { result: item.result ?? "", notes: item.notes ?? "" };
    }
    setChecklistDraft(draft);
    const activeQ = getActiveQuote(os.quotes);
    setQuotePaymentAgreement(activeQ?.paymentAgreement ?? "");
  }, [os?.id, os?.updatedAt]);

  useEffect(() => {
    if (!os) return;
    const pending = os.quotes.find((q) => q.status === "PENDING");
    const approved = os.quotes.find((q) => q.status === "APPROVED");
    const supplementInProgress =
      !!pending &&
      (!!approved || isSupplementQuote(pending) || pending.lines?.some((l) => l.approved === true));
    if (supplementInProgress) {
      setSupplementUnlocked(true);
      return;
    }
    if (!pending && approved) {
      setSupplementUnlocked(false);
    }
  }, [os]);

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
      setSaveSuccessMessage("Alterações salvas.");
      window.setTimeout(() => setSaveSuccessMessage(null), 3000);
    },
  });

  const saveDados = () => {
    if (!dadosForm) return;
    saveMeta.mutate(dadosFormToPayload(dadosForm));
  };

  const saveEquipe = () => {
    if (!equipeForm) return;
    saveMeta.mutate({
      generalResponsibleId: equipeForm.generalResponsibleId || null,
      checklistById: equipeForm.checklistById || null,
      diagnosisById: equipeForm.diagnosisById || null,
      quoteById: equipeForm.quoteById || null,
      executionById: equipeForm.executionById || null,
      finalizedById: equipeForm.finalizedById || null,
    });
  };

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
    onSuccess: (updatedOs) => {
      applyServiceOrderUpdate(updatedOs);
      setItemDrawer(false);
      resetItemForm();
    },
  });

  const reopenSupplement = useMutation({
    mutationFn: (quoteId: string) => api.reopenQuoteSupplement(token!, quoteId),
    onMutate: () => {
      setSupplementUnlocked(true);
    },
    onSuccess: () => {
      openAddItem();
      void queryClient.refetchQueries({ queryKey: ["service-order", id] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (err) => {
      setSupplementUnlocked(false);
      alert(err instanceof Error ? err.message : "Não foi possível reabrir o orçamento para complemento.");
    },
  });

  const approveQuote = useMutation({
    mutationFn: (quoteId: string) => api.approveQuote(token!, quoteId),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["service-order", id] });
      void queryClient.invalidateQueries({ queryKey: ["quotes"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "kpis"] });
    },
  });

  const rejectQuote = useMutation({
    mutationFn: (quoteId: string) => api.rejectQuote(token!, quoteId),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["service-order", id] });
      void queryClient.invalidateQueries({ queryKey: ["quotes"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "kpis"] });
    },
  });

  const saveQuoteMeta = useMutation({
    mutationFn: ({ quoteId, payload }: { quoteId: string; payload: Parameters<typeof api.updateQuote>[2] }) =>
      api.updateQuote(token!, quoteId, payload),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["service-order", id] });
      void queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => api.removeServiceOrderItem(token!, id!, itemId),
    onSuccess: (updatedOs) => applyServiceOrderUpdate(updatedOs),
  });

  const deleteOs = useMutation({
    mutationFn: () => api.deleteServiceOrder(token!, id!),
    onSuccess: () => navigate(routes.ordemDeServico),
  });

  const saveChecklist = useMutation({
    mutationFn: (items: Array<{ id: string; result?: string | null; notes?: string }>) =>
      api.updateServiceOrderChecklist(token!, id!, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order", id] });
      setSaveSuccessMessage("Checklist salvo.");
      window.setTimeout(() => setSaveSuccessMessage(null), 3000);
    },
  });

  const submitChecklist = () => {
    const items = Object.entries(checklistDraft).map(([id, row]) => ({
      id,
      result: row.result || null,
      notes: row.notes || undefined,
    }));
    saveChecklist.mutate(items);
  };

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
  const approvedQuote = getApprovedQuote(os.quotes);
  const isSupplement = isSupplementQuote(activeQuote);
  const pendingLineCount =
    activeQuote?.lines?.filter((l) => l.approved === null).length ?? 0;
  const hasOpenSupplement = os.quotes.some((q) => q.status === "PENDING");
  const canIncreaseQuote =
    !!approvedQuote?.id &&
    !hasOpenSupplement &&
    !supplementUnlocked &&
    SUPPLEMENT_OS_STATUSES.has(os.status);
  const canManageQuote =
    supplementUnlocked ||
    !activeQuote ||
    activeQuote.status === "PENDING" ||
    activeQuote.status === "DRAFT";
  const canEditQuoteItems = canManageQuote;

  function itemLineApproved(item: ServiceOrderItemRow, index: number) {
    const line = getLineForItem(item, index, activeQuote);
    return line?.approved === true;
  }
  const quoteTotal = Number(activeQuote?.amount ?? os.totalAmount);
  const canPrintQuote = os.items.length > 0;
  const quotePrintData = buildQuotePrintData(os, activeQuote);

  const saveQuotePayment = () => {
    if (!activeQuote?.id || !canManageQuote) return;
    saveQuoteMeta.mutate({
      quoteId: activeQuote.id,
      payload: { paymentAgreement: quotePaymentAgreement },
    });
  };

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
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            title="Excluir OS"
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-[#E2E8F0] text-[#94A3B8] hover:text-[#DC2626] hover:bg-red-50 print:hidden"
          >
            <Trash2 size={16} />
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

      {saveSuccessMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {saveSuccessMessage}
        </div>
      )}

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

      {tab === "equipe" && equipeForm && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 max-w-3xl">
          <h2 className="text-sm font-semibold text-[#1E293B] mb-4">Equipe da OS</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {(
              [
                ["generalResponsibleId", "Responsável geral"],
                ["checklistById", "Checklist por"],
                ["diagnosisById", "Diagnóstico por"],
                ["quoteById", "Orçamento por"],
                ["executionById", "Execução por"],
                ["finalizedById", "Finalização por"],
              ] as const
            ).map(([field, label]) => (
              <FormField key={field} label={label}>
                <select
                  className={selectClass}
                  value={equipeForm[field]}
                  onChange={(e) =>
                    setEquipeForm((prev) =>
                      prev ? { ...prev, [field]: e.target.value } : prev,
                    )
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
          <FormSaveBar
            label="Salvar equipe"
            onSave={saveEquipe}
            loading={saveMeta.isPending}
          />
        </div>
      )}

      {tab === "dados" && dadosForm && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-4">
            <FormField label="Status">
              <select
                className={selectClass}
                value={dadosForm.status}
                onChange={(e) =>
                  setDadosForm((prev) => (prev ? { ...prev, status: e.target.value } : prev))
                }
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {osStatusLabel(s)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Previsao de entrega">
              <DateTimeField
                value={dadosForm.estimatedAt}
                onChange={(estimatedAt) =>
                  setDadosForm((prev) => (prev ? { ...prev, estimatedAt } : prev))
                }
              />
            </FormField>
            <FormField label="Relato do cliente">
              <textarea
                className={`${inputClass} min-h-[80px] py-2`}
                value={dadosForm.complaint}
                onChange={(e) =>
                  setDadosForm((prev) => (prev ? { ...prev, complaint: e.target.value } : prev))
                }
              />
            </FormField>
            <FormField label="Diagnostico">
              <textarea
                className={`${inputClass} min-h-[80px] py-2`}
                value={dadosForm.diagnosis}
                onChange={(e) =>
                  setDadosForm((prev) => (prev ? { ...prev, diagnosis: e.target.value } : prev))
                }
              />
            </FormField>
            <FormField label="Observacoes internas">
              <textarea
                className={`${inputClass} min-h-[80px] py-2`}
                value={dadosForm.internalNotes}
                onChange={(e) =>
                  setDadosForm((prev) =>
                    prev ? { ...prev, internalNotes: e.target.value } : prev,
                  )
                }
              />
            </FormField>
          </div>
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
            <FormField label="KM na entrada">
              <input
                type="number"
                className={inputClass}
                value={dadosForm.entryKm}
                onChange={(e) =>
                  setDadosForm((prev) => (prev ? { ...prev, entryKm: e.target.value } : prev))
                }
              />
            </FormField>
            <FormField label="Box / elevador">
              <input
                className={inputClass}
                value={dadosForm.bay}
                onChange={(e) =>
                  setDadosForm((prev) => (prev ? { ...prev, bay: e.target.value } : prev))
                }
              />
            </FormField>
            <FormField label="Observações visíveis ao cliente">
              <textarea
                className={`${inputClass} min-h-[60px] py-2`}
                value={dadosForm.customerVisibleNotes}
                onChange={(e) =>
                  setDadosForm((prev) =>
                    prev ? { ...prev, customerVisibleNotes: e.target.value } : prev,
                  )
                }
              />
            </FormField>
            <FormField label="Pagamento combinado">
              <p className="text-xs text-[#94A3B8] mb-2">
                Lembrete do combinado com o cliente. Não registra cobrança no financeiro.
              </p>
              <textarea
                className={`${inputClass} min-h-[72px] py-2`}
                placeholder="Ex.: 50% à vista e 50% na entrega, PIX, 3x no cartão..."
                value={dadosForm.paymentAgreement}
                onChange={(e) =>
                  setDadosForm((prev) =>
                    prev ? { ...prev, paymentAgreement: e.target.value } : prev,
                  )
                }
              />
            </FormField>
            <div className="mt-6 pt-6 border-t border-[#F1F5F9]">
              <p className="text-sm font-semibold text-[#1E293B] mb-1">
                Manutenção preventiva pós-entrega
              </p>
              <p className="text-xs text-[#94A3B8] mb-4">
                Lembrete após entrega/execução — não é garantia. O sistema avisa a oficina e o cliente.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Revisão do serviço">
                  <select
                    className={selectClass}
                    value={dadosForm.revisionInterval}
                    onChange={(e) =>
                      setDadosForm((prev) =>
                        prev ? { ...prev, revisionInterval: e.target.value } : prev,
                      )
                    }
                  >
                    {MAINTENANCE_INTERVAL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Troca de óleo">
                  <select
                    className={selectClass}
                    value={dadosForm.oilChangeInterval}
                    onChange={(e) =>
                      setDadosForm((prev) =>
                        prev ? { ...prev, oilChangeInterval: e.target.value } : prev,
                      )
                    }
                  >
                    {MAINTENANCE_INTERVAL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="mt-8 text-sm text-red-600 hover:underline"
            >
              Excluir esta OS
            </button>
          </div>
          <div className="lg:col-span-2">
            <FormSaveBar
              label="Salvar dados da OS"
              onSave={saveDados}
              loading={saveMeta.isPending}
            />
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
              {canIncreaseQuote && (
                <button
                  type="button"
                  disabled={reopenSupplement.isPending}
                  onClick={() => {
                    if (!approvedQuote?.id) return;
                    reopenSupplement.mutate(approvedQuote.id);
                  }}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[#0F3D4C] text-white text-sm font-medium hover:bg-[#0a2d38] disabled:opacity-50"
                >
                  <Plus size={16} />
                  {reopenSupplement.isPending ? "Abrindo..." : "Aumentar orçamento"}
                </button>
              )}
              <button
                type="button"
                disabled={!canPrintQuote}
                onClick={() => printDocument("quote")}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[#0F3D4C] text-white text-sm font-medium hover:bg-[#0a2d38] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Printer size={16} />
                Imprimir orçamento
              </button>
              {activeQuote?.status === "PENDING" && activeQuote.id && pendingLineCount > 0 && (
                <button
                  type="button"
                  onClick={() => void shareQuoteLink(activeQuote.id)}
                  className="inline-flex items-center gap-1 h-10 px-3 rounded-lg border border-[#0E7490] text-sm text-[#0E7490] hover:bg-[#ECFEFF]"
                >
                  <Link2 size={16} />
                  {isSupplement ? "Enviar complemento" : "Link cliente"}
                </button>
              )}
              {activeQuote && activeQuote.status === "PENDING" && pendingLineCount > 0 && (
                <button
                  type="button"
                  disabled={approveQuote.isPending}
                  onClick={() => {
                    const msg = isSupplement
                      ? "Aprovar os itens novos do orçamento? Use quando o cliente aprovou fora do app."
                      : "Marcar orçamento como aprovado? Use quando o cliente aprovou fora do app.";
                    if (confirm(msg) && activeQuote.id) {
                      approveQuote.mutate(activeQuote.id);
                    }
                  }}
                  className="inline-flex items-center gap-1 h-10 px-3 rounded-lg bg-[#16A34A] text-white text-sm disabled:opacity-50"
                >
                  <Check size={16} />
                  {isSupplement ? "Aprovar itens novos" : "Aprovado"}
                </button>
              )}
              {activeQuote && activeQuote.status === "PENDING" && pendingLineCount > 0 && (
                <button
                  type="button"
                  disabled={rejectQuote.isPending}
                  onClick={() => {
                    const msg = isSupplement
                      ? "Recusar os itens novos? Eles serão removidos do orçamento."
                      : "Marcar orçamento como recusado? Use quando o cliente recusou fora do app.";
                    if (confirm(msg) && activeQuote.id) {
                      rejectQuote.mutate(activeQuote.id);
                    }
                  }}
                  className="inline-flex items-center gap-1 h-10 px-3 rounded-lg border border-red-300 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <X size={16} />
                  {isSupplement ? "Recusar itens novos" : "Recusado"}
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

            {isSupplement && pendingLineCount > 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Aguardando aprovação de {pendingLineCount} item(ns) novo(s). Os itens já aprovados
                permanecem liberados para execução.
              </div>
            )}

            {(supplementUnlocked || (canManageQuote && activeQuote?.status === "PENDING" && !isSupplement && pendingLineCount === 0)) && (
              <div className="mt-4 rounded-lg border border-[#0E7490]/30 bg-[#ECFEFF] px-4 py-3 text-sm text-[#0F3D4C]">
                Orçamento reaberto para complemento. Adicione os novos serviços ou peças abaixo.
              </div>
            )}

            {activeQuote && (
              <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
                <FormField label="Pagamento combinado (orçamento)">
                  <p className="text-xs text-[#94A3B8] mb-2">
                    Lembrete do combinado com o cliente. Não registra cobrança no financeiro.
                  </p>
                  <textarea
                    className={`${inputClass} min-h-[72px] py-2`}
                    placeholder="Ex.: 50% à vista e 50% na entrega, PIX, 3x no cartão..."
                    value={quotePaymentAgreement}
                    disabled={!canManageQuote}
                    onChange={(e) => setQuotePaymentAgreement(e.target.value)}
                  />
                </FormField>
                {canManageQuote && (
                  <FormSaveBar
                    label="Salvar pagamento combinado"
                    onSave={saveQuotePayment}
                    loading={saveQuoteMeta.isPending}
                  />
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div className="flex justify-between items-center px-5 py-3 border-b border-[#F1F5F9]">
              <p className="text-sm font-medium text-[#1E293B]">Serviços e peças do orçamento</p>
              {canEditQuoteItems && (
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
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Executor</th>
                  <th className="px-4 py-2 text-right">Comissão prev.</th>
                  {canEditQuoteItems && <th className="w-24" />}
                </tr>
              </thead>
              <tbody>
                {os.items.length === 0 && (
                  <tr>
                    <td
                      colSpan={canEditQuoteItems ? 9 : 8}
                      className="px-4 py-8 text-center text-[#94A3B8]"
                    >
                      Nenhum item no orçamento. Adicione serviços ou peças.
                    </td>
                  </tr>
                )}
                {os.items.map((item, itemIndex) => {
                  const line = getLineForItem(item, itemIndex, activeQuote);
                  const approvalStatus = line?.approved;
                  const quoteStatus = activeQuote?.status;
                  const editable = canEditQuoteItems && !itemLineApproved(item, itemIndex);
                  return (
                  <tr key={item.id} className="border-t border-[#F1F5F9]">
                    <td className="px-4 py-3">{item.description}</td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {itemTypeLabel(item.itemType)}
                    </td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(Number(item.unitPrice) * item.quantity)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={lineApprovalVariant(approvalStatus, quoteStatus)} />
                      <span className="ml-2 text-xs text-[#64748B]">
                        {lineApprovalLabel(approvalStatus, quoteStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#64748B] text-xs">
                      {item.itemType === "SERVICE"
                        ? item.executor?.name ?? os.executionBy?.name ?? "—"
                        : item.itemType === "PART"
                          ? item.soldBy?.name ?? "—"
                          : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-[#64748B]">
                      {isCommissionEligibleItemType(item.itemType) && item.expectedCommission != null
                        ? formatMoney(item.expectedCommission)
                        : "—"}
                    </td>
                    {editable && (
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
                    {canEditQuoteItems && !editable && <td className="px-4 py-3" />}
                  </tr>
                  );
                })}
              </tbody>
              {os.items.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[#0F3D4C] bg-[#F8FAFC]">
                    <td colSpan={canEditQuoteItems ? 7 : 6} className="px-4 py-3 text-right font-semibold">
                      Total do orçamento
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#0F3D4C]">
                      {formatMoney(quoteTotal)}
                    </td>
                    {canEditQuoteItems && <td />}
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
                      {itemTypeLabel(item.itemType)}
                    </td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(Number(item.unitPrice) * item.quantity)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">
                      {item.itemType === "SERVICE"
                        ? item.executor?.name ?? os.executionBy?.name ?? "—"
                        : item.itemType === "PART"
                          ? [item.soldBy?.name, item.appliedBy?.name].filter(Boolean).join(" / ") || "—"
                          : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-[#64748B]">
                      {isCommissionEligibleItemType(item.itemType) && item.expectedCommission != null
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
            {(os.checklistItems ?? []).map((item) => {
              const isTextOnly = CHECKLIST_TEXT_ONLY_LABELS.has(item.label);
              const draft = checklistDraft[item.id] ?? {
                result: item.result ?? "",
                notes: item.notes ?? "",
              };
              return (
                <div key={item.id} className="px-5 py-3 flex flex-wrap gap-3 items-center">
                  <span className="text-sm text-[#1E293B] flex-1 min-w-[200px]">{item.label}</span>
                  {isTextOnly ? (
                    <input
                      type="text"
                      className={`${inputClass} w-48`}
                      placeholder={item.label === "KM" ? "Ex: 45000" : "Ex: 1/2 tanque"}
                      value={draft.notes}
                      onChange={(e) =>
                        setChecklistDraft((prev) => ({
                          ...prev,
                          [item.id]: { ...draft, notes: e.target.value },
                        }))
                      }
                    />
                  ) : (
                    <select
                      className={`${selectClass} w-36`}
                      value={draft.result}
                      onChange={(e) =>
                        setChecklistDraft((prev) => ({
                          ...prev,
                          [item.id]: { ...draft, result: e.target.value },
                        }))
                      }
                    >
                      {CHECKLIST_RESULT_OPTIONS.map((o) => (
                        <option key={o.value || "empty"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
          <div className="px-5 pb-5">
            <FormSaveBar
              label="Salvar checklist"
              onSave={submitChecklist}
              loading={saveChecklist.isPending}
            />
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
                  itemType: e.target.value as ServiceOrderItemType,
                }))
              }
            >
              {SERVICE_ORDER_ITEM_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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
