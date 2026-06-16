import { TrendingDown, TrendingUp } from "lucide-react";

export type ReportKpiItem = {
  label: string;
  value: string;
  change?: number;
  tone?: "default" | "success" | "warning" | "danger";
  large?: boolean;
};

const toneValue: Record<string, string> = {
  default: "text-[#1E293B]",
  success: "text-[#16A34A]",
  warning: "text-[#F97316]",
  danger: "text-[#DC2626]",
};

export default function ReportKpiGrid({ items }: { items: ReportKpiItem[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-xl border border-[#E2E8F0] bg-gradient-to-br from-white to-[#F8FAFC] p-4 ${
            item.large ? "md:col-span-2" : ""
          }`}
        >
          <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide">
            {item.label}
          </p>
          <p className={`text-[22px] font-bold mt-1 ${toneValue[item.tone ?? "default"]}`}>
            {item.value}
          </p>
          {item.change != null && item.change !== 0 ? (
            <p
              className={`inline-flex items-center gap-0.5 text-[11px] font-medium mt-1 ${
                item.change > 0 ? "text-[#16A34A]" : "text-[#DC2626]"
              }`}
            >
              {item.change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {item.change > 0 ? "+" : ""}
              {item.change}% vs anterior
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
