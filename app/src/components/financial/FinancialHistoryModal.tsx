import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { History, X } from "lucide-react";
import { api, type FinancialEntryRow } from "../../lib/api";
import { formatDate, formatMoney } from "../../lib/format";
import { QUERY_STALE_TIME_MS } from "../../lib/query-cache";
import { useAuthStore } from "../../stores/authStore";

type HistoryTab = "PAID_PAYABLE" | "PAID_RECEIVABLE";

type Props = {
  open: boolean;
  onClose: () => void;
};

function settledAmount(row: FinancialEntryRow) {
  if (row.type === "RECEIVABLE") {
    return Number(row.amountReceived ?? row.amountPaid ?? row.amount);
  }
  return Number(row.amountPaid ?? row.amount);
}

export default function FinancialHistoryModal({ open, onClose }: Props) {
  const token = useAuthStore((s) => s.session?.accessToken);
  const [tab, setTab] = useState<HistoryTab>("PAID_PAYABLE");

  const type = tab === "PAID_PAYABLE" ? "PAYABLE" : "RECEIVABLE";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["financial", "history", token, type],
    queryFn: () =>
      api.financialEntries(token!, undefined, 1, 100, {
        type,
        status: "PAID",
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

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-2xl max-h-[min(92vh,880px)] flex flex-col bg-white rounded-2xl shadow-2xl border border-[#E2E8F0]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="financial-history-modal-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] shrink-0 rounded-t-2xl">
          <div className="min-w-0 flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0">
              <History size={18} className="text-[#475569]" />
            </div>
            <div>
              <h2
                id="financial-history-modal-title"
                className="text-[16px] font-semibold text-[#1E293B]"
              >
                Histórico financeiro
              </h2>
              <p className="text-[12px] text-[#64748B] mt-0.5 leading-snug">
                Já pagos e já recebidos, do mais recente para o mais antigo
              </p>
            </div>
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

        <div className="px-5 pt-3 flex gap-2 shrink-0">
          {(
            [
              { id: "PAID_PAYABLE" as const, label: "Já pago" },
              { id: "PAID_RECEIVABLE" as const, label: "Já recebido" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`h-9 px-3 rounded-lg text-[12px] font-medium border transition-colors ${
                tab === item.id
                  ? item.id === "PAID_PAYABLE"
                    ? "border-[#DC2626] bg-[#FEF2F2] text-[#DC2626]"
                    : "border-[#16A34A] bg-[#F0FDF4] text-[#166534]"
                  : "border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 mt-2">
          {isError ? (
            <p className="px-5 py-8 text-sm text-[#64748B]">Não foi possível carregar o histórico.</p>
          ) : isLoading ? (
            <p className="px-5 py-8 text-sm text-[#64748B]">Carregando histórico…</p>
          ) : rows.length === 0 ? (
            <p className="px-5 py-8 text-sm text-[#64748B] text-center">
              Nenhum lançamento {tab === "PAID_PAYABLE" ? "pago" : "recebido"} ainda.
            </p>
          ) : (
            <ul className="divide-y divide-[#F1F5F9]">
              {rows.map((item) => (
                <li
                  key={item.id}
                  className="px-5 py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1E293B] truncate">{item.description}</p>
                    <p className="text-[12px] text-[#64748B] mt-0.5">
                      {tab === "PAID_PAYABLE" ? "Pago" : "Recebido"}{" "}
                      {formatDate(item.paidAt ?? item.dueDate)}
                      {item.dueDate ? ` · Venc. ${formatDate(item.dueDate)}` : ""}
                      {item.supplier
                        ? ` · ${item.supplier.tradeName || item.supplier.legalName}`
                        : ""}
                      {item.customer ? ` · ${item.customer.name}` : ""}
                      {item.serviceOrder ? ` · OS ${item.serviceOrder.number}` : ""}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold shrink-0 ${
                      tab === "PAID_PAYABLE" ? "text-[#DC2626]" : "text-[#16A34A]"
                    }`}
                  >
                    {formatMoney(settledAmount(item))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[#F1F5F9] bg-[#FAFAFA] flex justify-end shrink-0 rounded-b-2xl">
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
