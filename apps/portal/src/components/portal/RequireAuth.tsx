import { Navigate, Outlet } from "react-router";
import { routes } from "../../lib/routes";
import { usePortalStore } from "../../stores/portalStore";

export default function RequireAuth() {
  const session = usePortalStore((s) => s.session);
  if (!session?.accessToken) {
    return <Navigate to={routes.login} replace />;
  }
  return <Outlet />;
}
