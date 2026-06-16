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
  revenue: number;
  expense: number;
  result: number;
  labels?: {
    revenue: string;
    expense: string;
    result: string;
  };
};

export default function ReportWaterfallChart({
  revenue,
  expense,
  result,
  labels = { revenue: "Receita", expense: "Despesas", result: "Resultado" },
}: Props) {
  const data = [
    { name: labels.revenue, value: revenue, color: "#16A34A" },
    { name: labels.expense, value: -expense, color: "#DC2626" },
    { name: labels.result, value: result, color: result >= 0 ? "#0E7490" : "#F97316" },
  ];

  if (revenue === 0 && expense === 0) {
    return <p className="text-sm text-[#94A3B8] py-12 text-center">Sem movimentacao.</p>;
  }

  return (
    <div className="h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} />
          <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickFormatter={(v) => formatMoney(v)} width={72} />
          <ReferenceLine y={0} stroke="#CBD5E1" />
          <Tooltip contentStyle={REPORT_CHART_TOOLTIP_STYLE} formatter={(v: number) => formatMoney(Math.abs(v))} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
