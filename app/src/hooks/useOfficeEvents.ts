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

const DEFAULT_POLL_MS = 300_000;

export type UseOfficeEventsOptions = {
  enabled?: boolean;
  /** null = sem intervalo (só poll inicial e ao focar aba) */
  pollIntervalMs?: number | null;
};

/** Polling de notificações (substitui SSE — compatível com Vercel serverless). */
export function useOfficeEvents(
  onEvent?: (ev: OfficeLiveEvent) => void,
  options?: UseOfficeEventsOptions,
) {
  const token = useAuthStore((s) => s.session?.accessToken);
  const [polling, setPolling] = useState(false);
  const handlerRef = useRef(onEvent);
  const seenRef = useRef(new Set<string>());
  const enabled = options?.enabled ?? true;
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_MS;
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!token || !enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      if (!token || cancelled || document.visibilityState !== "visible") return;
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

    const startInterval = () => {
      if (timer || pollIntervalMs == null) return;
      timer = window.setInterval(() => void poll(), pollIntervalMs);
    };

    const stopInterval = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void poll();
        startInterval();
      } else {
        stopInterval();
      }
    };

    if (document.visibilityState === "visible") {
      void poll();
      startInterval();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      stopInterval();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token, enabled, pollIntervalMs]);

  return { connected: polling, polling: true };
}
