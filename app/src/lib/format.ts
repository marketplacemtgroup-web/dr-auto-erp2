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
