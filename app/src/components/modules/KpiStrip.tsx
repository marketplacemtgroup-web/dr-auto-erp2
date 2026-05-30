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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
      {items.map((item) => (
        <div key={item.label} className="bg-white rounded-xl card-shadow p-4">
          <p className="text-[11px] font-medium text-[#64748B] uppercase tracking-wide">
            {item.label}
          </p>
          <p
            className={`text-[20px] font-bold mt-1 ${toneValue[item.tone ?? "default"]}`}
          >
            {item.value}
          </p>
          {item.hint && <p className="text-[11px] text-[#94A3B8] mt-0.5">{item.hint}</p>}
        </div>
      ))}
    </div>
  );
}
