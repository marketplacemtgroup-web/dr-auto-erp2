import { routes } from "./routes";

export const PERMISSIONS = {
  dashboardView: "dashboard.view",
  dashboardFinancial: "dashboard.view_financial",
  financialView: "financial.view",
  customers: "customers.manage",
  vehicles: "vehicles.manage",
  serviceOrders: "service_orders.manage",
  quotes: "quotes.manage",
  inventory: "inventory.manage",
  suppliers: "suppliers.manage",
  purchases: "purchases.manage",
  financial: "financial.manage",
  team: "team.manage",
  reports: "dashboard.view_financial",
  admin: "admin.access",
  settings: "settings.manage",
} as const;

export const MENU_ITEMS: Array<{
  label: string;
  path: string;
  permission: string | string[];
}> = [
  { label: "Dashboard", path: routes.dashboardHome, permission: PERMISSIONS.dashboardView },
  { label: "Clientes", path: routes.clientes, permission: PERMISSIONS.customers },
  { label: "Veiculos", path: routes.veiculos, permission: PERMISSIONS.vehicles },
  { label: "Ordem de Servico", path: routes.ordemDeServico, permission: PERMISSIONS.serviceOrders },
  { label: "Orcamentos", path: routes.orcamentos, permission: PERMISSIONS.quotes },
  { label: "Servicos", path: routes.servicos, permission: PERMISSIONS.serviceOrders },
  { label: "Agenda", path: routes.agenda, permission: PERMISSIONS.serviceOrders },
  { label: "Estoque", path: routes.estoque, permission: PERMISSIONS.inventory },
  { label: "Fornecedores", path: routes.fornecedores, permission: [PERMISSIONS.suppliers, PERMISSIONS.inventory] },
  { label: "Compras", path: routes.compras, permission: [PERMISSIONS.purchases, PERMISSIONS.inventory] },
  { label: "Financeiro", path: routes.financeiro, permission: PERMISSIONS.financial },
  { label: "Equipe & Comissoes", path: routes.equipeFuncionarios, permission: PERMISSIONS.team },
  { label: "Relatorios", path: routes.relatorios, permission: PERMISSIONS.reports },
  { label: "Admin", path: routes.admin, permission: PERMISSIONS.admin },
  { label: "Configuracoes", path: routes.configuracoes, permission: PERMISSIONS.settings },
];

export function hasPermission(
  permissions: string[] | undefined,
  required: string | string[],
): boolean {
  const perms = permissions ?? [];
  if (perms.includes("admin.access")) return true;
  const list = Array.isArray(required) ? required : [required];
  return list.some((p) => perms.includes(p));
}

export function canViewMoney(permissions?: string[]): boolean {
  return hasPermission(permissions, PERMISSIONS.financialView);
}

export function canViewFinancialDashboard(permissions?: string[]): boolean {
  return hasPermission(permissions, PERMISSIONS.dashboardFinancial);
}

/** Rota do dashboard → permissão mínima (prefix match). */
export function permissionForPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/+$/, "") || routes.dashboardHome;
  if (normalized.startsWith(routes.equipe)) return PERMISSIONS.team;
  const sorted = [...MENU_ITEMS].sort((a, b) => b.path.length - a.path.length);
  for (const item of sorted) {
    if (normalized === item.path || normalized.startsWith(`${item.path}/`)) {
      return Array.isArray(item.permission) ? item.permission[0] : item.permission;
    }
  }
  return PERMISSIONS.dashboardView;
}
