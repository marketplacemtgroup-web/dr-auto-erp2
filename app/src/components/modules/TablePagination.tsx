import { ChevronLeft, ChevronRight } from "lucide-react";

export interface TablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  take: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export default function TablePagination({
  page,
  totalPages,
  total,
  take,
  onPageChange,
  loading,
}: TablePaginationProps) {
  if (totalPages <= 1 && total <= take) return null;

  const from = total === 0 ? 0 : (page - 1) * take + 1;
  const to = Math.min(page * take, total);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-[#F1F5F9] bg-[#F8FAFC] text-sm text-[#64748B]">
      <p>
        {total === 0
          ? "Nenhum registro"
          : `Mostrando ${from}–${to} de ${total}`}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-[#E2E8F0] bg-white text-[#1E293B] disabled:opacity-40 hover:bg-[#F1F5F9]"
        >
          <ChevronLeft size={16} />
          Anterior
        </button>
        <span className="px-2 tabular-nums">
          {page} / {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || loading || totalPages === 0}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-[#E2E8F0] bg-white text-[#1E293B] disabled:opacity-40 hover:bg-[#F1F5F9]"
        >
          Próxima
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
