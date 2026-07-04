export type ProfitMetricItem = {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger" | "expense";
};

const cardTone: Record<NonNullable<ProfitMetricItem["tone"]>, string> = {
  default: "border-[#E2E8F0] bg-white",
  success: "border-[#E2E8F0] bg-white",
  danger: "border-[#E2E8F0] bg-white",
  expense: "border-[#FECACA] bg-[#FEF2F2]",
};

const labelTone: Record<NonNullable<ProfitMetricItem["tone"]>, string> = {
  default: "text-[#64748B]",
  success: "text-[#64748B]",
  danger: "text-[#64748B]",
  expense: "text-[#991B1B]",
};

const valueTone: Record<NonNullable<ProfitMetricItem["tone"]>, string> = {
  default: "text-[#1E293B]",
  success: "text-[#16A34A]",
  danger: "text-[#DC2626]",
  expense: "text-[#DC2626]",
};

export default function ReportProfitMetricGrid({ items }: { items: ProfitMetricItem[] }) {
  return (
    <div
      className="grid gap-3 w-full"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 9.5rem), 1fr))" }}
    >
      {items.map((item) => {
        const tone = item.tone ?? "default";
        return (
          <div
            key={item.label}
            className={`rounded-xl border p-3 sm:p-4 min-w-0 ${cardTone[tone]}`}
          >
            <p className={`text-[11px] sm:text-xs leading-snug ${labelTone[tone]}`}>
              {item.label}
            </p>
            <p
              className={`mt-1.5 text-sm sm:text-base lg:text-lg font-bold tabular-nums leading-tight break-words ${valueTone[tone]}`}
            >
              {item.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
