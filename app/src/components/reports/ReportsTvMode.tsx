import { useEffect } from "react";
import { X } from "lucide-react";
import type { ReportsFull } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { buildReportFinancialKpiItems } from "../../lib/reportFinancialKpis";
import { formatPeriodLabel } from "../../lib/reportPeriod";
import ReportAreaChart from "./charts/ReportAreaChart";
import ReportKpiGrid from "./ReportKpiGrid";

type Props = {
  report: ReportsFull;
  periodLabel: string;
  revenueChart: Array<{ label: string; value: number }>;
  onClose: () => void;
  onRefresh: () => void;
};

export default function ReportsTvMode({
  report,
  periodLabel,
  revenueChart,
  onClose,
  onRefresh,
}: Props) {
  useEffect(() => {
    const timer = window.setInterval(onRefresh, 60_000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, onRefresh]);

  const f = report.financial;
  const o = report.operations;

  return (
    <div className="fixed inset-0 z-[300] bg-[#0F172A] text-white p-6 overflow-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">WTEC Motors — Painel ao vivo</h1>
          <p className="text-[#94A3B8] mt-1">{periodLabel} · atualiza a cada 60s</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
          aria-label="Fechar modo TV"
        >
          <X size={22} />
        </button>
      </div>

      <div className="[&_.text-\\[\\#1E293B\\]]:text-white [&_.text-\\[\\#64748B\\]]:text-[#CBD5E1] [&_.border-\\[\\#E2E8F0\\]]:border-white/10 [&_.from-white]:from-[#1E293B] [&_.to-\\[\\#F8FAFC\\]]:to-[#0F172A]">
        <ReportKpiGrid
          items={[
            ...buildReportFinancialKpiItems(f),
            { label: "Ticket medio", value: formatMoney(o.averageTicket) },
            { label: "OS entregues", value: String(o.deliveredCount) },
            { label: "Em andamento", value: String(o.openOrdersCount), tone: "warning" },
            { label: "Conversao", value: `${report.commercial.quoteConversion.rate}%` },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 h-72">
          <h2 className="text-sm font-semibold mb-3">Faturamento</h2>
          <ReportAreaChart data={revenueChart} />
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <h2 className="text-sm font-semibold mb-3">Resumo rapido</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[#94A3B8]">A receber</p>
              <p className="text-xl font-bold text-[#4ADE80]">{formatMoney(f.openReceivables.amount)}</p>
            </div>
            <div>
              <p className="text-[#94A3B8]">A pagar</p>
              <p className="text-xl font-bold text-[#F87171]">{formatMoney(f.openPayables.amount)}</p>
            </div>
            <div>
              <p className="text-[#94A3B8]">OS atrasadas</p>
              <p className="text-xl font-bold">{o.delayedOrders.length}</p>
            </div>
            <div>
              <p className="text-[#94A3B8]">Estoque baixo</p>
              <p className="text-xl font-bold">{report.inventory.lowStockCount}</p>
            </div>
          </div>
          <p className="text-[11px] text-[#64748B] mt-6">
            {formatPeriodLabel(report.period.from.slice(0, 10), report.period.to.slice(0, 10))}
          </p>
        </div>
      </div>
    </div>
  );
}
