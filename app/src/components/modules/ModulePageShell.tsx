import { Search, Plus } from "lucide-react";
import { useState } from "react";

interface ModulePageShellProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  onSearch?: (query: string) => void;
  children: React.ReactNode;
}

export default function ModulePageShell({
  title,
  description,
  actionLabel = "Novo",
  onAction,
  onSearch,
  children,
}: ModulePageShellProps) {
  const [query, setQuery] = useState("");

  return (
    <main className="px-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1E293B]">{title}</h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">{description}</p>
        </div>
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#0F3D4C] hover:bg-[#0E7490] text-white text-sm font-medium transition-colors shrink-0"
          >
            <Plus size={18} strokeWidth={1.5} />
            {actionLabel}
          </button>
        )}
      </div>

      {onSearch && (
        <div className="relative max-w-md mb-5">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
            strokeWidth={1.5}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onSearch(e.target.value);
            }}
            placeholder="Buscar..."
            className="w-full h-10 pl-10 pr-4 bg-white border border-[#E2E8F0] rounded-lg text-[13px] focus:outline-none focus:border-[#0E7490] focus:ring-1 focus:ring-[#0E7490]"
          />
        </div>
      )}

      {children}
    </main>
  );
}
