export function normalizePlate(raw: string) {
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function parseOptionalKm(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.trunc(n);
}

/** Aceita 2024, 24 → 2024, 99 → 1999. */
export function parseOptionalYear(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed.replace(/\D/g, ""));
  if (!Number.isFinite(n)) return undefined;
  if (n >= 1900 && n <= 2100) return Math.trunc(n);
  if (n >= 0 && n <= 99) return n < 50 ? 2000 + n : 1900 + n;
  return Math.trunc(n);
}

export function validateVehicleForm(input: {
  customerId: string;
  plate: string;
  year: string;
  currentKm: string;
}): string | null {
  if (!input.customerId) return "Selecione um cliente.";
  const plate = normalizePlate(input.plate);
  if (plate.length !== 7) {
    return "Placa deve ter 7 caracteres (ex.: ABC1D23 ou ABC1234).";
  }
  if (input.year.trim()) {
    const year = parseOptionalYear(input.year);
    if (year === undefined || year < 1900 || year > 2100) {
      return "Ano inválido. Use 4 dígitos (ex.: 2020).";
    }
  }
  if (input.currentKm.trim() && parseOptionalKm(input.currentKm) === undefined) {
    return "KM inválido. Use apenas números.";
  }
  return null;
}
