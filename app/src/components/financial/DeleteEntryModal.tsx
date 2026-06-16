import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { FormField, inputClass } from "../modules/FormDrawer";
import type { FinancialEntryRow } from "../../lib/api";

type Props = {
  entry: FinancialEntryRow | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function DeleteEntryModal({ entry, loading, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!entry) return;
    setReason("");
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
  }, [entry, onClose]);

  if (!entry) return null;

  const hasInstallments = (entry.installments?.length ?? 0) > 0;
  const paidWarning = entry.status === "PAID";

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-[#E2E8F0] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-semibold text-[#1E293B]">Excluir lancamento</h3>
            <p className="text-sm text-[#64748B] mt-1">{entry.description}</p>
            <p className="text-sm font-medium text-[#1E293B] mt-0.5">
              {formatCurrency(Number(entry.amount))}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {(paidWarning || hasInstallments) && (
          <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              {paidWarning ? (
                <p>Este lancamento ja foi pago. O valor sera removido dos relatorios e do caixa.</p>
              ) : null}
              {hasInstallments ? <p>Todas as parcelas deste lancamento tambem serao excluidas.</p> : null}
            </div>
          </div>
        )}

        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = reason.trim();
            if (trimmed.length < 3) return;
            onConfirm(trimmed);
          }}
        >
          <FormField label="Motivo da exclusao *">
            <textarea
              className={inputClass}
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva por que este lancamento esta sendo excluido..."
              required
              minLength={3}
              maxLength={1000}
              autoFocus
            />
          </FormField>
          <p className="text-[11px] text-[#94A3B8] mt-1">
            O motivo ficara registrado na auditoria do sistema.
          </p>
          <div className="flex flex-wrap gap-2 mt-4 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-10 px-4 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] hover:bg-[#F8FAFC] disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || reason.trim().length < 3}
              className="h-10 px-4 rounded-lg bg-[#DC2626] text-white text-sm font-medium hover:bg-[#B91C1C] disabled:opacity-60"
            >
              {loading ? "Excluindo..." : "Excluir lancamento"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
