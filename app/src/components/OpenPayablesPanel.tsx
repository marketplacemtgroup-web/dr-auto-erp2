import { useState } from "react";
import { AlertTriangle, ArrowRight, Receipt } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";
import { QUERY_STALE_TIME_MS } from "../lib/query-cache";
import { routes } from "../lib/routes";
import { useAuthStore } from "../stores/authStore";
import NavButton from "./NavButton";
import OpenPayablesModal from "./financial/OpenPayablesModal";

export default function OpenPayablesPanel() {
  const token = useAuthStore((s) => s.session?.accessToken);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["financial", "open-summary", token],
    queryFn: () => api.financialOpenSummary(token!),
    enabled: !!token,
    staleTime: QUERY_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });

  const preview = data?.payablesPreview ?? [];
  const overdueCount = data?.payableOverdueCount ?? 0;
  const openTotal = data?.payableOpen ?? 0;

  return (
    <section className="bg-white rounded-xl card-shadow overflow-hidden mb-5">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#FEF2F2] flex items-center justify-center">
              <Receipt size={18} className="text-[#DC2626]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#1E293B]">Contas a pagar</h2>
              <p className="text-[12px] text-[#64748B]">
                Despesas em aberto e vencimentos próximos
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-[#94A3B8]">Total em aberto</p>
          <p className="text-[22px] font-bold text-[#DC2626] leading-tight">
            {isLoading ? "—" : formatMoney(openTotal)}
          </p>
          {overdueCount > 0 ? (
            <p className="text-[11px] font-medium text-[#B45309] mt-0.5 inline-flex items-center gap-1">
              <AlertTriangle size={12} />
              {overdueCount} vencida{overdueCount > 1 ? "s" : ""}
            </p>
          ) : null}
        </div>
      </div>

      {isError ? (
        <p className="px-5 py-6 text-sm text-[#64748B]">Não foi possível carregar as despesas.</p>
      ) : isLoading ? (
        <p className="px-5 py-6 text-sm text-[#64748B]">Carregando despesas...</p>
      ) : preview.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-[#64748B]">Nenhuma despesa em aberto no momento.</p>
          <NavButton
            to={routes.financeiroLancamentos}
            className="inline-flex items-center gap-1.5 mt-3 text-[13px] font-medium text-[#0E7490] hover:text-[#0F3D4C]"
          >
            Ir para lançamentos
            <ArrowRight size={14} />
          </NavButton>
        </div>
      ) : (
        <ul className="divide-y divide-[#F1F5F9]">
          {preview.map((item) => (
            <li key={item.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
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
                {item.isOverdue ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded-full">
                    Vencida
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 rounded-full">
                    Em aberto
                  </span>
                )}
                <span className="text-sm font-bold text-[#DC2626]">
                  {formatMoney(item.remaining)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="px-5 py-3 border-t border-[#F1F5F9] bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] text-[#64748B]">
          {data?.payableOpenCount ?? 0} despesa{(data?.payableOpenCount ?? 0) === 1 ? "" : "s"}{" "}
          pendente{(data?.payableOpenCount ?? 0) === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[12px] font-semibold transition-colors"
        >
          Ver todas as despesas
          <ArrowRight size={14} />
        </button>
      </div>

      <OpenPayablesModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}
