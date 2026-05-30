import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../stores/authStore";

export type OfficeLiveEvent = {
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

function resolveApiBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";
  if (!fromEnv) return "";
  if (typeof window === "undefined") return fromEnv.replace(/\/$/, "");
  const pointsToLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(fromEnv);
  const onLocalhost =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (pointsToLocalhost && !onLocalhost) return "";
  return fromEnv.replace(/\/$/, "");
}

export function useOfficeEvents(onEvent?: (ev: OfficeLiveEvent) => void) {
  const token = useAuthStore((s) => s.session?.accessToken);
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!token) return;
    const base = resolveApiBaseUrl();
    const url = `${base}/api/events/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data) as OfficeLiveEvent;
        handlerRef.current?.(data);
      } catch {
        /* ignore */
      }
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [token]);

  return { connected };
}
