export function normalizePlate(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function normalizePlateOptional(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const plate = normalizePlate(value);
  return plate || undefined;
}

export function emptyToUndefined(value: unknown): unknown {
  if (value === '' || value === null) return undefined;
  return value;
}

export function optionalInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(String(value).replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return undefined;
  return Math.trunc(n);
}

/** Aceita 2024, 24 → 2024, 99 → 1999. */
export function optionalYear(value: unknown): number | undefined {
  const n = optionalInt(value);
  if (n === undefined) return undefined;
  if (n >= 1900 && n <= 2100) return n;
  if (n >= 0 && n <= 99) return n < 50 ? 2000 + n : 1900 + n;
  return n;
}
