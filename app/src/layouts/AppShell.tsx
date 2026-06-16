import { Outlet } from "react-router";
import OfficeNotificationPopup from "../components/OfficeNotificationPopup";
import RoutePermissionGuard from "../components/RoutePermissionGuard";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { useOrganizationBranding } from "../hooks/useOrganizationBranding";

export default function AppShell() {
  useOrganizationBranding();
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <div className="app-shell-sidebar">
        <Sidebar />
      </div>
      <div className="app-shell-main lg:ml-[240px] min-h-screen brand-watermark-bg">
        <div className="app-shell-topbar">
          <Topbar />
        </div>
        <RoutePermissionGuard>
          <Outlet />
        </RoutePermissionGuard>
        <OfficeNotificationPopup />
      </div>
    </div>
  );
}
