import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { VehicleRow } from "../../lib/api";
import { inputClass } from "../modules/FormDrawer";

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function normalizePlate(value: string) {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export function vehicleDisplayLabel(v: VehicleRow) {
  const model = [v.brand, v.model].filter(Boolean).join(" ");
  return `${v.customer.name} — ${v.plate}${model ? ` (${model})` : ""}`;
}

function matchesVehicle(vehicle: VehicleRow, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const plateQuery = normalizePlate(trimmed);
  if (normalizePlate(vehicle.plate).includes(plateQuery)) return true;

  const haystack = normalizeSearchText(
    `${vehicle.customer.name} ${vehicle.plate} ${vehicle.brand ?? ""} ${vehicle.model ?? ""}`,
  );
  return haystack.includes(normalizeSearchText(trimmed));
}

type Props = {
  vehicles?: VehicleRow[];
  value: string;
  onChange: (vehicleId: string) => void;
  loading?: boolean;
  required?: boolean;
  placeholder?: string;
};

export default function VehicleSearchSelect({
  vehicles,
  value,
  onChange,
  loading,
  required,
  placeholder = "Digite o nome do cliente ou a placa...",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => vehicles?.find((vehicle) => vehicle.id === value) ?? null,
    [vehicles, value],
  );

  const results = useMemo(() => {
    if (!vehicles?.length) return [];
    return vehicles.filter((vehicle) => matchesVehicle(vehicle, query)).slice(0, 12);
  }, [vehicles, query]);

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

  if (selected) {
    return (
      <div className="rounded-lg border border-[#0E7490]/30 bg-[#ECFEFF] px-3 py-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0F3D4C] truncate">{selected.customer.name}</p>
          <p className="text-[12px] text-[#64748B] mt-0.5">
            <span className="font-bold text-[#0E7490]">{selected.plate}</span>
            {[selected.brand, selected.model].filter(Boolean).length > 0
              ? ` · ${[selected.brand, selected.model].filter(Boolean).join(" ")}`
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
          placeholder={loading ? "Carregando veiculos..." : placeholder}
          disabled={loading}
          className={`${inputClass} pl-9`}
          autoComplete="off"
        />
      </div>

      {required ? <input type="hidden" value={value} required readOnly /> : null}

      {open && !loading ? (
        <div className="absolute z-10 left-0 right-0 mt-1.5 rounded-lg border border-[#E2E8F0] bg-white shadow-lg overflow-hidden">
          {!vehicles?.length ? (
            <p className="px-3 py-3 text-[12px] text-[#94A3B8]">Nenhum veiculo cadastrado.</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-[12px] text-[#94A3B8]">
              Nenhum resultado para &quot;{query.trim()}&quot;.
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
