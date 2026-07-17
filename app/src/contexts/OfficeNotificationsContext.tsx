import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useLocation } from "react-router";
import { useAuthStore } from "../stores/authStore";
import { useOfficeEvents, type OfficeLiveEvent } from "../hooks/useOfficeEvents";

const POLL_MS = 300_000;

type Subscriber = (ev: OfficeLiveEvent) => void;

type OfficeNotificationsContextValue = {
  subscribe: (fn: Subscriber) => () => void;
};

const OfficeNotificationsContext = createContext<OfficeNotificationsContextValue | null>(null);

function isNotificationRoute(path: string): boolean {
  return (
    path === "/dashboard" ||
    path.startsWith("/dashboard/orcamentos") ||
    path.startsWith("/dashboard/ordem-de-servico")
  );
}

export function OfficeNotificationsProvider({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.session?.accessToken);
  const location = useLocation();
  const subscribers = useRef(new Set<Subscriber>());

  const enabled = !!token && isNotificationRoute(location.pathname);

  const subscribe = useCallback((fn: Subscriber) => {
    subscribers.current.add(fn);
    return () => {
      subscribers.current.delete(fn);
    };
  }, []);

  const value = useMemo(() => ({ subscribe }), [subscribe]);

  useOfficeEvents(
    (ev) => {
      for (const fn of subscribers.current) fn(ev);
    },
    { enabled, pollIntervalMs: enabled ? POLL_MS : null },
  );

  return (
    <OfficeNotificationsContext.Provider value={value}>
      {children}
    </OfficeNotificationsContext.Provider>
  );
}

export function useOfficeNotificationEvents(onEvent: (ev: OfficeLiveEvent) => void) {
  const ctx = useContext(OfficeNotificationsContext);
  if (!ctx) {
    throw new Error("useOfficeNotificationEvents requires OfficeNotificationsProvider");
  }
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    return ctx.subscribe((ev) => handlerRef.current(ev));
  }, [ctx]);
}
