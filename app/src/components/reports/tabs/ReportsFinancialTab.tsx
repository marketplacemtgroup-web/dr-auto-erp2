import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney, formatNegativeMoney, formatDate } from "../../../lib/format";
import ReportSection from "../ReportSection";
import ReportInteractivePie from "../charts/ReportInteractivePie";
import ReportCashFlowChart from "../charts/ReportCashFlowChart";
import ReportRankList from "../ReportRankList";
import ReportProfitMetricGrid from "../ReportProfitMetricGrid";
import type { ReportTabProps } from "./reportTabTypes";

export default function ReportsFinancialTab({
  report,
  period,
  token,
  dreChart,
  expenses,
  grossProfit,
}: ReportTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ReportSection title="Resumo de lucro" className="lg:col-span-2" period={period} token={token}>
        <ReportProfitMetricGrid
          items={[
            {
              label: "Faturamento",
              value: formatMoney(report.financial.revenue),
              tone: "success",
            },
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
              label: "Lucro bruto previsto",
              value: formatMoney(grossProfit),
            },
            {
              label: "Lucro bruto real",
              value: formatMoney(report.financial.grossProfitActual ?? grossProfit),
            },
            {
              label: "Diferenca custo",
              value: formatMoney(report.financial.costVariance ?? 0),
              tone:
                (report.financial.costVariance ?? 0) < 0
                  ? "danger"
                  : (report.financial.costVariance ?? 0) > 0
                    ? "success"
                    : undefined,
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
      </ReportSection>
      <ReportSection title="DRE mensal" className="lg:col-span-2" period={period} token={token}>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dreChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatMoney(v)} width={72} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Line type="monotone" dataKey="revenue" stroke="#16A34A" strokeWidth={2} dot={false} name="Receita" />
              <Line type="monotone" dataKey="expense" stroke="#DC2626" strokeWidth={2} dot={false} name="Despesa" />
              <Line type="monotone" dataKey="result" stroke="#0E7490" strokeWidth={2} dot={false} name="Resultado" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ReportSection>
      <ReportSection title="Lucro por categoria" period={period} token={token} exportType="profit-margin" exportFile="margem-por-os.csv">
        <ReportInteractivePie
          data={[
            { name: "Pecas", value: report.financial.partsProfit, key: "parts" },
            { name: "Servicos", value: report.financial.servicesProfit, key: "services" },
            { name: "Scanner", value: report.financial.scannerProfit ?? 0, key: "scanner" },
            { name: "Terceirizado", value: report.financial.outsourcedProfit ?? 0, key: "outsourced" },
          ].filter((r) => r.value > 0)}
        />
        <div className="mt-3 space-y-1 text-[12px] text-[#64748B] text-center">
          <p>Lucro bruto previsto: <span className="font-semibold text-[#1E293B]">{formatMoney(grossProfit)}</span></p>
          <p>Lucro bruto real: <span className="font-semibold text-[#1E293B]">{formatMoney(report.financial.grossProfitActual ?? grossProfit)}</span></p>
          <p>Diferenca por custo: <span className="font-semibold text-[#64748B]">{formatMoney(report.financial.costVariance ?? 0)}</span></p>
          <p>Despesas operacionais: <span className="font-semibold text-[#DC2626]">{formatNegativeMoney(report.financial.operationalExpenses ?? expenses)}</span></p>
          <p>Lucro operacional: <span className="font-semibold text-[#1E293B]">{formatMoney(report.financial.operationalProfit ?? 0)}</span></p>
          <p className="text-[14px] font-bold text-[#16A34A] pt-1">
            Lucro total (caixa): {formatMoney(report.financial.totalProfit)}
          </p>
        </div>
      </ReportSection>
      <ReportSection title="Fluxo de caixa" period={period} token={token} exportType="cash-flow" exportFile="fluxo-caixa.csv">
        <ReportCashFlowChart {...report.financial.cashFlow} />
      </ReportSection>
      <ReportSection title="Recebiveis vencidos" className="lg:col-span-2" period={period} token={token} exportType="overdue-receivables" exportFile="recebiveis-vencidos.csv">
        <ReportRankList
          rows={report.financial.overdueReceivables.map((r) => ({
            key: r.id,
            label: `${r.customerName ?? r.description}${r.serviceOrderNumber ? ` · OS #${r.serviceOrderNumber}` : ""}`,
            value: formatMoney(r.amount),
          }))}
          empty="Nenhum vencido."
        />
      </ReportSection>

      <ReportSection
        title="Clientes faturados no periodo"
        className="lg:col-span-2"
        period={period}
        token={token}
        exportType="top-customers"
        exportFile="clientes-faturados.csv"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-left text-[11px] uppercase text-[#94A3B8]">
                <th className="py-2 pr-3 font-medium">Cliente</th>
                <th className="py-2 pr-3 font-medium text-right">OS</th>
                <th className="py-2 font-medium text-right">Faturamento</th>
              </tr>
            </thead>
            <tbody>
              {report.financial.billedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-[#94A3B8]">
                    Nenhum recebimento no periodo.
                  </td>
                </tr>
              ) : (
                report.financial.billedCustomers.map((c) => (
                  <tr key={c.id} className="border-b border-[#F1F5F9]">
                    <td className="py-2 pr-3 font-medium text-[#1E293B]">{c.name}</td>
                    <td className="py-2 pr-3 text-right text-[#64748B]">{c.orderCount}</td>
                    <td className="py-2 text-right font-semibold text-[#16A34A]">
                      {formatMoney(c.revenue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ReportSection>

      <ReportSection
        title="Despesas do periodo"
        className="lg:col-span-2"
        period={period}
        token={token}
        exportType="financial"
        exportFile="despesas-periodo.csv"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-left text-[11px] uppercase text-[#94A3B8]">
                <th className="py-2 pr-3 font-medium">Descricao</th>
                <th className="py-2 pr-3 font-medium">Fornecedor / categoria</th>
                <th className="py-2 pr-3 font-medium">Data</th>
                <th className="py-2 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {report.financial.expensesList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#94A3B8]">
                    Nenhuma despesa paga no periodo.
                  </td>
                </tr>
              ) : (
                report.financial.expensesList.map((e) => (
                  <tr key={e.id} className="border-b border-[#F1F5F9]">
                    <td className="py-2 pr-3 text-[#1E293B]">{e.description}</td>
                    <td className="py-2 pr-3 text-[#64748B]">
                      {[e.supplierName, e.categoryName].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="py-2 pr-3 text-[#64748B]">
                      {e.paidAt ? formatDate(e.paidAt) : "—"}
                    </td>
                    <td className="py-2 text-right font-semibold text-[#DC2626]">
                      {formatNegativeMoney(e.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ReportSection>
    </div>
  );
}
