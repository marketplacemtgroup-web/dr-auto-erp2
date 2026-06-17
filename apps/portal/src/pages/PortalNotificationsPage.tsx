import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, Loader2 } from "lucide-react";
import EmptyState from "../components/portal/EmptyState";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { routes } from "../lib/routes";
import { usePortalStore } from "../stores/portalStore";

export default function PortalNotificationsPage() {
  const navigate = useNavigate();
  const session = usePortalStore((s) => s.session);
  const notifications = usePortalStore((s) => s.notifications);
  const loadNotifications = usePortalStore((s) => s.loadNotifications);
  const markAllNotificationsRead = usePortalStore((s) => s.markAllNotificationsRead);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    setLoading(true);
    void loadNotifications().finally(() => setLoading(false));
  }, [loadNotifications]);

  async function handleClick(id: string, serviceOrderId: string | null, quoteId: string | null) {
    if (!session?.accessToken) return;
    await api.portalMarkNotificationRead(session.accessToken, id);
    await loadNotifications();
    if (quoteId) {
      navigate(routes.quote(quoteId));
      return;
    }
    if (serviceOrderId) {
      navigate(routes.serviceOrder(serviceOrderId));
    }
  }

  async function handleMarkAll() {
    setMarking(true);
    try {
      await markAllNotificationsRead();
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="portal-text text-2xl font-black">Notificações</h1>
        {notifications.some((n) => !n.read) ? (
          <button
            type="button"
            disabled={marking}
            onClick={() => void handleMarkAll()}
            className="portal-card px-3 py-1.5 text-xs font-semibold portal-accent"
          >
            {marking ? "..." : "Marcar lidas"}
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin portal-text-muted" size={24} />
        </div>
      ) : notifications.length === 0 ? (
        <div className="portal-card">
          <EmptyState
            icon={Bell}
            title="Sem notificações"
            description="Fique por dentro de tudo que importa quando enviarmos alertas."
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => void handleClick(n.id, n.serviceOrderId, n.quoteId)}
                className="portal-card w-full p-4 text-left"
                style={{
                  opacity: n.read ? 0.75 : 1,
                  borderLeftWidth: 3,
                  borderLeftColor: n.read ? "transparent" : "var(--portal-accent)",
                }}
              >
                <p className="portal-text font-semibold text-sm">{n.title}</p>
                <p className="portal-text-muted text-sm mt-1">{n.body}</p>
                <p className="portal-text-muted text-[11px] mt-2">
                  {formatDateTime(n.createdAt)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
