import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney, formatNegativeMoney } from "../../../lib/format";
import ReportSection from "../ReportSection";
import ReportInteractivePie from "../charts/ReportInteractivePie";
import ReportCashFlowChart from "../charts/ReportCashFlowChart";
import ReportRankList from "../ReportRankList";
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
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3 text-[13px]">
          <div className="rounded-xl border border-[#E2E8F0] p-4">
            <p className="text-[#64748B]">Faturamento</p>
            <p className="text-lg font-bold text-[#16A34A]">{formatMoney(report.financial.revenue)}</p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] p-4">
            <p className="text-[#64748B]">Lucro pecas</p>
            <p className="text-lg font-bold">{formatMoney(report.financial.partsProfit)}</p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] p-4">
            <p className="text-[#64748B]">Lucro servicos</p>
            <p className="text-lg font-bold">{formatMoney(report.financial.servicesProfit)}</p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] p-4">
            <p className="text-[#64748B]">Lucro scanner</p>
            <p className="text-lg font-bold">{formatMoney(report.financial.scannerProfit ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] p-4">
            <p className="text-[#64748B]">Lucro terceirizado</p>
            <p className="text-lg font-bold">{formatMoney(report.financial.outsourcedProfit ?? 0)}</p>
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
          <p>Lucro bruto: <span className="font-semibold text-[#1E293B]">{formatMoney(grossProfit)}</span></p>
          <p>Despesas: <span className="font-semibold text-[#DC2626]">{formatNegativeMoney(expenses)}</span></p>
          <p className="text-[14px] font-bold text-[#16A34A] pt-1">
            Lucro total: {formatMoney(report.financial.totalProfit)}
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
    </div>
  );
}
