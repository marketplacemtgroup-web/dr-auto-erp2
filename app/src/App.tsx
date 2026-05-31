import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";
import ProtectedRoute from "./components/ProtectedRoute";
import PageLoader from "./components/PageLoader";
import AppShell from "./layouts/AppShell";
import LoginPage from "./pages/auth/LoginPage";
import RegisterOrganizationPage from "./pages/auth/RegisterOrganizationPage";
import { routes } from "./lib/routes";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const CustomersPage = lazy(() => import("./pages/customers/CustomersPage"));
const CustomerDetailPage = lazy(() => import("./pages/customers/CustomerDetailPage"));
const VehiclesPage = lazy(() => import("./pages/vehicles/VehiclesPage"));
const VehicleDetailPage = lazy(() => import("./pages/vehicles/VehicleDetailPage"));
const ServiceOrdersPage = lazy(() => import("./pages/service-orders/ServiceOrdersPage"));
const ServiceOrderDetailPage = lazy(() => import("./pages/service-orders/ServiceOrderDetailPage"));
const QuotesPage = lazy(() => import("./pages/quotes/QuotesPage"));
const ServicesPage = lazy(() => import("./pages/services/ServicesPage"));
const InventoryPage = lazy(() => import("./pages/inventory/InventoryPage"));
const AgendaPage = lazy(() => import("./pages/agenda/AgendaPage"));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));
const PurchasesPage = lazy(() => import("./pages/purchases/PurchasesPage"));
const FinancialPage = lazy(() => import("./pages/financial/FinancialPage"));
const ReportsPage = lazy(() => import("./pages/reports/ReportsPage"));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={routes.login} replace />} />
      <Route path={routes.login} element={<LoginPage />} />
      <Route path={routes.register} element={<RegisterOrganizationPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="dashboard" element={<AppShell />}>
          <Route
            index
            element={
              <Lazy>
                <DashboardPage />
              </Lazy>
            }
          />
          <Route
            path="admin"
            element={
              <Lazy>
                <AdminDashboardPage />
              </Lazy>
            }
          />
          <Route
            path="clientes"
            element={
              <Lazy>
                <CustomersPage />
              </Lazy>
            }
          />
          <Route
            path="clientes/:id"
            element={
              <Lazy>
                <CustomerDetailPage />
              </Lazy>
            }
          />
          <Route
            path="veiculos"
            element={
              <Lazy>
                <VehiclesPage />
              </Lazy>
            }
          />
          <Route
            path="veiculos/:id"
            element={
              <Lazy>
                <VehicleDetailPage />
              </Lazy>
            }
          />
          <Route
            path="ordem-de-servico"
            element={
              <Lazy>
                <ServiceOrdersPage />
              </Lazy>
            }
          />
          <Route
            path="ordem-de-servico/:id"
            element={
              <Lazy>
                <ServiceOrderDetailPage />
              </Lazy>
            }
          />
          <Route
            path="orcamentos"
            element={
              <Lazy>
                <QuotesPage />
              </Lazy>
            }
          />
          <Route
            path="servicos"
            element={
              <Lazy>
                <ServicesPage />
              </Lazy>
            }
          />
          <Route
            path="agenda"
            element={
              <Lazy>
                <AgendaPage />
              </Lazy>
            }
          />
          <Route
            path="estoque"
            element={
              <Lazy>
                <InventoryPage />
              </Lazy>
            }
          />
          <Route
            path="compras"
            element={
              <Lazy>
                <PurchasesPage />
              </Lazy>
            }
          />
          <Route
            path="financeiro"
            element={
              <Lazy>
                <FinancialPage />
              </Lazy>
            }
          />
          <Route
            path="relatorios"
            element={
              <Lazy>
                <ReportsPage />
              </Lazy>
            }
          />
          <Route
            path="configuracoes"
            element={
              <Lazy>
                <SettingsPage />
              </Lazy>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={routes.login} replace />} />
    </Routes>
  );
}
