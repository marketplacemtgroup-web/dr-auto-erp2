import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string;
  trend: number;
  trendLabel?: string;
  icon: React.ReactNode;
  iconBg: string;
  sparklineColor: string;
  sparklineData: number[];
}

export default function KPICard({
  label,
  value,
  trend,
  trendLabel = "vs ontem",
  icon,
  iconBg,
  sparklineColor,
  sparklineData,
}: KPICardProps) {
  const isPositive = trend >= 0;
  const chartData = sparklineData.map((v, i) => ({ i, v }));

  return (
    <div className="bg-white rounded-xl card-shadow p-5 hover:-translate-y-0.5 hover:card-shadow-hover transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-[12px] font-medium text-[#64748B]">{label}</span>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
      </div>

      {/* Value */}
      <div className="text-[26px] font-bold text-[#1E293B] leading-tight mb-3">
        {value}
      </div>

      {/* Trend + Sparkline */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp size={13} className="text-[#10B981]" strokeWidth={2} />
          ) : (
            <TrendingDown size={13} className="text-[#EF4444]" strokeWidth={2} />
          )}
          <span
            className={`text-[11px] font-medium ${
              isPositive ? "text-[#10B981]" : "text-[#EF4444]"
            }`}
          >
            {isPositive ? "+" : ""}
            {trend}%
          </span>
          <span className="text-[11px] text-[#94A3B8]">{trendLabel}</span>
        </div>

        {/* Mini Sparkline */}
        <div className="w-[70px] h-[28px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={sparklineColor}
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
