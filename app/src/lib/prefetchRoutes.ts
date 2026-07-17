import { routes } from "./routes";

/** Pré-carrega o chunk JS da rota ao passar o mouse no menu — reduz espera na navegação. */
const CHUNK_LOADERS: Record<string, () => Promise<unknown>> = {
  [routes.dashboardHome]: () => import("../pages/DashboardPage"),
  [routes.admin]: () => import("../pages/admin/AdminDashboardPage"),
  [routes.clientes]: () => import("../pages/customers/CustomersPage"),
  [routes.veiculos]: () => import("../pages/vehicles/VehiclesPage"),
  [routes.ordemDeServico]: () => import("../pages/service-orders/ServiceOrdersPage"),
  [routes.orcamentos]: () => import("../pages/quotes/QuotesPage"),
  [routes.servicos]: () => import("../pages/services/ServicesPage"),
  [routes.agenda]: () => import("../pages/agenda/AgendaPage"),
  [routes.estoque]: () => import("../pages/inventory/InventoryPage"),
  [routes.compras]: () => import("../pages/purchases/PurchasesPage"),
  [routes.fornecedores]: () => import("../pages/suppliers/SuppliersPage"),
  [routes.financeiro]: () => import("../pages/financial/FinancialPage"),
  [routes.relatorios]: () => import("../pages/reports/ReportsPage"),
  [routes.configuracoes]: () => import("../pages/settings/SettingsPage"),
  [routes.equipe]: () => import("../layouts/TeamLayout"),
  [routes.equipeFuncionarios]: () => import("../pages/team/EmployeesPage"),
  [routes.equipeCargos]: () => import("../pages/team/JobTitlesPage"),
  [routes.equipePermissoes]: () => import("../pages/team/PermissionsPage"),
  [routes.equipeRegrasComissao]: () => import("../pages/team/CommissionRulesPage"),
  [routes.equipeLancamentos]: () => import("../pages/team/TeamEntriesPage"),
  [routes.equipeFechamentos]: () => import("../pages/team/PayrollPage"),
  [routes.equipeProdutividade]: () => import("../pages/team/ProductivityPage"),
  [routes.equipeComissoes]: () => import("../pages/team/CommissionsPage"),
  [routes.equipeEscalas]: () => import("../pages/team/EscalasPage"),
  [routes.equipePonto]: () => import("../pages/team/PontoPage"),
  [routes.equipeSolicitacoes]: () => import("../pages/team/SolicitacoesPage"),
};

const prefetched = new Set<string>();

export function prefetchRouteChunk(path: string) {
  const loader = CHUNK_LOADERS[path];
  if (!loader || prefetched.has(path)) return;
  prefetched.add(path);
  void loader();
}
