import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { normalizeDashboardKpis } from "../lib/normalizeDashboardKpis";
import { QUERY_STALE_TIME_MS } from "../lib/query-cache";
import { useAuthStore } from "../stores/authStore";
import { usePermissions } from "./usePermissions";

export function useDashboardBundle() {
  const token = useAuthStore((s) => s.session?.accessToken);
  const { canViewFinancialDashboard } = usePermissions();
  const showFinancial = canViewFinancialDashboard();

  const summary = useQuery({
    queryKey: ["dashboard", "bundle", "summary", token],
    queryFn: async () => {
      const raw = await api.dashboardSummary(token!);
      return {
        operational: normalizeDashboardKpis(raw.operational),
        financial: raw.financial
          ? normalizeDashboardKpis(raw.financial)
          : undefined,
      };
    },
    enabled: !!token,
    staleTime: QUERY_STALE_TIME_MS,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const alerts = useQuery({
    queryKey: ["dashboard", "bundle", "alerts", token],
    queryFn: () => api.dashboardAlerts(token!),
    enabled: !!token,
    staleTime: QUERY_STALE_TIME_MS,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const charts = useQuery({
    queryKey: ["dashboard", "bundle", "charts", token, showFinancial],
    queryFn: () => api.dashboardCharts(token!),
    enabled: !!token,
    staleTime: QUERY_STALE_TIME_MS,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const operational = summary.data?.operational;
  const financial = showFinancial ? summary.data?.financial : undefined;

  const kpis =
    operational || financial
      ? normalizeDashboardKpis({
          ...(operational ?? {}),
          ...(financial ?? {}),
        } as Parameters<typeof normalizeDashboardKpis>[0])
      : undefined;

  const isLoading =
    summary.isLoading || alerts.isLoading || charts.isLoading;
  const isError = summary.isError || alerts.isError || charts.isError;
  const error = summary.error ?? alerts.error ?? charts.error;
  const isFetching =
    summary.isFetching || alerts.isFetching || charts.isFetching;

  const refetch = async () => {
    await Promise.all([summary.refetch(), alerts.refetch(), charts.refetch()]);
  };

  return {
    summary,
    alerts,
    charts,
    operational,
    financial,
    kpis,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    showFinancial,
  };
}
