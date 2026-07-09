import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
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
};

const emptyDraft = (): QuickPartDraft => ({
  description: "",
  partBrand: "",
  quantity: "1",
  unitCost: "",
  unitPrice: "",
  discount: "0",
  internalNotes: "",
});

type Props = {
  onSave: (draft: QuickPartDraft) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
};

export function QuickPartInlineRow({ onSave, onCancel, saving }: Props) {
  const token = useAuthToken();
  const [draft, setDraft] = useState<QuickPartDraft>(emptyDraft);
  const [debouncedDesc, setDebouncedDesc] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedDesc(draft.description.trim()), 300);
    return () => window.clearTimeout(t);
  }, [draft.description]);

  const { data: similar } = useQuery({
    queryKey: ["quick-part-similar", debouncedDesc, token],
    queryFn: async () => {
      const body = await api.products(token!, debouncedDesc, false, 1, 5);
      const rows = Array.isArray(body) ? body : body.data;
      return rows as ProductRow[];
    },
    enabled: !!token && debouncedDesc.length >= 3,
    staleTime: QUERY_STALE_TIME_MS,
    gcTime: QUERY_GC_TIME_MS,
  });

  const suggestion = useMemo(() => {
    if (!similar?.length || !debouncedDesc) return null;
    const lower = debouncedDesc.toLowerCase();
    return similar.find(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        lower.includes(p.name.toLowerCase().slice(0, Math.max(3, p.name.length - 2))),
    );
  }, [similar, debouncedDesc]);

  const total = useMemo(() => {
    const qty = Number(draft.quantity) || 0;
    const price = Number(draft.unitPrice) || 0;
    const disc = Number(draft.discount) || 0;
    return Math.max(0, qty * price - disc);
  }, [draft]);

  const handleSave = async () => {
    if (!draft.description.trim()) return;
    await onSave(draft);
    setDraft(emptyDraft());
  };

  return (
    <>
      {suggestion ? (
        <tr>
          <td colSpan={11} className="px-4 py-2 bg-amber-50 border-t border-amber-100">
            <p className="text-xs text-amber-800">
              Já existe no estoque: <strong>{suggestion.name}</strong>
              {suggestion.sku ? ` (${suggestion.sku})` : ""} — considere usar &quot;Buscar produto&quot;.
            </p>
          </td>
        </tr>
      ) : null}
      <tr className="border-t border-[#E2E8F0] bg-[#FFFBEB]/40">
        <td className="px-2 py-2">
          <span className="text-xs text-[#94A3B8]">auto</span>
        </td>
        <td className="px-2 py-2">
          <input
            className={inputClass}
            placeholder="Descrição da peça"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          />
        </td>
        <td className="px-2 py-2">
          <input
            className={inputClass}
            placeholder="Marca"
            value={draft.partBrand}
            onChange={(e) => setDraft((d) => ({ ...d, partBrand: e.target.value }))}
          />
        </td>
        <td className="px-2 py-2">
          <input
            className={`${inputClass} text-right`}
            type="number"
            min={1}
            value={draft.quantity}
            onChange={(e) => setDraft((d) => ({ ...d, quantity: e.target.value }))}
          />
        </td>
        <td className="px-2 py-2">
          <input
            className={`${inputClass} text-right`}
            placeholder="0,00"
            value={draft.unitCost}
            onChange={(e) => setDraft((d) => ({ ...d, unitCost: e.target.value }))}
          />
        </td>
        <td className="px-2 py-2">
          <input
            className={`${inputClass} text-right`}
            placeholder="0,00"
            value={draft.unitPrice}
            onChange={(e) => setDraft((d) => ({ ...d, unitPrice: e.target.value }))}
          />
        </td>
        <td className="px-2 py-2">
          <input
            className={`${inputClass} text-right`}
            placeholder="0"
            value={draft.discount}
            onChange={(e) => setDraft((d) => ({ ...d, discount: e.target.value }))}
          />
        </td>
        <td className="px-2 py-2 text-right text-sm font-medium">{formatMoney(total)}</td>
        <td className="px-2 py-2">
          <input
            className={inputClass}
            placeholder="Obs."
            value={draft.internalNotes}
            onChange={(e) => setDraft((d) => ({ ...d, internalNotes: e.target.value }))}
          />
        </td>
        <td className="px-2 py-2">
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
