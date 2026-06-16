import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

export function useOrganizationBranding() {
  const token = useAuthStore((s) => s.session?.accessToken ?? null);

  const { data: org } = useQuery({
    queryKey: ["organization"],
    queryFn: () => api.organization(token!),
    enabled: !!token,
    staleTime: 60_000,
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
