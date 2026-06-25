import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "../../../lib/format";
import ReportSection from "../ReportSection";
import ReportHorizontalBars from "../charts/ReportHorizontalBars";
import ReportRankList from "../ReportRankList";
import type { ReportTabProps } from "./reportTabTypes";

export default function ReportsOperationsTab({
  report,
  period,
  token,
  drill,
  setDrill,
  statusChart,
  filteredDelayed,
}: ReportTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
