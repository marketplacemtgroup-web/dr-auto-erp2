import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

export function useDashboardKpis() {
  const token = useAuthStore((s) => s.session?.accessToken);

  return useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: () => api.dashboardKpis(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
}
