import { formatMoney } from "../../../lib/format";
import ReportSection from "../ReportSection";
import ReportHorizontalBars from "../charts/ReportHorizontalBars";
import ReportRankList from "../ReportRankList";
import type { ReportTabProps } from "./reportTabTypes";

export default function ReportsCommercialTab({ report, period, token }: ReportTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ReportSection title="Top clientes" period={period} token={token} exportType="top-customers" exportFile="top-clientes.csv">
        <ReportHorizontalBars
          data={report.commercial.topCustomers.map((c) => ({ label: c.name, value: c.revenue }))}
          formatValue={formatMoney}
          color="#16A34A"
        />
      </ReportSection>
      <ReportSection title="Origem" period={period} token={token} exportType="customer-origins" exportFile="origem-clientes.csv">
        <ReportHorizontalBars
          data={report.commercial.customersByOrigin.map((o) => ({ label: o.origin, value: o.count }))}
          color="#6366F1"
        />
      </ReportSection>
      <ReportSection title="Retorno" period={period} token={token} exportType="returning-customers" exportFile="clientes-retorno.csv">
        <p className="text-[12px] text-[#64748B] mb-2">{report.commercial.returningCustomers.rate}% de retorno</p>
        <ReportHorizontalBars
          data={report.commercial.returningCustomers.list.map((c) => ({ label: c.name, value: c.revenue }))}
          formatValue={formatMoney}
        />
      </ReportSection>
      <ReportSection title="Inativos 90d" period={period} token={token} exportType="inactive-customers" exportFile="clientes-inativos.csv">
        <ReportRankList
          rows={report.commercial.inactiveCustomers.slice(0, 15).map((c) => ({
            key: c.id,
            label: c.name,
            value: c.phone ?? "—",
          }))}
        />
      </ReportSection>
    </div>
  );
}
