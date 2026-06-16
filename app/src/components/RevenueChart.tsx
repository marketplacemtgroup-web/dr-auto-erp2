import { routes } from "../lib/routes";
import NavButton from "./NavButton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDashboardRevenueSeries } from "../hooks/useDashboardLists";

function formatValue(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return `${value}`;
}

interface RevenueChartProps {
  monthlyRevenue?: number;
}

export default function RevenueChart({ monthlyRevenue = 0 }: RevenueChartProps) {
  const { data: series = [], isLoading } = useDashboardRevenueSeries();
  const formatted = monthlyRevenue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const maxValue = Math.max(...series.map((d) => d.value), 1);

  return (
    <div className="bg-white rounded-xl card-shadow p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[14px] font-semibold text-[#1E293B]">Faturamento</h3>
        <NavButton
          to={routes.relatorios}
          className="text-[12px] text-[#94A3B8] hover:text-[#0E7490] transition-colors flex items-center gap-1"
        >
          Este mes
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </NavButton>
      </div>

      <div className="mb-4">
        <span className="text-[20px] font-bold text-[#1E293B]">{formatted}</span>
      </div>

      <div className="h-[200px]">
        {isLoading ? (
          <p className="text-[13px] text-[#64748B] flex items-center justify-center h-full">
            Carregando...
          </p>
        ) : series.length === 0 ? (
          <p className="text-[13px] text-[#64748B] flex items-center justify-center h-full text-center px-4">
            Sem faturamento registrado neste mes. Lance receitas no financeiro.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0E7490" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#0E7490" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                interval={2}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                tickFormatter={formatValue}
                domain={[0, maxValue * 1.1]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  fontSize: "12px",
                  padding: "8px 12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                labelStyle={{ color: "#64748B", marginBottom: "4px" }}
                formatter={(value: number) => [
                  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                  "Faturamento",
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#0E7490"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
