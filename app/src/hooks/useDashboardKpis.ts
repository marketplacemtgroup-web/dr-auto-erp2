import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { normalizeDashboardKpis } from "../lib/normalizeDashboardKpis";
import { QUERY_STALE_TIME_MS } from "../lib/query-cache";
import { useAuthStore } from "../stores/authStore";
import { usePermissions } from "./usePermissions";

export function useDashboardOperationalKpis() {
  const token = useAuthStore((s) => s.session?.accessToken);

  return useQuery({
    queryKey: ["dashboard", "kpis", "operational", token],
    queryFn: async () =>
      normalizeDashboardKpis(await api.dashboardOperationalKpis(token!)),
    enabled: !!token,
    staleTime: QUERY_STALE_TIME_MS,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

export function useDashboardFinancialKpis(enabled = true) {
  const token = useAuthStore((s) => s.session?.accessToken);

  return useQuery({
    queryKey: ["dashboard", "kpis", "financial", token],
    queryFn: async () =>
      normalizeDashboardKpis(await api.dashboardFinancialKpis(token!)),
    enabled: enabled && !!token,
    staleTime: QUERY_STALE_TIME_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/** Operacional + financeiro (quando permitido). */
export function useDashboardKpis() {
  const { canViewFinancialDashboard } = usePermissions();
  const showFinancial = canViewFinancialDashboard();
  const operational = useDashboardOperationalKpis();
  const financial = useDashboardFinancialKpis(showFinancial);

  const isLoading = operational.isLoading || (showFinancial && financial.isLoading);
  const isError = operational.isError || (showFinancial && financial.isError);
  const error = operational.error ?? financial.error;
  const isFetching = operational.isFetching || financial.isFetching;

  const data =
    operational.data || (showFinancial && financial.data)
      ? normalizeDashboardKpis({
          ...(operational.data ?? {}),
          ...(showFinancial ? (financial.data ?? {}) : {}),
        } as Parameters<typeof normalizeDashboardKpis>[0])
      : undefined;

  const refetch = async () => {
    await operational.refetch();
    if (showFinancial) await financial.refetch();
  };

  return {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    operational,
    financial,
  };
}
