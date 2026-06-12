import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "../../../lib/format";
import { REPORT_CHART_COLORS, REPORT_CHART_TOOLTIP_STYLE } from "./reportChartTheme";

type Slice = { name: string; value: number; key: string };

type Props = {
  data: Slice[];
  selectedKey?: string | null;
  onSelect?: (key: string | null) => void;
};

export default function ReportInteractivePie({ data, selectedKey, onSelect }: Props) {
  if (!data.length) {
    return <p className="text-sm text-[#94A3B8] py-10 text-center">Sem dados.</p>;
  }

  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={42}
            outerRadius={68}
            paddingAngle={2}
            onClick={(_, index) => {
              const key = data[index]?.key;
              if (!key || !onSelect) return;
              onSelect(selectedKey === key ? null : key);
            }}
            style={{ cursor: onSelect ? "pointer" : "default" }}
          >
            {data.map((slice, i) => (
              <Cell
                key={slice.key}
                fill={REPORT_CHART_COLORS[i % REPORT_CHART_COLORS.length]}
                opacity={selectedKey && selectedKey !== slice.key ? 0.35 : 1}
                stroke={selectedKey === slice.key ? "#0F3D4C" : "transparent"}
                strokeWidth={selectedKey === slice.key ? 2 : 0}
              />
            ))}
          </Pie>
          <Tooltip contentStyle={REPORT_CHART_TOOLTIP_STYLE} formatter={(v: number) => formatMoney(v)} />
        </PieChart>
      </ResponsiveContainer>
      {onSelect && selectedKey ? (
        <p className="text-center text-[10px] text-[#0E7490]">Clique novamente para limpar filtro</p>
      ) : onSelect ? (
        <p className="text-center text-[10px] text-[#94A3B8]">Clique em uma fatia para detalhar</p>
      ) : null}
    </div>
  );
}
