import { api } from "../lib/api";
import { useApiQuery } from "./useApiQuery";

export function useDashboardServiceOrdersInProgress() {
  return useApiQuery(["dashboard", "service-orders"], api.dashboardServiceOrdersInProgress);
}

export function useDashboardPendingQuotes() {
  return useApiQuery(["dashboard", "pending-quotes"], api.dashboardPendingQuotes);
}

export function useDashboardRevenueSeries() {
  return useApiQuery(["dashboard", "revenue-series"], api.dashboardRevenueSeries);
}
