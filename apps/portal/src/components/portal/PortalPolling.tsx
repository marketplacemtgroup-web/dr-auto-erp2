import { useEffect } from "react";
import { usePortalStore } from "../../stores/portalStore";

/**
 * Atualiza o dashboard só ao voltar para a aba (sem polling em background).
 * Alertas urgentes devem vir via Web Push (PortalPushBanner).
 */
export default function PortalPolling() {
  const refresh = usePortalStore((s) => s.refresh);
  const token = usePortalStore((s) => s.session?.accessToken);

  useEffect(() => {
    if (!token) return;

    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token, refresh]);

  return null;
}
