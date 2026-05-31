import { Pencil, Trash2 } from "lucide-react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T extends { id: string }> {
  columns: DataTableColumn<T>[];
  rows: T[];
  loading?: boolean;
  error?: Error | null;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
}

export default function DataTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  error,
  emptyMessage = "Nenhum registro encontrado.",
  onRowClick,
  onEdit,
  onDelete,
}: DataTableProps<T>) {
  const showActions = onEdit || onDelete;

  if (loading && rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center text-sm text-[#64748B]">
        Carregando...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center text-sm text-red-600">
        {error.message}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8FAFC] text-left text-[#64748B] text-xs uppercase tracking-wide">
              {columns.map((c) => (
                <th key={c.key} className={`px-4 py-3 font-medium ${c.className ?? ""}`}>
                  {c.header}
                </th>
              ))}
              {showActions && <th className="px-4 py-3 w-24" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showActions ? 1 : 0)}
                  className="px-4 py-10 text-center text-[#94A3B8]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-t border-[#F1F5F9] hover:bg-[#F8FAFC] ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 text-[#1E293B] ${c.className ?? ""}`}>
                      {c.render(row)}
                    </td>
                  ))}
                  {showActions && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(row)}
                            className="p-2 rounded-lg hover:bg-[#E2E8F0] text-[#64748B]"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(row)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
