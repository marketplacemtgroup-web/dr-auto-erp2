import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { REPORT_CHART_COLORS, REPORT_CHART_TOOLTIP_STYLE } from "./reportChartTheme";

type Props = {
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
};

export default function ReportFunnelChart({ draft, pending, approved, rejected }: Props) {
  const data = [
    { stage: "Rascunho", value: draft, color: "#94A3B8" },
    { stage: "Pendentes", value: pending, color: "#F59E0B" },
    { stage: "Aprovados", value: approved, color: "#16A34A" },
    { stage: "Recusados", value: rejected, color: "#DC2626" },
  ].filter((row) => row.value > 0);

  if (!data.length) {
    return <p className="text-sm text-[#94A3B8] py-8 text-center">Sem orcamentos no periodo.</p>;
  }

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "#64748B" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94A3B8" }} />
          <Tooltip contentStyle={REPORT_CHART_TOOLTIP_STYLE} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((entry, index) => (
              <Cell key={entry.stage} fill={entry.color ?? REPORT_CHART_COLORS[index % REPORT_CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
