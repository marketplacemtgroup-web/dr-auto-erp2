import { useQuery } from "@tanstack/react-query";
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
    staleTime: 30_000,
    retry: 2,
    placeholderData: (prev) => prev,
  });
}
