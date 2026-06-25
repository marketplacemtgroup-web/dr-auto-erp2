import { api } from "../lib/api";
import { useApiQuery } from "./useApiQuery";

export function useDashboardServiceOrdersInProgress(enabled = true) {
  return useApiQuery(
    ["dashboard", "service-orders"],
    api.dashboardServiceOrdersInProgress,
    enabled,
  );
}

export function useDashboardPendingQuotes(enabled = true) {
  return useApiQuery(
    ["dashboard", "pending-quotes"],
    api.dashboardPendingQuotes,
    enabled,
  );
}

export function useDashboardRevenueSeries(enabled = true) {
  return useApiQuery(
    ["dashboard", "revenue-series"],
    api.dashboardRevenueSeries,
    enabled,
  );
}
