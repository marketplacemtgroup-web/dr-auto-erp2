import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Link2, Pencil, Plus, Printer, Trash2, X } from "lucide-react";
import PrintPortal from "../../components/print/PrintPortal";
import QuotePrintSheet, { buildQuotePrintData } from "../../components/quotes/QuotePrintSheet";
import StatusBadge from "../../components/StatusBadge";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import ShareLinkDialog, { type ShareLinkDialogData } from "../../components/share/ShareLinkDialog";
import { api, type ServiceOrderItemRow } from "../../lib/api";
import { formatMoney } from "../../lib/format";
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
  const [editingItem, setEditingItem] = useState<ServiceOrderItemRow | null>(null);
  const [itemForm, setItemForm] = useState({
    description: "",
    itemType: "SERVICE" as "SERVICE" | "PART",
    quantity: "1",
    unitPrice: "",
    productId: "",
    catalogItemId: "",
  });

  const { data: quote, isLoading, error } = useApiQuery(
    ["quote", id ?? ""],
    (t) => api.quote(t, id!),
    !!id,
  );

  const { data: products } = useApiQuery(["products-all"], (t) => api.products(t));
  const { data: catalog } = useApiQuery(["service-catalog-all"], (t) => api.serviceCatalog(t));
  const org = useOrganizationBranding();

  const serviceOrderId = quote?.serviceOrder.id ?? "";

  useEffect(() => {
    if (quote?.status === "APPROVED" && serviceOrderId) {
      navigate(routes.ordemDeServicoDetalhe(serviceOrderId), { replace: true });
    }
  }, [quote?.status, serviceOrderId, navigate]);
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
      productId: "",
      catalogItemId: "",
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
      };
      if (editingItem) {
        return api.updateServiceOrderItem(token!, serviceOrderId, editingItem.id, payload);
      }
      return api.addServiceOrderItem(token!, serviceOrderId, {
        ...payload,
        productId: itemForm.productId || undefined,
        catalogItemId: itemForm.catalogItemId || undefined,
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

  const saveQuoteMeta = useMutation({
    mutationFn: (payload: Parameters<typeof api.updateQuote>[2]) =>
      api.updateQuote(token!, id!, payload),
    onSuccess: invalidate,
  });

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
            </>
          )}
        </div>
      </div>

      <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-4 py-3 mb-5 text-sm text-[#92400E]">
        O cliente aprova pelo app ou portal. Ao aprovar, o orçamento sai desta tela e a ordem de
        serviço é liberada automaticamente.
      </div>

      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 mb-5">
        <FormField label="Pagamento combinado">
          <p className="text-xs text-[#94A3B8] mb-2">
            Lembrete do combinado com o cliente. Não registra cobrança no financeiro.
          </p>
          <textarea
            className={`${inputClass} min-h-[72px] py-2`}
            placeholder="Ex.: 50% à vista e 50% na entrega, PIX, 3x no cartão..."
            defaultValue={quote.paymentAgreement ?? ""}
            disabled={!canEdit}
            onBlur={(e) => {
              if (!canEdit) return;
              if (e.target.value !== (quote.paymentAgreement ?? "")) {
                saveQuoteMeta.mutate({ paymentAgreement: e.target.value });
              }
            }}
          />
        </FormField>
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
              {canEdit && <th className="w-24" />}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={canEdit ? 6 : 5}
                  className="px-4 py-8 text-center text-[#94A3B8]"
                >
                  Adicione serviços e peças para enviar ao cliente.
                </td>
              </tr>
            )}
            {items.map((item) => (
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
                {canEdit && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditItem(item)}
                        className="p-1.5 text-[#0E7490] hover:bg-[#ECFEFF] rounded"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem.mutate(item.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
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
          <FormField label="Serviço do catálogo">
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
        <FormField label="Valor unitário (R$) *">
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
          },
          quote,
        )}
        org={org}
      />
    </PrintPortal>
    <ShareLinkDialog data={shareDialog} onClose={() => setShareDialog(null)} />
    </>
  );
}
