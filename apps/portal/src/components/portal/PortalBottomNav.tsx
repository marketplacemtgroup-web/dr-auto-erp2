import { Link, useLocation } from "react-router";
import { Bell, ClipboardList, Home, User } from "lucide-react";
import { routes } from "../../lib/routes";
import { useUnreadNotificationCount } from "../../stores/portalStore";

const tabs = [
  { to: routes.home, label: "Início", icon: Home, match: (p: string) => p === routes.home },
  {
    to: routes.orders,
    label: "OS",
    icon: ClipboardList,
    match: (p: string) => p === routes.orders || p.startsWith("/os/"),
  },
  {
    to: routes.notifications,
    label: "Notificações",
    icon: Bell,
    match: (p: string) => p === routes.notifications,
  },
  {
    to: routes.profile,
    label: "Perfil",
    icon: User,
    match: (p: string) => p.startsWith(routes.profile),
  },
] as const;

export default function PortalBottomNav() {
  const { pathname } = useLocation();
  const unread = useUnreadNotificationCount();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t safe-area-bottom"
      style={{
        background: "var(--portal-nav-bg)",
        borderColor: "var(--portal-border)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="max-w-lg mx-auto flex items-stretch justify-around px-2 py-2">
        {tabs.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-1 flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition-colors"
              style={{ color: active ? "var(--portal-accent)" : "var(--portal-text-muted)" }}
            >
              <span
                className="relative flex h-9 w-12 items-center justify-center rounded-2xl transition-colors"
                style={{
                  background: active ? "var(--portal-primary)" : "transparent",
                  color: active ? "#fff" : "inherit",
                }}
              >
                <Icon size={20} strokeWidth={active ? 2.25 : 2} />
                {label === "Notificações" && unread > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white" />
                ) : null}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
