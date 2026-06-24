import { useQuery } from "@tanstack/react-query";
import { QUERY_GC_TIME_MS, QUERY_STALE_TIME_MS } from "../lib/query-cache";
import { useAuthStore } from "../stores/authStore";

export function useAuthToken() {
  return useAuthStore((s) => s.session?.accessToken);
}

export function useApiQuery<T>(
  key: string[],
  fetcher: (token: string) => Promise<T>,
  enabled = true,
) {
  const token = useAuthToken();
  return useQuery({
    queryKey: [...key, token],
    queryFn: () => fetcher(token!),
    enabled: enabled && !!token,
    staleTime: QUERY_STALE_TIME_MS,
    gcTime: QUERY_GC_TIME_MS,
    retry: 2,
    placeholderData: (prev) => prev,
  });
}
