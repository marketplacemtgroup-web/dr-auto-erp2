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
import ReportProfitMetricGrid from "../ReportProfitMetricGrid";
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
        <div className="flex flex-col gap-4">
          <div className="h-[220px] sm:h-[240px] w-full min-h-[200px]">
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
          <ReportProfitMetricGrid
            items={[
              {
                label: "Lucro pecas",
                value: formatMoney(report.financial.partsProfit),
              },
              {
                label: "Lucro servicos",
                value: formatMoney(report.financial.servicesProfit),
              },
              {
                label: "Lucro scanner",
                value: formatMoney(report.financial.scannerProfit ?? 0),
              },
              {
                label: "Lucro terceirizado",
                value: formatMoney(report.financial.outsourcedProfit ?? 0),
              },
              {
                label: "Despesas pagas",
                value: formatNegativeMoney(expenses),
                tone: "expense",
              },
              {
                label: "Lucro total",
                value: formatMoney(report.financial.totalProfit),
                tone: report.financial.totalProfit >= 0 ? "success" : "danger",
              },
            ]}
          />
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
