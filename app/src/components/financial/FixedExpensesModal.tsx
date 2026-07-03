import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, X, Zap } from "lucide-react";
import type { FixedExpenseRow } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { inputClass } from "../modules/FormDrawer";

const COLOR_PALETTE = [
  "#DC2626",
  "#EA580C",
  "#D97706",
  "#CA8A04",
  "#16A34A",
  "#0E7490",
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#475569",
];

type Props = {
  open: boolean;
  items: FixedExpenseRow[];
  loading?: boolean;
  generatingId?: string | null;
  onClose: () => void;
  onCreate: (data: { name: string; amount: number; color: string }) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onGenerate: (item: FixedExpenseRow) => Promise<void> | void;
};

export default function FixedExpensesModal({
  open,
  items,
  loading,
  generatingId,
  onClose,
  onCreate,
  onDelete,
  onGenerate,
}: Props) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const parsedAmount = Number(amount.replace(",", "."));
  const canSave = name.trim().length >= 2 && parsedAmount > 0 && !saving;

  async function handleCreate() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onCreate({ name: name.trim(), amount: parsedAmount, color });
      setName("");
      setAmount("");
      setColor(COLOR_PALETTE[0]);
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-lg max-h-[min(92vh,880px)] flex flex-col bg-white rounded-2xl shadow-2xl border border-[#E2E8F0]"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] shrink-0 rounded-t-2xl">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-[#1E293B]">Despesas fixas</h2>
            <p className="text-[12px] text-[#64748B] mt-0.5 leading-snug">
              Cadastre despesas recorrentes e gere lançamentos em aberto com um clique
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white text-[#64748B] shrink-0"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <p className="text-[11px] font-medium uppercase text-[#94A3B8] mb-2">Cadastradas</p>
            {loading ? (
              <p className="text-[13px] text-[#94A3B8] py-4">Carregando...</p>
            ) : items.length === 0 ? (
              <p className="text-[13px] text-[#94A3B8] py-4">
                Nenhuma despesa fixa cadastrada ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-3.5 w-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#1E293B] truncate">{item.name}</p>
                        <p className="text-[12px] text-[#64748B]">{formatMoney(Number(item.amount))}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={generatingId === item.id}
                        onClick={() => void onGenerate(item)}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-[#DC2626] text-white text-[12px] font-medium disabled:opacity-60"
                        title="Gerar despesa em aberto"
                      >
                        <Zap size={14} />
                        {generatingId === item.id ? "..." : "Gerar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDelete(item.id)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-[#94A3B8] hover:text-[#DC2626] hover:bg-red-50"
                        title="Excluir despesa fixa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-[#E2E8F0] pt-4">
            <p className="text-[11px] font-medium uppercase text-[#94A3B8] mb-2">Nova despesa fixa</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Nome *</label>
                <input
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Aluguel, Energia, Internet"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Valor (R$) *</label>
                <input
                  className={inputClass}
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1.5">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-full transition-transform ${
                        color === c ? "ring-2 ring-offset-2 ring-[#0E7490] scale-110" : ""
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Cor ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-[#E2E8F0] bg-[#FAFAFA] shrink-0 rounded-b-2xl flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-white"
          >
            Fechar
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => void handleCreate()}
            className="flex-1 h-10 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
          >
            <Plus size={16} />
            {saving ? "Salvando..." : "Cadastrar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
