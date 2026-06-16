import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "../../../lib/format";
import { REPORT_CHART_TOOLTIP_STYLE } from "./reportChartTheme";

type Point = { label: string; value: number };

export default function ReportAreaChart({ data }: { data: Point[] }) {
  if (!data.length) {
    return <p className="text-sm text-[#94A3B8] py-16 text-center">Sem faturamento no periodo.</p>;
  }

  return (
    <div className="h-full min-h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0E7490" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#0E7490" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} />
          <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickFormatter={(v) => formatMoney(v)} width={72} />
          <Tooltip contentStyle={REPORT_CHART_TOOLTIP_STYLE} formatter={(v: number) => formatMoney(v)} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#0E7490"
            strokeWidth={2.5}
            fill="url(#revenueGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
