export default function ReportRankList({
  rows,
  empty = "Sem dados no periodo.",
}: {
  rows?: Array<{ key: string; label: string; value: string }>;
  empty?: string;
}) {
  if (!rows?.length) {
    return <p className="text-sm text-[#94A3B8]">{empty}</p>;
  }
  return (
    <ul className="max-h-52 overflow-y-auto space-y-2 text-[13px]">
      {rows.map((row) => (
        <li key={row.key} className="flex justify-between gap-2 border-b border-[#F1F5F9] pb-2">
          <span className="truncate text-[#1E293B]">{row.label}</span>
          <span className="text-[#64748B] shrink-0">{row.value}</span>
        </li>
      ))}
    </ul>
  );
}
