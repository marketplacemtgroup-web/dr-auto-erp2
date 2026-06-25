import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
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

/** 5 minutos — reduz egress vs 60s anterior. */
const POLL_MS = 300_000;

type NotificationPollingContextValue = {
  subscribe: (handler: (ev: OfficeLiveEvent) => void) => () => void;
  polling: boolean;
};

const NotificationPollingContext = createContext<NotificationPollingContextValue | null>(
  null,
);

export function NotificationPollingProvider({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.session?.accessToken);
  const handlersRef = useRef(new Set<(ev: OfficeLiveEvent) => void>());
  const seenRef = useRef(new Set<string>());
  const pollingRef = useRef(false);

  const subscribe = useCallback((handler: (ev: OfficeLiveEvent) => void) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    let timer: number | undefined;

    async function poll() {
      if (!token || cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      pollingRef.current = true;
      try {
        const rows = await api.notificationsUnread(token);
        for (const r of rows) {
          if (!r.type.startsWith("quote.")) continue;
          if (seenRef.current.has(r.id)) continue;
          seenRef.current.add(r.id);
          const ev: OfficeLiveEvent = {
            type: r.type,
            title: r.title,
            message: r.message,
            metadata: r.metadata as Record<string, unknown>,
            createdAt: r.createdAt,
            id: r.id,
          };
          handlersRef.current.forEach((h) => h(ev));
        }
      } catch {
        /* retry next cycle */
      } finally {
        pollingRef.current = false;
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

  return (
    <NotificationPollingContext.Provider
      value={{
        subscribe,
        get polling() {
          return pollingRef.current;
        },
      }}
    >
      {children}
    </NotificationPollingContext.Provider>
  );
}

export function useNotificationPolling() {
  const ctx = useContext(NotificationPollingContext);
  if (!ctx) {
    return {
      subscribe: (_handler: (ev: OfficeLiveEvent) => void) => () => {},
      polling: false,
    };
  }
  return ctx;
}

/** @deprecated Use useNotificationPolling dentro de NotificationPollingProvider */
export function useOfficeEvents(onEvent?: (ev: OfficeLiveEvent) => void) {
  const { subscribe } = useNotificationPolling();
  useEffect(() => {
    if (!onEvent) return;
    return subscribe(onEvent);
  }, [onEvent, subscribe]);
  return { connected: false, polling: false };
}
