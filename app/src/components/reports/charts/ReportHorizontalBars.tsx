import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { REPORT_CHART_TOOLTIP_STYLE } from "./reportChartTheme";

type Item = { label: string; value: number };

type Props = {
  data: Item[];
  formatValue?: (value: number) => string;
  color?: string;
  emptyMessage?: string;
};

export default function ReportHorizontalBars({
  data,
  formatValue = (v) => String(v),
  color = "#0E7490",
  emptyMessage = "Sem dados no periodo.",
}: Props) {
  if (!data.length) {
    return <p className="text-sm text-[#94A3B8] py-8 text-center">{emptyMessage}</p>;
  }

  const chartData = data.map((row) => ({
    name: row.label.length > 28 ? `${row.label.slice(0, 28)}…` : row.label,
    fullName: row.label,
    value: row.value,
  }));

  const height = Math.min(320, Math.max(140, chartData.length * 36));

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} />
          <YAxis
            type="category"
            dataKey="name"
            width={108}
            tick={{ fontSize: 10, fill: "#64748B" }}
          />
          <Tooltip
            contentStyle={REPORT_CHART_TOOLTIP_STYLE}
            formatter={(value: number) => [formatValue(value), "Valor"]}
            labelFormatter={(_, payload) =>
              (payload?.[0]?.payload as { fullName?: string })?.fullName ?? ""
            }
          />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
