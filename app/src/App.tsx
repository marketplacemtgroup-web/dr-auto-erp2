import { Suspense, type ReactNode } from "react";
import { lazyWithRetry } from "./lib/lazyWithRetry";
import { Navigate, Route, Routes } from "react-router";
import BrandingBootstrap from "./components/BrandingBootstrap";
import ProtectedRoute from "./components/ProtectedRoute";
import PageLoader from "./components/PageLoader";
import AppShell from "./layouts/AppShell";
import LoginPage from "./pages/auth/LoginPage";
import RegisterOrganizationPage from "./pages/auth/RegisterOrganizationPage";
import { routes } from "./lib/routes";

const DashboardPage = lazyWithRetry(() => import("./pages/DashboardPage"));
const AdminDashboardPage = lazyWithRetry(() => import("./pages/admin/AdminDashboardPage"));
const CustomersPage = lazyWithRetry(() => import("./pages/customers/CustomersPage"));
const CustomerDetailPage = lazyWithRetry(() => import("./pages/customers/CustomerDetailPage"));
const VehiclesPage = lazyWithRetry(() => import("./pages/vehicles/VehiclesPage"));
const VehicleDetailPage = lazyWithRetry(() => import("./pages/vehicles/VehicleDetailPage"));
const ServiceOrdersPage = lazyWithRetry(() => import("./pages/service-orders/ServiceOrdersPage"));
const ServiceOrderDetailPage = lazyWithRetry(() => import("./pages/service-orders/ServiceOrderDetailPage"));
const QuotesPage = lazyWithRetry(() => import("./pages/quotes/QuotesPage"));
const QuoteDetailPage = lazyWithRetry(() => import("./pages/quotes/QuoteDetailPage"));
const ServicesPage = lazyWithRetry(() => import("./pages/services/ServicesPage"));
const InventoryPage = lazyWithRetry(() => import("./pages/inventory/InventoryPage"));
const AgendaPage = lazyWithRetry(() => import("./pages/agenda/AgendaPage"));
const SettingsPage = lazyWithRetry(() => import("./pages/settings/SettingsPage"));
const PurchasesPage = lazyWithRetry(() => import("./pages/purchases/PurchasesPage"));
const SuppliersPage = lazyWithRetry(() => import("./pages/suppliers/SuppliersPage"));
const SupplierDetailPage = lazyWithRetry(() => import("./pages/suppliers/SupplierDetailPage"));
const FinancialPage = lazyWithRetry(() => import("./pages/financial/FinancialPage"));
const ReportsPage = lazyWithRetry(() => import("./pages/reports/ReportsPage"));
const TeamLayout = lazyWithRetry(() => import("./layouts/TeamLayout"));
const EmployeesPage = lazyWithRetry(() => import("./pages/team/EmployeesPage"));
const EmployeeDetailPage = lazyWithRetry(() => import("./pages/team/EmployeeDetailPage"));
const JobTitlesPage = lazyWithRetry(() => import("./pages/team/JobTitlesPage"));
const PermissionsPage = lazyWithRetry(() => import("./pages/team/PermissionsPage"));
const CommissionRulesPage = lazyWithRetry(() => import("./pages/team/CommissionRulesPage"));
const TeamEntriesPage = lazyWithRetry(() => import("./pages/team/TeamEntriesPage"));
const PayrollPage = lazyWithRetry(() => import("./pages/team/PayrollPage"));
const ProductivityPage = lazyWithRetry(() => import("./pages/team/ProductivityPage"));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <>
      <BrandingBootstrap />
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
            path="orcamentos/:id"
            element={
              <Lazy>
                <QuoteDetailPage />
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
            path="fornecedores"
            element={
              <Lazy>
                <SuppliersPage />
              </Lazy>
            }
          />
          <Route
            path="fornecedores/:id"
            element={
              <Lazy>
                <SupplierDetailPage />
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
            path="equipe"
            element={
              <Lazy>
                <TeamLayout />
              </Lazy>
            }
          >
            <Route index element={<Navigate to="funcionarios" replace />} />
            <Route
              path="funcionarios"
              element={
                <Lazy>
                  <EmployeesPage />
                </Lazy>
              }
            />
            <Route
              path="funcionarios/:id"
              element={
                <Lazy>
                  <EmployeeDetailPage />
                </Lazy>
              }
            />
            <Route
              path="cargos"
              element={
                <Lazy>
                  <JobTitlesPage />
                </Lazy>
              }
            />
            <Route
              path="permissoes"
              element={
                <Lazy>
                  <PermissionsPage />
                </Lazy>
              }
            />
            <Route
              path="regras-comissao"
              element={
                <Lazy>
                  <CommissionRulesPage />
                </Lazy>
              }
            />
            <Route
              path="lancamentos"
              element={
                <Lazy>
                  <TeamEntriesPage />
                </Lazy>
              }
            />
            <Route
              path="fechamentos"
              element={
                <Lazy>
                  <PayrollPage />
                </Lazy>
              }
            />
            <Route
              path="produtividade"
              element={
                <Lazy>
                  <ProductivityPage />
                </Lazy>
              }
            />
          </Route>
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
    </>
  );
}
