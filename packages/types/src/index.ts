export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
  organizationId: string;
  organizationName: string;
  branchId?: string | null;
  role: string;
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterOrganizationRequest {
  organizationName: string;
  tradeName?: string;
  document?: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface DashboardKpis {
  openServiceOrders: number;
  openServiceOrdersTrend: number;
  vehiclesInShop: number;
  vehiclesInShopTrend: number;
  pendingQuotes: number;
  pendingQuotesTrend: number;
  dailyRevenue: number;
  dailyRevenueTrend: number;
  lowStockParts: number;
  lowStockPartsTrend: number;
  delayedServices: number;
  waitingClients: number;
  invoicesThisMonth: number;
  averageTicket: number;
  monthlyRevenue: number;
  averageServiceTimeMinutes: number;
}
