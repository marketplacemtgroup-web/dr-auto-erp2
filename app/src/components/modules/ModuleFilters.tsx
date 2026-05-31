export default function ModuleFilters({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-end gap-3 mb-5">{children}</div>;
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#64748B] mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 min-w-[160px] px-3 rounded-lg border border-[#E2E8F0] text-sm bg-white focus:outline-none focus:border-[#0E7490]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
