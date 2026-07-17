import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { usePortalStore } from "../stores/portalStore";

export function usePortalAttachmentUrl(
  attachmentId: string | null | undefined,
  enabled = true,
) {
  const token = usePortalStore((s) => s.session?.accessToken);
  return useQuery({
    queryKey: ["portal-attachment-url", attachmentId, token],
    queryFn: () => api.portalAttachmentUrl(token!, attachmentId!),
    enabled: enabled && !!token && !!attachmentId,
    staleTime: 23 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}
