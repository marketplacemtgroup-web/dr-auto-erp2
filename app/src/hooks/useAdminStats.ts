import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

export function useAdminStats() {
  const token = useAuthStore((s) => s.session?.accessToken);

  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => api.adminStats(token!),
    enabled: !!token,
  });
}
