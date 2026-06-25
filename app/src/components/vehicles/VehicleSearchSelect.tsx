import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { api, type VehicleRow } from "../../lib/api";
import { QUERY_GC_TIME_MS, QUERY_STALE_TIME_MS } from "../../lib/query-cache";
import { useAuthToken } from "../../hooks/useApiQuery";
import { inputClass } from "../modules/FormDrawer";

const PICKER_LIMIT = 50;

export function vehicleDisplayLabel(v: VehicleRow) {
  const model = [v.brand, v.model].filter(Boolean).join(" ");
  return `${v.customer.name} — ${v.plate}${model ? ` (${model})` : ""}`;
}

type Props = {
  value: string;
  onChange: (vehicleId: string) => void;
  required?: boolean;
  placeholder?: string;
};

export default function VehicleSearchSelect({
  value,
  onChange,
  required,
  placeholder = "Digite o nome do cliente ou a placa...",
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

  const searchEnabled = open && !!token;

  const { data: searchResult, isLoading: searchLoading } = useQuery({
    queryKey: ["vehicles-search", debouncedQuery, token],
    queryFn: () =>
      api.vehicles(token!, debouncedQuery || undefined, 1, PICKER_LIMIT),
    enabled: searchEnabled,
    staleTime: QUERY_STALE_TIME_MS,
    gcTime: QUERY_GC_TIME_MS,
  });

  const { data: selectedVehicle } = useQuery({
    queryKey: ["vehicle", value, token],
    queryFn: () => api.vehicle(token!, value),
    enabled: !!token && !!value,
    staleTime: QUERY_STALE_TIME_MS,
    gcTime: QUERY_GC_TIME_MS,
  });

  const results = useMemo(() => searchResult?.data ?? [], [searchResult]);

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

  function selectVehicle(vehicle: VehicleRow) {
    onChange(vehicle.id);
    setQuery("");
    setOpen(false);
  }

  function clearSelection() {
    onChange("");
    setQuery("");
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  if (selectedVehicle && value) {
    return (
      <div className="rounded-lg border border-[#0E7490]/30 bg-[#ECFEFF] px-3 py-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0F3D4C] truncate">
            {selectedVehicle.customer.name}
          </p>
          <p className="text-[12px] text-[#64748B] mt-0.5">
            <span className="font-bold text-[#0E7490]">{selectedVehicle.plate}</span>
            {[selectedVehicle.brand, selectedVehicle.model].filter(Boolean).length > 0
              ? ` · ${[selectedVehicle.brand, selectedVehicle.model].filter(Boolean).join(" ")}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={clearSelection}
          className="p-1 rounded-md text-[#64748B] hover:bg-white hover:text-[#0F3D4C] shrink-0"
          aria-label="Trocar veiculo"
        >
          <X size={16} />
        </button>
        {required ? <input type="hidden" value={value} required readOnly /> : null}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
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
          placeholder={searchLoading ? "Buscando veiculos..." : placeholder}
          className={`${inputClass} pl-9`}
          autoComplete="off"
        />
      </div>

      {required ? <input type="hidden" value={value} required readOnly /> : null}

      {open ? (
        <div className="absolute z-10 left-0 right-0 mt-1.5 rounded-lg border border-[#E2E8F0] bg-white shadow-lg overflow-hidden">
          {searchLoading ? (
            <p className="px-3 py-3 text-[12px] text-[#94A3B8]">Buscando...</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-[12px] text-[#94A3B8]">
              {debouncedQuery
                ? `Nenhum resultado para "${debouncedQuery}".`
                : "Digite para buscar cliente ou placa."}
            </p>
          ) : (
            <ul className="max-h-52 overflow-y-auto py-1">
              {results.map((vehicle) => (
                <li key={vehicle.id}>
                  <button
                    type="button"
                    onClick={() => selectVehicle(vehicle)}
                    className="w-full text-left px-3 py-2 hover:bg-[#F0F9FF] transition-colors"
                  >
                    <p className="text-sm font-medium text-[#1E293B] truncate">
                      {vehicle.customer.name}
                    </p>
                    <p className="text-[12px] text-[#64748B] mt-0.5">
                      <span className="font-semibold text-[#0E7490]">{vehicle.plate}</span>
                      {[vehicle.brand, vehicle.model].filter(Boolean).length > 0
                        ? ` · ${[vehicle.brand, vehicle.model].filter(Boolean).join(" ")}`
                        : ""}
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
