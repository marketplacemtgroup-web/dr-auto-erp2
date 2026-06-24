import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

export type OfficeLiveEvent = {
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  id?: string;
};

/** Com aba visível; pausa quando minimizada (reduz egress do banco). */
const POLL_MS = 60_000;

/** Polling de notificações (substitui SSE — compatível com Vercel serverless). */
export function useOfficeEvents(onEvent?: (ev: OfficeLiveEvent) => void) {
  const token = useAuthStore((s) => s.session?.accessToken);
  const [polling, setPolling] = useState(false);
  const handlerRef = useRef(onEvent);
  const seenRef = useRef(new Set<string>());
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    let timer: number | undefined;

    async function poll() {
      if (!token || cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      setPolling(true);
      try {
        const rows = await api.notificationsUnread(token);
        for (const r of rows) {
          if (!r.type.startsWith("quote.")) continue;
          if (seenRef.current.has(r.id)) continue;
          seenRef.current.add(r.id);
          handlerRef.current?.({
            type: r.type,
            title: r.title,
            message: r.message,
            metadata: r.metadata as Record<string, unknown>,
            createdAt: r.createdAt,
            id: r.id,
          });
        }
      } catch {
        /* API indisponível — tenta de novo no próximo ciclo */
      } finally {
        if (!cancelled) setPolling(false);
      }
    }

    const schedule = () => {
      void poll();
      timer = window.setInterval(() => void poll(), POLL_MS);
    };

    schedule();

    const onVisibility = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer != null) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token]);

  return { connected: polling, polling: true };
}
