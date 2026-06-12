import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { usePermissions } from "../hooks/usePermissions";
import { permissionForPath } from "../lib/permissions";
import { routes } from "../lib/routes";

export default function RoutePermissionGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { has } = usePermissions();
  const required = permissionForPath(location.pathname);

  if (required && !has(required)) {
    return <Navigate to={routes.dashboardHome} replace />;
  }

  return <>{children}</>;
}
