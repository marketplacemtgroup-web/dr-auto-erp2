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

const POLL_MS = 20_000;

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

    async function poll() {
      if (!token || cancelled) return;
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

    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token]);

  return { connected: polling, polling: true };
}
