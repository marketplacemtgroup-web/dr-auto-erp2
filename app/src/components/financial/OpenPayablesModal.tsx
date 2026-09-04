import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { api, type FinancialEntryRow } from "../../lib/api";
import { formatDate, formatMoney } from "../../lib/format";
import { QUERY_STALE_TIME_MS } from "../../lib/query-cache";
import { routes } from "../../lib/routes";
import { useAuthStore } from "../../stores/authStore";

function localIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dueFromThreeDaysAgo() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 3);
  return localIsoDate(d);
}

function entryRemaining(row: FinancialEntryRow) {
  return Math.max(0, Number(row.amount) - Number(row.amountPaid ?? 0));
}

function isOverdue(row: FinancialEntryRow) {
  if (row.status === "OVERDUE") return true;
  const due = row.dueDate ? new Date(row.dueDate) : null;
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function OpenPayablesModal({ open, onClose }: Props) {
  const token = useAuthStore((s) => s.session?.accessToken);
  const navigate = useNavigate();
  const dueFrom = dueFromThreeDaysAgo();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["financial", "payables-window", token, dueFrom],
    queryFn: () =>
      api.financialEntries(token!, undefined, 1, 100, {
        type: "PAYABLE",
        openOnly: true,
        dueFrom,
      }),
    enabled: open && !!token,
    staleTime: QUERY_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });

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

  const rows = data?.data ?? [];
  const totalRemaining = rows.reduce((sum, row) => sum + entryRemaining(row), 0);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-xl max-h-[min(92vh,880px)] flex flex-col bg-white rounded-2xl shadow-2xl border border-[#E2E8F0]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="open-payables-modal-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] shrink-0 rounded-t-2xl">
          <div className="min-w-0">
            <h2 id="open-payables-modal-title" className="text-[16px] font-semibold text-[#1E293B]">
              Despesas pendentes
            </h2>
            <p className="text-[12px] text-[#64748B] mt-0.5 leading-snug">
              Em aberto com vencimento a partir de {formatDate(dueFrom)} (hoje − 3 dias), por ordem de
              vencimento
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

        <div className="px-5 py-3 border-b border-[#F1F5F9] flex items-center justify-between gap-3 shrink-0">
          <span className="text-[12px] text-[#64748B]">
            {isLoading ? "Carregando…" : `${rows.length} despesa${rows.length === 1 ? "" : "s"}`}
          </span>
          <span className="text-sm font-bold text-[#DC2626]">
            {isLoading ? "—" : formatMoney(totalRemaining)}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {isError ? (
            <p className="px-5 py-8 text-sm text-[#64748B]">Não foi possível carregar as despesas.</p>
          ) : isLoading ? (
            <p className="px-5 py-8 text-sm text-[#64748B]">Carregando despesas…</p>
          ) : rows.length === 0 ? (
            <p className="px-5 py-8 text-sm text-[#64748B] text-center">
              Nenhuma despesa pendente nesta janela.
            </p>
          ) : (
            <ul className="divide-y divide-[#F1F5F9]">
              {rows.map((item) => {
                const overdue = isOverdue(item);
                return (
                  <li
                    key={item.id}
                    className="px-5 py-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1E293B] truncate">{item.description}</p>
                      <p className="text-[12px] text-[#64748B] mt-0.5">
                        Vence {formatDate(item.dueDate)}
                        {item.supplier
                          ? ` · ${item.supplier.tradeName || item.supplier.legalName}`
                          : ""}
                        {item.purchaseOrder ? ` · Compra ${item.purchaseOrder.number}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {overdue ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <AlertTriangle size={10} />
                          Vencida
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 rounded-full">
                          Em aberto
                        </span>
                      )}
                      <span className="text-sm font-bold text-[#DC2626]">
                        {formatMoney(entryRemaining(item))}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[#F1F5F9] bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-2 shrink-0 rounded-b-2xl">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(`${routes.financeiroLancamentos}?type=PAYABLE&open=1`);
            }}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#0E7490] hover:text-[#0F3D4C]"
          >
            Abrir no Financeiro
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-[#E2E8F0] text-[12px] font-semibold text-[#334155] hover:bg-white"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
