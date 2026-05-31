import ModulePageShell from "./ModulePageShell";

interface Column {
  key: string;
  label: string;
  align?: "left" | "right";
  render?: (row: Record<string, string>) => React.ReactNode;
}

interface SimpleDataPageProps {
  title: string;
  description: string;
  actionLabel?: string;
  columns: Column[];
  rows: Record<string, string>[];
}

export default function SimpleDataPage({
  title,
  description,
  actionLabel,
  columns,
  rows,
}: SimpleDataPageProps) {
  return (
    <ModulePageShell
      title={title}
      description={description}
      actionLabel={actionLabel}
      onAction={() => alert(`Funcao "${actionLabel}" em desenvolvimento.`)}
    >
      <div className="bg-white rounded-xl card-shadow overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#F1F5F9] text-[11px] font-medium text-[#64748B] uppercase tracking-wide">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-5 py-3 ${c.align === "right" ? "text-right" : ""}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC]"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-5 py-3.5 text-[13px] text-[#64748B] ${
                      c.align === "right" ? "text-right font-medium text-[#1E293B]" : ""
                    }`}
                  >
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModulePageShell>
  );
}
