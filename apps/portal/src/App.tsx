import { Navigate, Route, Routes } from "react-router";
import BrandingBootstrap from "./components/BrandingBootstrap";
import PortalAppLayout from "./components/portal/PortalAppLayout";
import RequireAuth from "./components/portal/RequireAuth";
import PortalAccessPage from "./pages/PortalAccessPage";
import PortalHomePage from "./pages/PortalHomePage";
import PortalLoginPage from "./pages/PortalLoginPage";
import PortalNotificationsPage from "./pages/PortalNotificationsPage";
import PortalOrdersPage from "./pages/PortalOrdersPage";
import PortalProfilePage from "./pages/PortalProfilePage";
import PortalQuotePage from "./pages/PortalQuotePage";
import PortalServiceOrderPage from "./pages/PortalServiceOrderPage";
import PortalSplashPage from "./pages/PortalSplashPage";
import PortalProfileDataPage from "./pages/profile/PortalProfileDataPage";
import PortalProfileHistoryPage from "./pages/profile/PortalProfileHistoryPage";
import PortalProfilePrivacyPage from "./pages/profile/PortalProfilePrivacyPage";
import PortalProfileSupportPage from "./pages/profile/PortalProfileSupportPage";
import PortalProfileVehiclesPage from "./pages/profile/PortalProfileVehiclesPage";
import PublicQuotePage from "./pages/PublicQuotePage";
import { routes } from "./lib/routes";

export default function App() {
  return (
    <>
      <BrandingBootstrap />
      <Routes>
      <Route path={routes.splash} element={<PortalSplashPage />} />
      <Route path={routes.login} element={<PortalLoginPage />} />
      <Route path="/acesso/:token" element={<PortalAccessPage />} />
      <Route path="/orcamento/:token" element={<PublicQuotePage />} />

      <Route element={<RequireAuth />}>
        <Route element={<PortalAppLayout />}>
          <Route path={routes.home} element={<PortalHomePage />} />
          <Route path={routes.orders} element={<PortalOrdersPage />} />
          <Route path="/os/:id" element={<PortalServiceOrderPage />} />
          <Route path="/orcamentos/:id" element={<PortalQuotePage />} />
          <Route path={routes.notifications} element={<PortalNotificationsPage />} />
          <Route path={routes.profile} element={<PortalProfilePage />} />
          <Route path={routes.profileSupport} element={<PortalProfileSupportPage />} />
          <Route path={routes.profileData} element={<PortalProfileDataPage />} />
          <Route path={routes.profileVehicles} element={<PortalProfileVehiclesPage />} />
          <Route path={routes.profileHistory} element={<PortalProfileHistoryPage />} />
          <Route path={routes.profilePrivacy} element={<PortalProfilePrivacyPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={routes.splash} replace />} />
    </Routes>
    </>
  );
}
