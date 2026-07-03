interface KpiItem {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
}

const toneValue: Record<string, string> = {
  default: "text-[#1E293B]",
  success: "text-[#16A34A]",
  warning: "text-[#F97316]",
  danger: "text-[#DC2626]",
};

export default function KpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3 mb-5">
      {items.map((item) => (
        <div key={item.label} className="bg-white rounded-xl card-shadow p-4 min-w-0 flex flex-col">
          <p className="text-[11px] font-medium text-[#64748B] uppercase tracking-wide break-words">
            {item.label}
          </p>
          <p
            className={`text-[clamp(15px,1.4vw+8px,20px)] font-bold mt-1 leading-tight tabular-nums break-words ${toneValue[item.tone ?? "default"]}`}
          >
            {item.value}
          </p>
          {item.hint && (
            <p className="text-[11px] text-[#94A3B8] mt-0.5 break-words">{item.hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}
