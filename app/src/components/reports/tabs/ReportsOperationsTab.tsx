import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "../../../lib/format";
import ReportSection from "../ReportSection";
import ReportHorizontalBars from "../charts/ReportHorizontalBars";
import ReportRankList from "../ReportRankList";
import type { ReportTabProps } from "./reportTabTypes";

function formatReportDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

export default function ReportsOperationsTab({
  report,
  period,
  token,
  drill,
  setDrill,
  statusChart,
  filteredDelayed,
}: ReportTabProps) {
  const detailedOrders = report.operations.serviceOrdersDetailed ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ReportSection
        title="Ordens de serviço (detalhado)"
        subtitle="Nº da OS, cliente, entrada, entrega e valor"
        className="lg:col-span-2"
        period={period}
        token={token}
        exportType="service-orders-detailed"
        exportFile="ordens-servico-detalhado.csv"
      >
        {detailedOrders.length === 0 ? (
          <p className="text-[13px] text-[#94A3B8] py-6 text-center">
            Nenhuma OS entregue no período.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-[#F8FAFC] sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">OS</th>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">Cliente</th>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">Placa</th>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">Entrada</th>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">Entregue</th>
                  <th className="text-right px-3 py-2 font-semibold text-[#64748B]">Valor</th>
                </tr>
              </thead>
              <tbody>
                {detailedOrders.map((o) => (
                  <tr key={o.id} className="border-t border-[#E2E8F0]">
                    <td className="px-3 py-2 font-medium text-[#0F3D4C]">#{o.number}</td>
                    <td className="px-3 py-2 text-[#1E293B]">{o.customerName}</td>
                    <td className="px-3 py-2 text-[#64748B]">{o.plate}</td>
                    <td className="px-3 py-2 text-[#64748B]">{formatReportDate(o.enteredAt)}</td>
                    <td className="px-3 py-2 text-[#64748B]">{formatReportDate(o.closedAt)}</td>
                    <td className="px-3 py-2 text-right font-medium text-[#16A34A]">
                      {formatMoney(o.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportSection>
      <ReportSection title="OS por status" subtitle="Clique para filtrar atrasadas" period={period} token={token}>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusChart} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar
                dataKey="count"
                radius={[0, 4, 4, 0]}
                onClick={(row) => {
                  const payload = (row as { payload?: { status?: string } })?.payload;
                  const status = payload?.status ?? (row as { status?: string }).status;
                  if (!status) return;
                  setDrill((d) =>
                    d?.kind === "status" && d.status === status
                      ? null
                      : { kind: "status", status },
                  );
                }}
                style={{ cursor: "pointer" }}
              >
                {statusChart.map((row) => (
                  <Cell
                    key={row.status}
                    fill={drill?.kind === "status" && drill.status === row.status ? "#0E7490" : "#0F3D4C"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportSection>
      <ReportSection title="Mecanicos" period={period} token={token} exportType="mechanic-productivity" exportFile="produtividade-mecanicos.csv">
        <ReportHorizontalBars
          data={report.operations.ordersByMechanic.map((m) => ({ label: m.name, value: m.total }))}
          formatValue={formatMoney}
          color="#0F3D4C"
        />
      </ReportSection>
      <ReportSection title="OS atrasadas" className="lg:col-span-2" period={period} token={token} exportType="delayed-orders" exportFile="os-atrasadas.csv">
        <ReportRankList
          rows={filteredDelayed.map((o) => ({
            key: o.id,
            label: `OS #${o.number} — ${o.customerName}`,
            value: o.estimatedAt ? new Date(o.estimatedAt).toLocaleDateString("pt-BR") : "—",
          }))}
          empty="Nenhuma atrasada."
        />
      </ReportSection>
      <ReportSection title="Servicos" period={period} token={token} exportType="top-services" exportFile="servicos-mais-vendidos.csv">
        <ReportHorizontalBars
          data={report.operations.topServices.map((s) => ({ label: s.description, value: s.revenue }))}
          formatValue={formatMoney}
          color="#3B82F6"
        />
      </ReportSection>
      <ReportSection title="Pecas" period={period} token={token} exportType="top-parts" exportFile="pecas-mais-usadas.csv">
        <ReportHorizontalBars
          data={report.operations.topParts.map((p) => ({ label: p.description, value: p.profit }))}
          formatValue={formatMoney}
          color="#F97316"
        />
      </ReportSection>
    </div>
  );
}
