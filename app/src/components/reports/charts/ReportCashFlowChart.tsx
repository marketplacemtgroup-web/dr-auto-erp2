import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "../../../lib/format";
import { REPORT_CHART_TOOLTIP_STYLE } from "./reportChartTheme";

type Props = {
  paymentIn: number;
  supply: number;
  withdrawal: number;
  paymentOut: number;
};

export default function ReportCashFlowChart({
  paymentIn,
  supply,
  withdrawal,
  paymentOut,
}: Props) {
  const data = [
    { name: "Entradas", value: paymentIn, color: "#16A34A" },
    { name: "Suprimentos", value: supply, color: "#0E7490" },
    { name: "Sangrias", value: -withdrawal, color: "#DC2626" },
    { name: "Saidas", value: -paymentOut, color: "#F97316" },
  ].filter((row) => row.value !== 0);

  if (!data.length) {
    return <p className="text-sm text-[#94A3B8] py-8 text-center">Sem movimento de caixa.</p>;
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} />
          <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickFormatter={(v) => formatMoney(v)} />
          <ReferenceLine y={0} stroke="#CBD5E1" />
          <Tooltip
            contentStyle={REPORT_CHART_TOOLTIP_STYLE}
            formatter={(value: number) => formatMoney(Math.abs(value))}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
