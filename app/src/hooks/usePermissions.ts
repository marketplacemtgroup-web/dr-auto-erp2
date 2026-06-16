import { useAuthStore } from "../stores/authStore";
import {
  canViewFinancialDashboard,
  canViewMoney,
  hasPermission,
} from "../lib/permissions";

export function usePermissions() {
  const permissions = useAuthStore((s) => s.session?.permissions);

  return {
    permissions: permissions ?? [],
    has: (required: string | string[]) => hasPermission(permissions, required),
    canViewMoney: () => canViewMoney(permissions),
    canViewFinancialDashboard: () => canViewFinancialDashboard(permissions),
  };
}
