import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { api, type ServiceOrderItemRow } from "../../lib/api";
import { formatMoney, formatDateTime } from "../../lib/format";
import { FormField, inputClass, selectClass } from "../modules/FormDrawer";
import { useAuthToken } from "../../hooks/useApiQuery";
import { QUERY_GC_TIME_MS, QUERY_STALE_TIME_MS } from "../../lib/query-cache";

type Props = {
  open: boolean;
  serviceOrderId: string;
  item: ServiceOrderItemRow | null;
  onClose: () => void;
  onSaved: () => void;
};

const COST_FIELD_LABELS: Record<string, string> = {
  ACTUAL_UNIT_COST: "Custo real",
  ACTUAL_BRAND: "Marca comprada",
  ACTUAL_DESCRIPTION: "Peça comprada",
  ACTUAL_SUPPLIER: "Fornecedor",
  PURCHASE_ORDER_ITEM: "Compra vinculada",
  PURCHASE_DATE: "Data da compra",
  PURCHASE_PAYMENT_METHOD: "Forma de pagamento",
  INTERNAL_NOTES: "Observação",
};

function isPurchasedPartFlow(item: ServiceOrderItemRow) {
  return (
    !!item.isQuickPart ||
    item.product?.status === "PROVISIONAL" ||
    !!item.quickPartCode
  );
}

export default function InternalCostDrawer({
  open,
  serviceOrderId,
  item,
  onClose,
  onSaved,
}: Props) {
  const token = useAuthToken();
  const [actualUnitCost, setActualUnitCost] = useState("");
  const [actualBrand, setActualBrand] = useState("");
  const [actualDescription, setActualDescription] = useState("");
  const [actualSupplierId, setActualSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-select", token],
    queryFn: async () => {
      const body = await api.suppliers(token!, undefined, undefined, 1, 200);
      return Array.isArray(body) ? body : body.data;
    },
    enabled: open && !!token,
    staleTime: QUERY_STALE_TIME_MS,
    gcTime: QUERY_GC_TIME_MS,
  });

  useEffect(() => {
    if (!item) return;
    setActualUnitCost(
      item.actualUnitCost != null
        ? String(item.actualUnitCost)
        : item.unitCost != null
          ? String(item.unitCost)
          : "",
    );
    setActualBrand(item.actualBrand ?? item.partBrand ?? "");
    setActualDescription(item.actualDescription ?? item.product?.name ?? item.description ?? "");
    setActualSupplierId(item.actualSupplier?.id ?? "");
    setPurchaseDate(item.purchaseDate ? item.purchaseDate.slice(0, 10) : "");
    setPurchasePaymentMethod(item.purchasePaymentMethod ?? "");
    setInternalNotes(item.internalNotes ?? "");
    setNote("");
    setError(null);
  }, [item, open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !item) return null;

  const purchasedPart = isPurchasedPartFlow(item);
  const plannedCost = Number(item.unitCost ?? 0);
  const revenue =
    Number(item.unitPrice) * item.quantity - Number(item.discount ?? 0);
  const previewActual = Number(actualUnitCost) || plannedCost;
  const plannedProfit = revenue - plannedCost * item.quantity;
  const actualProfit = revenue - previewActual * item.quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateServiceOrderItemInternalCost(token, serviceOrderId, item.id, {
        actualUnitCost: actualUnitCost !== "" ? Number(actualUnitCost) : null,
        actualBrand: actualBrand.trim() || null,
        ...(purchasedPart
          ? { actualDescription: actualDescription.trim() || null }
          : {}),
        actualSupplierId: actualSupplierId || null,
        purchaseDate: purchaseDate || null,
        purchasePaymentMethod: purchasePaymentMethod.trim() || null,
        internalNotes: internalNotes.trim() || null,
        note: note.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar ajuste");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fechar"
        onClick={onClose}
      />
      <aside className="relative w-full max-w-lg bg-white h-full shadow-xl flex flex-col">
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-lg font-semibold text-[#0F3D4C]">
              {purchasedPart ? "Atualizar peça comprada" : "Ajustar custo interno"}
            </h2>
            <p className="text-sm text-[#64748B] mt-0.5">{item.description}</p>
            {item.quickPartCode ? (
              <p className="text-xs text-[#94A3B8] mt-1">{item.quickPartCode}</p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-[#F1F5F9]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-4 space-y-2">
            <p className="text-xs font-semibold text-[#64748B] uppercase">Comercial (bloqueado)</p>
            <div className="flex justify-between text-sm">
              <span className="text-[#64748B]">Descrição no orçamento</span>
              <span className="font-medium text-right max-w-[55%]">{item.description}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#64748B]">Preço aprovado ao cliente</span>
              <span className="font-medium">{formatMoney(item.unitPrice)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#64748B]">Total aprovado</span>
              <span className="font-medium">{formatMoney(revenue)}</span>
            </div>
          </div>

          {purchasedPart ? (
            <p className="text-xs text-[#64748B] leading-relaxed">
              Troque marca, modelo ou custo da peça que realmente entrou. O valor aprovado pelo
              cliente permanece. O produto provisório no estoque é atualizado junto.
            </p>
          ) : null}

          {purchasedPart ? (
            <FormField label="Peça efetivamente comprada">
              <input
                className={inputClass}
                value={actualDescription}
                onChange={(e) => setActualDescription(e.target.value)}
                placeholder="Ex.: pastilha freio dianteira marca Z"
              />
            </FormField>
          ) : null}

          <FormField label="Custo previsto (readonly)">
            <input className={inputClass} value={formatMoney(plannedCost)} disabled readOnly />
          </FormField>

          <FormField label="Novo custo real">
            <input
              className={inputClass}
              type="number"
              min={0}
              step="0.01"
              value={actualUnitCost}
              onChange={(e) => setActualUnitCost(e.target.value)}
            />
          </FormField>

          <FormField label="Marca comprada">
            <input
              className={inputClass}
              value={actualBrand}
              onChange={(e) => setActualBrand(e.target.value)}
            />
          </FormField>

          <FormField label="Fornecedor">
            <select
              className={selectClass}
              value={actualSupplierId}
              onChange={(e) => setActualSupplierId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {(suppliers ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.tradeName || s.legalName}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Data da compra">
              <input
                type="date"
                className={inputClass}
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </FormField>
            <FormField label="Forma de pagamento">
              <input
                className={inputClass}
                value={purchasePaymentMethod}
                onChange={(e) => setPurchasePaymentMethod(e.target.value)}
                placeholder="PIX, boleto..."
              />
            </FormField>
          </div>

          <FormField label="Observação operacional">
            <textarea
              className={`${inputClass} min-h-[72px] py-2`}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
            />
          </FormField>

          <FormField label="Motivo deste ajuste (histórico)">
            <input
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex.: peça original com defeito, trocada por marca Z"
            />
          </FormField>

          <div className="rounded-lg border border-[#E2E8F0] p-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-[#94A3B8]">Lucro previsto</p>
              <p className="font-semibold text-[#0F3D4C]">{formatMoney(plannedProfit)}</p>
            </div>
            <div>
              <p className="text-xs text-[#94A3B8]">Lucro real</p>
              <p className="font-semibold text-[#0F3D4C]">{formatMoney(actualProfit)}</p>
            </div>
            <div>
              <p className="text-xs text-[#94A3B8]">Diferença de custo</p>
              <p className="font-medium">
                {formatMoney((previewActual - plannedCost) * item.quantity)}
              </p>
            </div>
          </div>

          {item.costHistory && item.costHistory.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-[#64748B] uppercase mb-2">Histórico</p>
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {item.costHistory.map((h) => (
                  <li key={h.id} className="text-xs border-l-2 border-[#0E7490] pl-3 py-1">
                    <p className="text-[#64748B]">
                      {formatDateTime(h.createdAt)}
                      {h.user?.name ? ` — ${h.user.name}` : ""}
                    </p>
                    <p className="text-[#1E293B]">
                      {COST_FIELD_LABELS[h.field] ?? h.field}: {h.oldValue ?? "—"} →{" "}
                      {h.newValue ?? "—"}
                    </p>
                    {h.note ? <p className="text-[#94A3B8] italic">{h.note}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>

        <div className="px-5 py-4 border-t border-[#E2E8F0] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-lg border border-[#E2E8F0] text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            onClick={handleSubmit}
            className="h-10 px-5 rounded-lg bg-[#0F3D4C] text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Salvando..." : purchasedPart ? "Salvar peça comprada" : "Salvar ajuste"}
          </button>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
