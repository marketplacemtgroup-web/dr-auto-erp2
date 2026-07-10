import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Search, X } from "lucide-react";
import { api, type ProductRow } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { inputClass } from "../modules/FormDrawer";
import { useAuthToken } from "../../hooks/useApiQuery";
import { QUERY_GC_TIME_MS, QUERY_STALE_TIME_MS } from "../../lib/query-cache";

export type QuickPartDraft = {
  description: string;
  partBrand: string;
  quantity: string;
  unitCost: string;
  unitPrice: string;
  discount: string;
  internalNotes: string;
  productId?: string;
};

const emptyDraft = (): QuickPartDraft => ({
  description: "",
  partBrand: "",
  quantity: "1",
  unitCost: "",
  unitPrice: "",
  discount: "0",
  internalNotes: "",
  productId: undefined,
});

type Props = {
  onSave: (draft: QuickPartDraft) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
};

function FieldLabel({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <span
      className={`block text-[10px] font-medium text-[#64748B] mb-1 leading-tight ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </span>
  );
}

export function QuickPartInlineRow({ onSave, onCancel, saving }: Props) {
  const token = useAuthToken();
  const searchRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<QuickPartDraft>(emptyDraft);
  const [debouncedDesc, setDebouncedDesc] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedDesc(draft.description.trim()), 250);
    return () => window.clearTimeout(t);
  }, [draft.description]);

  useEffect(() => {
    if (!searchOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [searchOpen]);

  const { data: similar, isFetching: searching } = useQuery({
    queryKey: ["quick-part-similar", debouncedDesc, token],
    queryFn: async () => {
      const body = await api.products(token!, debouncedDesc, false, 1, 8);
      const rows = Array.isArray(body) ? body : body.data;
      return rows as ProductRow[];
    },
    enabled: !!token && debouncedDesc.length >= 2 && !draft.productId,
    staleTime: QUERY_STALE_TIME_MS,
    gcTime: QUERY_GC_TIME_MS,
  });

  const results = similar ?? [];

  const total = useMemo(() => {
    const qty = Number(draft.quantity) || 0;
    const price = Number(draft.unitPrice) || 0;
    const disc = Number(draft.discount) || 0;
    return Math.max(0, qty * price - disc);
  }, [draft]);

  const selectProduct = (product: ProductRow) => {
    setDraft((d) => ({
      ...d,
      productId: product.id,
      description: product.name,
      partBrand: product.brand ?? d.partBrand,
      unitCost: String(product.costPrice ?? ""),
      unitPrice: String(product.salePrice ?? ""),
    }));
    setSearchOpen(false);
  };

  const clearProductLink = () => {
    setDraft((d) => ({ ...d, productId: undefined }));
  };

  const handleSave = async () => {
    if (!draft.description.trim()) return;
    await onSave({
      ...draft,
      description: draft.description.trim(),
      productId: draft.productId || undefined,
    });
    setDraft(emptyDraft());
  };

  return (
    <>
      <tr className="border-t border-[#E2E8F0] bg-[#FFFBEB]/40">
        <td className="px-2 py-2 align-top">
          <FieldLabel>Código</FieldLabel>
          <span className="text-xs text-[#94A3B8]">
            {draft.productId ? "estoque" : "auto"}
          </span>
        </td>
        <td className="px-2 py-2 align-top">
          <FieldLabel>Peça (busca ou digite o nome)</FieldLabel>
          {draft.productId ? (
            <div className="rounded-lg border border-[#0E7490]/30 bg-[#ECFEFF] px-2 py-1.5 flex items-start justify-between gap-1">
              <p className="text-sm font-medium text-[#0F3D4C] truncate">{draft.description}</p>
              <button
                type="button"
                onClick={clearProductLink}
                className="p-0.5 text-[#64748B] hover:text-[#0F3D4C] shrink-0"
                title="Usar nome digitado (sem vincular)"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div ref={searchRef} className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none"
              />
              <input
                className={`${inputClass} pl-8`}
                value={draft.description}
                placeholder="Buscar no estoque ou digitar nome novo..."
                onChange={(e) => {
                  setDraft((d) => ({ ...d, description: e.target.value, productId: undefined }));
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                autoComplete="off"
              />
              {searchOpen && debouncedDesc.length >= 2 ? (
                <div className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-[#E2E8F0] bg-white shadow-lg overflow-hidden">
                  {searching ? (
                    <p className="px-3 py-2 text-xs text-[#94A3B8]">Buscando...</p>
                  ) : results.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-[#64748B]">
                      Não encontrado. Ao salvar, usa o nome digitado e cria no estoque na aprovação.
                    </p>
                  ) : (
                    <ul className="max-h-44 overflow-y-auto py-1">
                      {results.map((product) => {
                        const avail = product.stock - (product.reservedStock ?? 0);
                        return (
                          <li key={product.id}>
                            <button
                              type="button"
                              onClick={() => selectProduct(product)}
                              className="w-full text-left px-3 py-2 hover:bg-[#F0F9FF]"
                            >
                              <p className="text-sm font-medium text-[#1E293B] truncate">
                                {product.name}
                              </p>
                              <p className="text-[11px] text-[#64748B]">
                                Disp.: {avail}
                                {product.sku ? ` · ${product.sku}` : ""}
                                {" · "}
                                {formatMoney(product.salePrice)}
                              </p>
                            </button>
                          </li>
                        );
                      })}
                      <li className="border-t border-[#F1F5F9]">
                        <button
                          type="button"
                          onClick={() => setSearchOpen(false)}
                          className="w-full text-left px-3 py-2 text-xs text-[#0E7490] hover:bg-[#F0F9FF]"
                        >
                          Usar nome digitado: &quot;{draft.description.trim()}&quot;
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </td>
        <td className="px-2 py-2 align-top">
          <FieldLabel>Marca</FieldLabel>
          <input
            className={inputClass}
            value={draft.partBrand}
            onChange={(e) => setDraft((d) => ({ ...d, partBrand: e.target.value }))}
          />
        </td>
        <td className="px-2 py-2 align-top">
          <FieldLabel align="right">Quantidade</FieldLabel>
          <input
            className={`${inputClass} text-right`}
            type="number"
            min={1}
            value={draft.quantity}
            onChange={(e) => setDraft((d) => ({ ...d, quantity: e.target.value }))}
          />
        </td>
        <td className="px-2 py-2 align-top">
          <FieldLabel align="right">Custo unitário</FieldLabel>
          <input
            className={`${inputClass} text-right`}
            placeholder="0,00"
            value={draft.unitCost}
            onChange={(e) => setDraft((d) => ({ ...d, unitCost: e.target.value }))}
          />
        </td>
        <td className="px-2 py-2 align-top">
          <FieldLabel align="right">Preço de venda</FieldLabel>
          <input
            className={`${inputClass} text-right`}
            placeholder="0,00"
            value={draft.unitPrice}
            onChange={(e) => setDraft((d) => ({ ...d, unitPrice: e.target.value }))}
          />
        </td>
        <td className="px-2 py-2 align-top">
          <FieldLabel align="right">Desconto</FieldLabel>
          <input
            className={`${inputClass} text-right`}
            placeholder="0"
            value={draft.discount}
            onChange={(e) => setDraft((d) => ({ ...d, discount: e.target.value }))}
          />
        </td>
        <td className="px-2 py-2 align-top">
          <FieldLabel align="right">Total</FieldLabel>
          <p className="text-right text-sm font-medium pt-2">{formatMoney(total)}</p>
        </td>
        <td className="px-2 py-2 align-top">
          <FieldLabel>Observações internas</FieldLabel>
          <input
            className={inputClass}
            value={draft.internalNotes}
            onChange={(e) => setDraft((d) => ({ ...d, internalNotes: e.target.value }))}
          />
        </td>
        <td className="px-2 py-2 align-top">
          <FieldLabel align="right">&nbsp;</FieldLabel>
          <div className="flex justify-end gap-1">
            <button
              type="button"
              disabled={saving || !draft.description.trim()}
              onClick={handleSave}
              className="inline-flex items-center gap-1 h-8 px-2 rounded-lg bg-[#0F3D4C] text-white text-xs disabled:opacity-50"
            >
              <Check size={14} />
              Salvar
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 text-[#64748B] hover:bg-[#F1F5F9] rounded"
            >
              <X size={16} />
            </button>
          </div>
        </td>
      </tr>
    </>
  );
}

export default QuickPartInlineRow;
