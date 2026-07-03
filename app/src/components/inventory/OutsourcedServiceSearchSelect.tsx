import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { api, type OutsourcedServiceRow } from "../../lib/api";
import { QUERY_GC_TIME_MS, QUERY_STALE_TIME_MS } from "../../lib/query-cache";
import { formatMoney } from "../../lib/format";
import { useAuthToken } from "../../hooks/useApiQuery";
import { inputClass } from "../modules/FormDrawer";

type Props = {
  value: string;
  onChange: (outsourcedServiceId: string, item: OutsourcedServiceRow | null) => void;
  placeholder?: string;
  allowManual?: boolean;
  manualLabel?: string;
};

export default function OutsourcedServiceSearchSelect({
  value,
  onChange,
  placeholder = "Digite o nome ou executor do serviço...",
  allowManual = true,
  manualLabel = "Manual / outro (sem vincular ao cadastro)",
}: Props) {
  const token = useAuthToken();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const searchEnabled = open && !!token && debouncedQuery.length > 0;

  const { data: searchResult, isLoading: searchLoading } = useQuery({
    queryKey: ["outsourced-services-search", debouncedQuery, token],
    queryFn: () => api.outsourcedServices(token!, debouncedQuery),
    enabled: searchEnabled,
    staleTime: QUERY_STALE_TIME_MS,
    gcTime: QUERY_GC_TIME_MS,
  });

  const { data: selectedItem } = useQuery({
    queryKey: ["outsourced-service-item", value, token],
    queryFn: () => api.outsourcedService(token!, value),
    enabled: !!token && !!value,
    staleTime: QUERY_STALE_TIME_MS,
    gcTime: QUERY_GC_TIME_MS,
  });

  const results = useMemo(() => searchResult ?? [], [searchResult]);

  useEffect(() => {
    if (!value) {
      setQuery("");
      setOpen(false);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function selectItem(item: OutsourcedServiceRow) {
    onChange(item.id, item);
    setQuery("");
    setOpen(false);
  }

  function clearSelection() {
    onChange("", null);
    setQuery("");
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  if (selectedItem && value) {
    return (
      <div className="rounded-lg border border-[#0E7490]/30 bg-[#ECFEFF] px-3 py-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0F3D4C] truncate">{selectedItem.name}</p>
          <p className="text-[12px] text-[#64748B] mt-0.5">
            {selectedItem.provider ?? "Sem executor"}
            {" · "}
            {formatMoney(selectedItem.salePrice)}
          </p>
        </div>
        <button
          type="button"
          onClick={clearSelection}
          className="p-1 rounded-md text-[#64748B] hover:bg-white hover:text-[#0F3D4C] shrink-0"
          aria-label="Trocar serviço terceirizado"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative space-y-2">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={searchLoading ? "Buscando serviços..." : placeholder}
          className={`${inputClass} pl-9`}
          autoComplete="off"
        />
      </div>

      {allowManual ? (
        <button
          type="button"
          className="text-[12px] text-[#64748B] hover:text-[#0E7490] hover:underline"
          onClick={() => {
            onChange("", null);
            setQuery("");
            setOpen(false);
          }}
        >
          {manualLabel}
        </button>
      ) : null}

      {open ? (
        <div className="absolute z-10 left-0 right-0 mt-1.5 rounded-lg border border-[#E2E8F0] bg-white shadow-lg overflow-hidden">
          {debouncedQuery.length === 0 ? (
            <p className="px-3 py-3 text-[12px] text-[#94A3B8]">Digite para buscar no cadastro.</p>
          ) : searchLoading ? (
            <p className="px-3 py-3 text-[12px] text-[#94A3B8]">Buscando...</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-[12px] text-[#94A3B8]">
              Nenhum serviço para &quot;{debouncedQuery}&quot;.
            </p>
          ) : (
            <ul className="max-h-52 overflow-y-auto py-1">
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => selectItem(item)}
                    className="w-full text-left px-3 py-2 hover:bg-[#F0F9FF] transition-colors"
                  >
                    <p className="text-sm font-medium text-[#1E293B] truncate">{item.name}</p>
                    <p className="text-[12px] text-[#64748B] mt-0.5">
                      {item.provider ?? "Sem executor"}
                      {" · "}
                      {formatMoney(item.salePrice)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
