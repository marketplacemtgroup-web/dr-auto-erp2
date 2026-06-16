import { useEffect } from "react";
import { usePortalStore } from "../../stores/portalStore";

const INTERVAL_MS = 30_000;

export default function PortalPolling() {
  const refresh = usePortalStore((s) => s.refresh);
  const loadNotifications = usePortalStore((s) => s.loadNotifications);
  const token = usePortalStore((s) => s.session?.accessToken);

  useEffect(() => {
    if (!token) return;
    const tick = () => {
      void refresh();
      void loadNotifications();
    };
    const id = window.setInterval(tick, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [token, refresh, loadNotifications]);

  return null;
}
