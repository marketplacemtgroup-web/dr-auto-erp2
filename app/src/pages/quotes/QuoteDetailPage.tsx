import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Link2, Pencil, Plus, Printer, Trash2, X } from "lucide-react";
import ConfirmDialog from "../../components/modules/ConfirmDialog";
import PrintPortal from "../../components/print/PrintPortal";
import QuotePrintSheet, { buildQuotePrintData } from "../../components/quotes/QuotePrintSheet";
import StatusBadge from "../../components/StatusBadge";
import ProductSearchSelect from "../../components/inventory/ProductSearchSelect";
import OutsourcedServiceSearchSelect from "../../components/inventory/OutsourcedServiceSearchSelect";
import ServiceCatalogSearchSelect from "../../components/inventory/ServiceCatalogSearchSelect";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import ShareLinkDialog, { type ShareLinkDialogData } from "../../components/share/ShareLinkDialog";
import { api, type ServiceOrderItemRow } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import {
  itemCatalogLabel,
  itemTypeLabel,
  SERVICE_ORDER_ITEM_TYPE_OPTIONS,
  type ServiceOrderItemType,
} from "../../lib/itemType";
import { quoteStatusLabel, quoteStatusVariant } from "../../lib/service-order-status";
import { portalPublicQuoteUrl, routes } from "../../lib/routes";
import { applyUrlTemplate, defaultQuoteWhatsAppMessage, resolveOrganizationWhatsApp } from "../../lib/shareLink";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";
import { useOrganizationBranding } from "../../hooks/useOrganizationBranding";
import { printDocument } from "../../lib/print";

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [itemDrawer, setItemDrawer] = useState(false);
  const [shareDialog, setShareDialog] = useState<ShareLinkDialogData | null>(null);
  const [deleteQuoteOpen, setDeleteQuoteOpen] = useState(false);
  const [deleteItemTarget, setDeleteItemTarget] = useState<ServiceOrderItemRow | null>(null);
  const [editingItem, setEditingItem] = useState<ServiceOrderItemRow | null>(null);
  const [itemForm, setItemForm] = useState({
    description: "",
    itemType: "SERVICE" as ServiceOrderItemType,
    quantity: "1",
    unitPrice: "",
    unitCost: "",
    productId: "",
    catalogItemId: "",
    outsourcedServiceId: "",
  });
  const [paymentAgreement, setPaymentAgreement] = useState("");
  const [freeTextEnabled, setFreeTextEnabled] = useState(false);
  const [freeTextContent, setFreeTextContent] = useState("");
  const [freeTextAmount, setFreeTextAmount] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const { data: quote, isLoading, error } = useApiQuery(
    ["quote", id ?? ""],
    (t) => api.quote(t, id!),
    !!id,
  );

  const serviceOrderId = quote?.serviceOrder.id ?? "";

  const { data: attachmentPage } = useApiQuery(
    ["service-order-attachments", serviceOrderId],
    (t) => api.listServiceOrderAttachments(t, serviceOrderId, { limit: 100 }),
    !!serviceOrderId,
  );

  const org = useOrganizationBranding();

  useEffect(() => {
    if (quote?.status === "APPROVED" && serviceOrderId) {
      navigate(routes.ordemDeServicoDetalhe(serviceOrderId), { replace: true });
    }
  }, [quote?.status, serviceOrderId, navigate]);

  useEffect(() => {
    setPaymentAgreement(quote?.paymentAgreement ?? "");
    setFreeTextEnabled(quote?.freeTextEnabled ?? false);
    setFreeTextContent(quote?.freeTextContent ?? "");
    setFreeTextAmount(
      quote?.freeTextAmount != null && quote.freeTextAmount !== ""
        ? String(quote.freeTextAmount)
        : "",
    );
  }, [
    quote?.id,
    quote?.paymentAgreement,
    quote?.freeTextEnabled,
    quote?.freeTextContent,
    quote?.freeTextAmount,
  ]);

  const canEdit = quote?.status === "PENDING" || quote?.status === "DRAFT";

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["quote", id] });
    queryClient.invalidateQueries({ queryKey: ["quotes"] });
    if (serviceOrderId) {
      queryClient.invalidateQueries({ queryKey: ["service-order", serviceOrderId] });
    }
  };

  const resetItemForm = () => {
    setEditingItem(null);
    setItemForm({
      description: "",
      itemType: "SERVICE",
      quantity: "1",
      unitPrice: "",
      unitCost: "",
      productId: "",
      catalogItemId: "",
      outsourcedServiceId: "",
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
      unitCost: item.unitCost != null ? String(item.unitCost) : "",
      productId: item.product?.id ?? "",
      catalogItemId: item.catalogItem?.id ?? "",
      outsourcedServiceId: item.outsourcedService?.id ?? "",
    });
    setItemDrawer(true);
  };

  const saveItem = useMutation({
    mutationFn: () => {
      const hasCost =
        itemForm.itemType === "PART" || itemForm.itemType === "THIRD_PARTY";
      const unitCostValue =
        hasCost && itemForm.unitCost !== ""
          ? Number(itemForm.unitCost)
          : undefined;
      const payload = {
        description: itemForm.description,
        itemType: itemForm.itemType,
        quantity: Number(itemForm.quantity) || 1,
        unitPrice: Number(itemForm.unitPrice),
        ...(unitCostValue !== undefined ? { unitCost: unitCostValue } : {}),
      };
      if (editingItem) {
        return api.updateServiceOrderItem(token!, serviceOrderId, editingItem.id, {
          ...payload,
          outsourcedServiceId:
            itemForm.itemType === "THIRD_PARTY" ? itemForm.outsourcedServiceId || null : null,
        });
      }
      return api.addServiceOrderItem(token!, serviceOrderId, {
        ...payload,
        productId: itemForm.itemType === "PART" ? itemForm.productId || undefined : undefined,
        catalogItemId: itemForm.itemType === "SERVICE" ? itemForm.catalogItemId || undefined : undefined,
        outsourcedServiceId:
          itemForm.itemType === "THIRD_PARTY"
            ? itemForm.outsourcedServiceId || undefined
            : undefined,
      });
    },
    onSuccess: () => {
      invalidate();
      setItemDrawer(false);
      resetItemForm();
    },
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => api.removeServiceOrderItem(token!, serviceOrderId, itemId),
    onSuccess: invalidate,
  });

  const approveQuote = useMutation({
    mutationFn: () => api.approveQuote(token!, id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      navigate(routes.ordemDeServicoDetalhe(serviceOrderId));
    },
  });

  const rejectQuote = useMutation({
    mutationFn: () => api.rejectQuote(token!, id!),
    onSuccess: () => {
      invalidate();
      navigate(routes.orcamentos);
    },
  });

  const deleteQuote = useMutation({
    mutationFn: () => api.deleteQuote(token!, id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      navigate(routes.orcamentos);
    },
  });

  const saveQuoteMeta = useMutation({
    mutationFn: (payload: Parameters<typeof api.updateQuote>[2]) =>
      api.updateQuote(token!, id!, payload),
    onSuccess: () => {
      invalidate();
      setSaveMessage("Orçamento salvo.");
      window.setTimeout(() => setSaveMessage(null), 3000);
    },
  });

  const saveQuotePayment = () => {
    if (!canEdit) return;
    saveQuoteMeta.mutate({
      paymentAgreement,
      freeTextEnabled,
      freeTextContent: freeTextEnabled ? freeTextContent : "",
      freeTextAmount: freeTextEnabled ? Number(freeTextAmount) || 0 : null,
    });
  };

  async function shareQuoteLink() {
    if (!token || !id || !quote) return;
    try {
      const link = await api.createQuoteShareLink(token, id);
      const url = portalPublicQuoteUrl(link.token);
      if (!url.startsWith("http")) {
        alert("Configure VITE_PORTAL_URL no .env (URL do portal do cliente) para gerar links válidos.");
        return;
      }
      const customer = quote.serviceOrder.vehicle.customer;
      const whatsappMessage = link.whatsappMessage
        ? applyUrlTemplate(link.whatsappMessage, url)
        : defaultQuoteWhatsAppMessage({
            customerName: customer.name,
            plate: quote.serviceOrder.vehicle.plate,
            quoteNumber: quote.number,
            url,
          });
      setShareDialog({
        title: "Link do orçamento",
        subtitle: `${customer.name} · ${quote.serviceOrder.vehicle.plate}`,
        url,
        expiresAt: link.expiresAt,
        whatsappMessage,
        whatsappPhone: resolveOrganizationWhatsApp(),
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao gerar link");
    }
  }

  if (isLoading && !quote) {
    return <main className="px-6 pb-8 text-sm text-[#64748B]">Carregando orçamento...</main>;
  }

  if (error || !quote) {
    return (
      <main className="px-6 pb-8">
        <p className="text-red-600 text-sm">
          {error instanceof Error ? error.message : "Orçamento não encontrado."}
        </p>
        <Link to={routes.orcamentos} className="text-[#0E7490] text-sm mt-2 inline-block">
          Voltar
        </Link>
      </main>
    );
  }

  if (quote.status === "APPROVED") {
    return <main className="px-6 pb-8 text-sm text-[#64748B]">Redirecionando para ordem de serviço...</main>;
  }

  const items = quote.serviceOrder.items ?? [];
  const vehicle = quote.serviceOrder.vehicle;
  const vehicleLabel = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");

  return (
    <>
    <main className="px-6 pb-8 print:hidden">
      <Link
        to={routes.orcamentos}
        className="inline-flex items-center gap-1 text-sm text-[#64748B] hover:text-[#0E7490] mb-4"
      >
        <ArrowLeft size={16} />
        Voltar para orçamentos
      </Link>

      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold text-[#1E293B]">
              Orçamento #{quote.number ?? "—"}
            </h1>
            <p className="text-[13px] text-[#64748B] mt-1">
              {vehicle.customer.name} — {vehicle.plate}
              {vehicleLabel ? ` · ${vehicleLabel}` : ""}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge variant={quoteStatusVariant(quote.status)} />
              <span className="text-sm text-[#64748B]">{quoteStatusLabel(quote.status)}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs uppercase tracking-wide text-[#64748B]">Total do orçamento</p>
            <p className="text-2xl font-bold text-[#0F3D4C] tabular-nums">
              {formatMoney(quote.amount)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#F1F5F9]">
          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => printDocument("quote")}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[#0F3D4C] text-white text-sm font-medium hover:bg-[#0a2d38] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer size={16} />
            Imprimir orçamento
          </button>
          {quote.status === "PENDING" && (
            <button
              type="button"
              onClick={() => void shareQuoteLink()}
              className="inline-flex items-center gap-1 h-10 px-3 rounded-lg border border-[#0E7490] text-sm text-[#0E7490] hover:bg-[#ECFEFF]"
            >
              <Link2 size={16} />
              Link cliente
            </button>
          )}
          {canEdit && (
            <>
              <button
                type="button"
                disabled={approveQuote.isPending}
                onClick={() => {
                  if (
                    confirm(
                      "Marcar como aprovado? A OS será liberada automaticamente para execução.",
                    )
                  ) {
                    approveQuote.mutate();
                  }
                }}
                className="inline-flex items-center gap-1 h-10 px-3 rounded-lg bg-[#16A34A] text-white text-sm disabled:opacity-50"
              >
                <Check size={16} />
                Aprovado
              </button>
              <button
                type="button"
                disabled={rejectQuote.isPending}
                onClick={() => {
                  if (confirm("Marcar orçamento como recusado?")) {
                    rejectQuote.mutate();
                  }
                }}
                className="inline-flex items-center gap-1 h-10 px-3 rounded-lg border border-red-300 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <X size={16} />
                Recusado
              </button>
              <button
                type="button"
                onClick={() => setDeleteQuoteOpen(true)}
                className="inline-flex items-center gap-1 h-10 px-3 rounded-lg border border-red-300 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} />
                Excluir
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-4 py-3 mb-5 text-sm text-[#92400E]">
        O cliente aprova pelo app ou portal. Ao aprovar, o orçamento sai desta tela e a ordem de
        serviço é liberada automaticamente.
      </div>

      {saveMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {saveMessage}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 mb-5">
        <div className="mb-5 pb-5 border-b border-[#F1F5F9]">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={freeTextEnabled}
              disabled={!canEdit}
              onChange={(e) => setFreeTextEnabled(e.target.checked)}
            />
            <span>
              <span className="text-sm font-medium text-[#1E293B] block">
                Orçamento em texto livre (sem cadastrar peças no estoque)
              </span>
              <span className="text-xs text-[#94A3B8]">
                Descreva o orçamento em texto e informe um valor fechado. Não movimenta estoque. Se o
                cliente aprovar, cadastre as peças depois em Compras.
              </span>
            </span>
          </label>
          {freeTextEnabled && (
            <div className="mt-4 space-y-3">
              <FormField label="Descrição do orçamento">
                <textarea
                  className={`${inputClass} min-h-[120px] py-2`}
                  placeholder="Liste peças e serviços necessários..."
                  value={freeTextContent}
                  disabled={!canEdit}
                  onChange={(e) => setFreeTextContent(e.target.value)}
                />
              </FormField>
              <FormField label="Valor fechado (R$)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  placeholder="0,00"
                  value={freeTextAmount}
                  disabled={!canEdit}
                  onChange={(e) => setFreeTextAmount(e.target.value)}
                />
              </FormField>
            </div>
          )}
        </div>
        <FormField label="Forma de Pagamento">
          <p className="text-xs text-[#94A3B8] mb-2">
            Lembrete da forma de pagamento combinada com o cliente. Não registra cobrança no financeiro.
          </p>
          <textarea
            className={`${inputClass} min-h-[72px] py-2`}
            placeholder="Ex.: 50% à vista e 50% na entrega, PIX, 3x no cartão..."
            value={paymentAgreement}
            disabled={!canEdit}
            onChange={(e) => setPaymentAgreement(e.target.value)}
          />
        </FormField>
        {canEdit && (
          <div className="flex justify-end pt-4 mt-2 border-t border-[#F1F5F9]">
            <button
              type="button"
              disabled={saveQuoteMeta.isPending}
              onClick={saveQuotePayment}
              className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-[#0F3D4C] text-white text-sm font-medium hover:bg-[#0a2d38] disabled:opacity-50"
            >
              {saveQuoteMeta.isPending ? "Salvando..." : "Salvar orçamento"}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        <div className="flex justify-between items-center px-5 py-3 border-b border-[#F1F5F9]">
          <p className="text-sm font-medium text-[#1E293B]">Serviços e peças</p>
          {canEdit && (
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
              {canEdit && <th className="w-32" />}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !freeTextEnabled && (
              <tr>
                <td
                  colSpan={canEdit ? 6 : 5}
                  className="px-4 py-8 text-center text-[#94A3B8]"
                >
                  Adicione serviços e peças ou use o orçamento em texto livre acima.
                </td>
              </tr>
            )}
            {items.length === 0 && freeTextEnabled && (
              <tr>
                <td
                  colSpan={canEdit ? 6 : 5}
                  className="px-4 py-8 text-center text-[#64748B] whitespace-pre-wrap"
                >
                  {freeTextContent.trim() || "Preencha a descrição do orçamento em texto livre."}
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-t border-[#F1F5F9]">
                <td className="px-4 py-3">
                  <p>{item.description}</p>
                  {itemCatalogLabel(item) ? (
                    <p className="text-xs text-[#94A3B8] mt-0.5">{itemCatalogLabel(item)}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-[#64748B]">
                  {itemTypeLabel(item.itemType)}
                </td>
                <td className="px-4 py-3 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-right">{formatMoney(item.unitPrice)}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatMoney(Number(item.unitPrice) * item.quantity)}
                </td>
                {canEdit && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditItem(item)}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[#0E7490] hover:bg-[#ECFEFF] text-xs font-medium"
                        title="Editar"
                      >
                        <Pencil size={14} />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteItemTarget(item)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-[#0F3D4C] bg-[#F8FAFC]">
                <td colSpan={canEdit ? 4 : 4} className="px-4 py-3 text-right font-semibold">
                  Total do orçamento
                </td>
                <td className="px-4 py-3 text-right font-bold text-[#0F3D4C]">
                  {formatMoney(quote.amount)}
                </td>
                {canEdit && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <FormDrawer
        open={itemDrawer}
        title={editingItem ? "Editar item" : "Novo item no orçamento"}
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
          <FormField label="Serviço do catálogo">
            <ServiceCatalogSearchSelect
              value={itemForm.catalogItemId}
              onChange={(catalogItemId, item) =>
                setItemForm((f) => ({
                  ...f,
                  catalogItemId,
                  description: item ? item.name : f.description,
                  unitPrice: item ? String(item.defaultPrice) : f.unitPrice,
                }))
              }
            />
          </FormField>
        )}
        {!editingItem && itemForm.itemType === "PART" && (
          <FormField label="Produto (estoque)">
            <ProductSearchSelect
              value={itemForm.productId}
              onChange={(productId, product) =>
                setItemForm((f) => ({
                  ...f,
                  productId,
                  description: product ? product.name : f.description,
                  unitPrice: product ? String(product.salePrice) : f.unitPrice,
                  unitCost: product ? String(product.costPrice) : f.unitCost,
                }))
              }
            />
          </FormField>
        )}
        {itemForm.itemType === "THIRD_PARTY" && (
          <FormField label="Serviço terceirizado (cadastro)">
            <OutsourcedServiceSearchSelect
              value={itemForm.outsourcedServiceId}
              onChange={(outsourcedServiceId, item) =>
                setItemForm((f) => ({
                  ...f,
                  outsourcedServiceId,
                  description: item ? item.name : f.description,
                  unitPrice: item ? String(item.salePrice) : f.unitPrice,
                  unitCost: item ? String(item.costPrice) : f.unitCost,
                }))
              }
            />
            <p className="text-xs text-[#94A3B8] mt-2">
              <Link to={routes.terceirizados} className="text-[#0E7490] hover:underline">
                Cadastrar ou gerenciar terceirizados
              </Link>
            </p>
          </FormField>
        )}
        <FormField label="Descrição *">
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
        {(itemForm.itemType === "PART" || itemForm.itemType === "THIRD_PARTY") && (
          <FormField label="Valor de custo (R$)">
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={itemForm.unitCost}
              onChange={(e) => setItemForm((f) => ({ ...f, unitCost: e.target.value }))}
            />
            <p className="text-xs text-[#94A3B8] mt-1">
              Custo desta peça neste orçamento. Não altera o cadastro do estoque.
            </p>
          </FormField>
        )}
        <FormField label="Valor de venda (R$) *">
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
    </main>
    <PrintPortal>
      <QuotePrintSheet
        quote={buildQuotePrintData(
          {
            number: quote.serviceOrder.number,
            createdAt: quote.createdAt,
            totalAmount: quote.amount,
            complaint: quote.serviceOrder.complaint,
            vehicle: quote.serviceOrder.vehicle,
            items,
            attachments: attachmentPage?.data,
          },
          quote,
        )}
        org={org}
      />
    </PrintPortal>
    <ShareLinkDialog data={shareDialog} onClose={() => setShareDialog(null)} />
    <ConfirmDialog
      open={deleteQuoteOpen}
      title="Excluir orçamento"
      message={`Confirma exclusão do orçamento #${quote.number ?? "—"}? Esta ação não pode ser desfeita.`}
      loading={deleteQuote.isPending}
      onCancel={() => setDeleteQuoteOpen(false)}
      onConfirm={() => deleteQuote.mutate()}
    />
    <ConfirmDialog
      open={!!deleteItemTarget}
      title="Excluir item"
      message={`Remover "${deleteItemTarget?.description ?? "este item"}" do orçamento?`}
      loading={removeItem.isPending}
      onCancel={() => setDeleteItemTarget(null)}
      onConfirm={() => {
        if (!deleteItemTarget) return;
        removeItem.mutate(deleteItemTarget.id, {
          onSuccess: () => setDeleteItemTarget(null),
        });
      }}
    />
    </>
  );
}
