import { canViewMoney } from "./permissions";
import { useAuthStore } from "../stores/authStore";

export function canViewMoneyValues(): boolean {
  return canViewMoney(useAuthStore.getState().session?.permissions);
}

export function formatMoney(
  value: string | number | null | undefined,
  options?: { forceHide?: boolean },
) {
  if (options?.forceHide || !canViewMoneyValues()) return "—";
  const n = Number(value ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatNegativeMoney(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  if (n <= 0) return formatMoney(0);
  return `− ${formatMoney(n)}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  // Valores "só data" (YYYY-MM-DD) ou meia-noite UTC vindos do backend (@db.Date)
  // devem ser exibidos literalmente. Converter com fuso local (UTC-3) jogaria
  // para o dia anterior — ex.: 2026-07-03T00:00:00Z apareceria como 02/07.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  const midnightUtc = /^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.000)?Z$/.exec(value);
  if (midnightUtc) {
    const [, y, m, d] = midnightUtc;
    return `${d}/${m}/${y}`;
  }
  return new Date(value).toLocaleDateString("pt-BR");
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
