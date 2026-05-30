import { Navigate, Route, Routes } from "react-router";
import PortalLoginPage from "./pages/PortalLoginPage";
import PortalHomePage from "./pages/PortalHomePage";
import PortalAccessPage from "./pages/PortalAccessPage";
import PortalServiceOrderPage from "./pages/PortalServiceOrderPage";
import PublicQuotePage from "./pages/PublicQuotePage";
import { routes } from "./lib/routes";

export default function App() {
  return (
    <Routes>
      <Route path={routes.login} element={<PortalLoginPage />} />
      <Route path={routes.home} element={<PortalHomePage />} />
      <Route path="/acesso/:token" element={<PortalAccessPage />} />
      <Route path="/os/:id" element={<PortalServiceOrderPage />} />
      <Route path="/orcamento/:token" element={<PublicQuotePage />} />
      <Route path="*" element={<Navigate to={routes.login} replace />} />
    </Routes>
  );
}
