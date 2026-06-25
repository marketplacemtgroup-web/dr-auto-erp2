import { formatMoney, formatNegativeMoney } from "../../../lib/format";
import { PAYMENT_LABELS } from "../../../lib/paymentMethods";
import ReportSection from "../ReportSection";
import ReportGoalCard from "../ReportGoalCard";
import ReportAreaChart from "../charts/ReportAreaChart";
import ReportWaterfallChart from "../charts/ReportWaterfallChart";
import ReportHeatmapChart from "../charts/ReportHeatmapChart";
import ReportInteractivePie from "../charts/ReportInteractivePie";
import ReportFunnelChart from "../charts/ReportFunnelChart";
import ReportRankList from "../ReportRankList";
import type { PaymentMethod } from "../../../lib/api";
import type { ReportTabProps } from "./reportTabTypes";

export default function ReportsOverviewTab({
  report,
  period,
  token,
  drill,
  setDrill,
  revenueChart,
  paymentChart,
  funnel,
  filteredReceipts,
  expenses,
  grossProfit,
}: ReportTabProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <ReportSection
        title="Faturamento"
        subtitle="Evolução diária no período"
        className="xl:col-span-8"
        period={period}
        token={token}
      >
        <div className="h-[280px]">
          <ReportAreaChart data={revenueChart} />
        </div>
      </ReportSection>
      <ReportSection
        title="Resultado"
        subtitle="Receita, despesas pagas e saldo"
        className="xl:col-span-4"
        period={period}
        token={token}
        exportType="financial"
        exportFile="dre.csv"
      >
        <div className="h-[280px]">
          <ReportWaterfallChart
            revenue={report.financial.revenue}
            expense={report.financial.expense}
            result={report.financial.result}
          />
        </div>
      </ReportSection>
      <ReportSection
        title="Lucro do periodo"
        subtitle="Pecas + servicos − despesas pagas"
        className="xl:col-span-12"
        period={period}
        token={token}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-[240px]">
            <ReportWaterfallChart
              revenue={grossProfit}
              expense={expenses}
              result={report.financial.totalProfit}
              labels={{
                revenue: "Lucro bruto",
                expense: "Despesas",
                result: "Lucro total",
              }}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3 text-[13px] content-center">
            <div className="rounded-xl border border-[#E2E8F0] p-4">
              <p className="text-[#64748B]">Lucro pecas</p>
              <p className="text-lg font-bold text-[#1E293B]">{formatMoney(report.financial.partsProfit)}</p>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] p-4">
              <p className="text-[#64748B]">Lucro servicos</p>
              <p className="text-lg font-bold text-[#1E293B]">{formatMoney(report.financial.servicesProfit)}</p>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] p-4">
              <p className="text-[#64748B]">Lucro scanner</p>
              <p className="text-lg font-bold text-[#1E293B]">{formatMoney(report.financial.scannerProfit ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] p-4">
              <p className="text-[#64748B]">Lucro terceirizado</p>
              <p className="text-lg font-bold text-[#1E293B]">{formatMoney(report.financial.outsourcedProfit ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
              <p className="text-[#991B1B]">Despesas pagas</p>
              <p className="text-lg font-bold text-[#DC2626]">{formatNegativeMoney(expenses)}</p>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] p-4">
              <p className="text-[#64748B]">Lucro total</p>
              <p className={`text-lg font-bold ${report.financial.totalProfit >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                {formatMoney(report.financial.totalProfit)}
              </p>
            </div>
          </div>
        </div>
      </ReportSection>
      <ReportSection
        title="Mapa de calor — OS abertas"
        subtitle="Dia da semana × horário"
        className="xl:col-span-12"
        period={period}
        token={token}
        exportType="service-orders"
        exportFile="ordens-servico.csv"
      >
        <ReportHeatmapChart cells={report.operations.ordersHeatmap} />
      </ReportSection>
      <ReportSection title="Meta do mês" className="xl:col-span-4 min-h-[200px]" period={period} token={token}>
        <ReportGoalCard currentRevenue={report.financial.revenue} />
      </ReportSection>
      <ReportSection
        title="Formas de pagamento"
        className="xl:col-span-4"
        period={period}
        token={token}
        exportType="payment-methods"
        exportFile="formas-pagamento.csv"
      >
        <ReportInteractivePie
          data={paymentChart}
          selectedKey={drill?.kind === "payment" ? drill.method : null}
          onSelect={(key) =>
            setDrill(key ? { kind: "payment", method: key as PaymentMethod } : null)
          }
        />
      </ReportSection>
      <ReportSection
        title="Funil de orcamentos"
        className="xl:col-span-4"
        period={period}
        token={token}
        exportType="quote-funnel"
        exportFile="funil-orcamentos.csv"
      >
        <ReportFunnelChart
          draft={funnel.DRAFT}
          pending={funnel.PENDING}
          approved={funnel.APPROVED}
          rejected={funnel.REJECTED}
        />
      </ReportSection>
      {drill?.kind === "payment" && (
        <ReportSection
          title={`Recebimentos — ${PAYMENT_LABELS[drill.method]}`}
          className="xl:col-span-12"
          period={period}
          token={token}
        >
          <ReportRankList
            rows={filteredReceipts.slice(0, 20).map((r, i) => ({
              key: String(i),
              label: r.customerName ?? r.description,
              value: formatMoney(r.amount),
            }))}
            empty="Nenhum recebimento nesta forma."
          />
        </ReportSection>
      )}
    </div>
  );
}
