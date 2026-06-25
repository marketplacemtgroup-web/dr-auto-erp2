import { useEffect, useRef } from "react";
import { usePortalStore } from "../../stores/portalStore";

const REFRESH_DEBOUNCE_MS = 60_000;

/**
 * Atualiza o resumo ao voltar para a aba (debounce 60s).
 * Orçamentos/OS são carregados sob demanda nas telas.
 */
export default function PortalPolling() {
  const refresh = usePortalStore((s) => s.refresh);
  const token = usePortalStore((s) => s.session?.accessToken);
  const lastRefresh = useRef(0);

  useEffect(() => {
    if (!token) return;

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefresh.current < REFRESH_DEBOUNCE_MS) return;
      lastRefresh.current = now;
      void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token, refresh]);

  return null;
}
