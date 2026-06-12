import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { Bell } from "lucide-react";
import BrandLogo from "../BrandLogo";
import MotoBackground from "./MotoBackground";
import PortalBottomNav from "./PortalBottomNav";
import PortalPolling from "./PortalPolling";
import PortalPushBanner from "./PortalPushBanner";
import ThemeToggle from "./ThemeToggle";
import { routes } from "../../lib/routes";
import { usePortalStore, useUnreadNotificationCount } from "../../stores/portalStore";

const pageTitles: Record<string, string> = {
  [routes.home]: "Acompanhamento de OS",
  [routes.orders]: "Minhas OS",
  [routes.notifications]: "Notificações",
  [routes.profile]: "Perfil / Suporte",
};

export default function PortalAppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const loadNotifications = usePortalStore((s) => s.loadNotifications);
  const unread = useUnreadNotificationCount();
  const isDetailOs = /^\/os\/[^/]+$/.test(pathname);
  const showBottomNav = !isDetailOs && !pathname.startsWith("/perfil/");

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const title =
    pageTitles[pathname] ??
    (pathname.startsWith(routes.profile) ? "Perfil / Suporte" : "Portal do Cliente");

  return (
    <MotoBackground>
      <PortalPolling />
      <div className={`min-h-screen ${showBottomNav ? "pb-24" : "pb-6"}`}>
        {!isDetailOs ? (
          <header className="safe-area-top px-5 pt-4 pb-2">
            <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <BrandLogo context="compact" />
                <div className="min-w-0">
                  <p className="portal-text-muted text-[11px] truncate">{title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ThemeToggle className="hidden sm:inline-flex" />
                <button
                  type="button"
                  onClick={() => navigate(routes.notifications)}
                  className="relative p-2 rounded-full portal-card"
                  aria-label="Notificações"
                >
                  <Bell size={22} style={{ color: "var(--portal-accent)" }} />
                  {unread > 0 ? (
                    <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                  ) : null}
                </button>
              </div>
            </div>
          </header>
        ) : null}

        <main className={`max-w-lg mx-auto px-5 py-3 space-y-4 ${showBottomNav ? "pb-24" : "pb-8"}`}>
          <PortalPushBanner />
          <Outlet />
        </main>

        {showBottomNav ? <PortalBottomNav /> : null}
      </div>
    </MotoBackground>
  );
}

export function PortalSubpageHeader({
  title,
  backTo = routes.profile,
}: {
  title: string;
  backTo?: string;
}) {
  return (
    <div className="flex items-center gap-2 -mt-1 mb-2">
      <Link to={backTo} className="portal-accent text-sm font-medium">
        ← Voltar
      </Link>
      <h1 className="portal-text text-xl font-black flex-1">{title}</h1>
    </div>
  );
}
