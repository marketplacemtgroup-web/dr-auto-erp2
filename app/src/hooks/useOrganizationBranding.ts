import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { QUERY_STALE_TIME_MS } from "../lib/query-cache";
import { useAuthStore } from "../stores/authStore";

export function useOrganizationBranding() {
  const token = useAuthStore((s) => s.session?.accessToken ?? null);

  const { data: org } = useQuery({
    queryKey: ["organization"],
    queryFn: () => api.organization(token!),
    enabled: !!token,
    staleTime: QUERY_STALE_TIME_MS,
  });

  useEffect(() => {
    const root = document.documentElement;
    if (org?.primaryColor) {
      root.style.setProperty("--brand-primary", org.primaryColor);
    }
    if (org?.accentColor) {
      root.style.setProperty("--brand-accent", org.accentColor);
    }
  }, [org?.primaryColor, org?.accentColor]);

  return org;
}
