import { fetchWithTimeout, parseJsonBody } from "./http";

// Produção: URL vazia → mesmo host (`/api` via nginx).
// Dev no PC: pode usar VITE_API_URL ou proxy do Vite.
// Celular na rede Wi‑Fi: nunca usar localhost no .env — detectamos e usamos `/api`.
function resolveApiBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";
  if (!fromEnv) return "";
  if (typeof window === "undefined") return fromEnv;
  const pointsToLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(
    fromEnv,
  );
  const onLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  if (pointsToLocalhost && !onLocalhost) return "";
  return fromEnv.replace(/\/$/, "");
}

const API_URL = resolveApiBaseUrl();

export interface AuthSession {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  };
  organizationId: string;
  organizationName: string;
  branchId?: string | null;
  role: string;
  permissions: string[];
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

export interface AdminStats {
  activeUsers: number;
  branches: number;
  pendingPermissions: number;
  recentAccess: Array<{
    id: string;
    createdAt: string;
    user?: { id: string; name: string; email: string } | null;
  }>;
}

export interface PortalSession {
  accessToken: string;
  organizationName: string;
  customerName: string;
  plate: string;
}

export interface PortalMe {
  organizationName: string;
  customer: { name: string; document: string | null };
  vehicle: {
    plate: string;
    brand: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
  };
  latestServiceOrder: null | {
    id: string;
    number: number;
    status: string;
    totalAmount: string | number;
    updatedAt: string;
  };
}

export interface PortalDashboard {
  organization: {
    name: string;
    phone: string | null;
    email: string | null;
    portalWelcome: string | null;
  };
  customer: { name: string; phone: string | null; whatsapp: string | null };
  vehicle: {
    plate: string;
    brand: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
  };
  serviceOrders: Array<{
    id: string;
    number: number;
    status: string;
    totalAmount: string | number;
    complaint: string | null;
    estimatedAt: string | null;
    updatedAt: string;
    createdAt: string;
  }>;
  quotes: PortalQuoteRow[];
  attachments: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    url: string;
    createdAt: string;
  }>;
}

export interface PortalServiceOrderDetail {
  id: string;
  number: number;
  status: string;
  statusLabel: string;
  totalAmount: string | number;
  complaint: string | null;
  diagnosis: string | null;
  customerVisibleNotes: string | null;
  estimatedAt: string | null;
  entryKm: number | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    description: string;
    itemType: string;
    quantity: number;
    unitPrice: string | number;
  }>;
  timeline: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    fromLabel: string | null;
    toLabel: string;
    notes: string | null;
    userName: string | null;
    createdAt: string;
  }>;
  attachments: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    url: string;
    createdAt: string;
  }>;
  quotes: PortalQuoteRow[];
  organization: { phone: string | null; name: string };
  customer: { whatsapp: string | null; phone: string | null };
}

export interface OfficeNotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface QuoteLineRow {
  id: string;
  description: string;
  lineType: "SERVICE" | "PART" | "THIRD_PARTY";
  quantity: number;
  unitPrice: string | number;
  discount?: string | number;
  approved?: boolean | null;
  sortOrder?: number;
}

export interface PortalQuoteItemRow {
  id: string;
  description: string;
  itemType: "SERVICE" | "PART";
  quantity: number;
  unitPrice: string | number;
}

export interface PortalQuoteRow {
  id: string;
  number?: number | null;
  status: string;
  amount: string | number;
  createdAt: string;
  canRespond?: boolean;
  lines?: QuoteLineRow[];
  serviceOrder: {
    id: string;
    number: number;
    status: string;
    totalAmount?: string | number;
    items?: PortalQuoteItemRow[];
    customerVisibleNotes?: string | null;
  };
}

export interface ChecklistItemRow {
  id: string;
  category: string;
  label: string;
  result: "OK" | "ATTENTION" | "DAMAGED" | "NA" | null;
  notes: string | null;
}

export interface StatusHistoryRow {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  notes: string | null;
  createdAt: string;
  user?: { id: string; name: string } | null;
}

export interface AttachmentRow {
  id: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  url?: string;
  category: string;
  visibleToCustomer: boolean;
  showOnQuote: boolean;
  createdAt: string;
  uploadedBy?: { id: string; name: string } | null;
}

export interface PurchaseOrderRow {
  id: string;
  number: string;
  supplierName: string;
  status: string;
  totalAmount: string | number;
  createdAt: string;
}

export type PaymentMethod =
  | "CASH"
  | "PIX"
  | "CARD"
  | "BOLETO"
  | "TRANSFER"
  | "OTHER";

export interface FinancialEntryRow {
  id: string;
  description: string;
  type: "PAYABLE" | "RECEIVABLE";
  status: string;
  dueDate: string;
  amount: string | number;
  createdAt: string;
  paymentMethod?: PaymentMethod | null;
  paidAt?: string | null;
  installmentNumber?: number;
  installmentTotal?: number;
  customer?: { id: string; name: string } | null;
  serviceOrder?: { id: string; number: number } | null;
  quote?: { id: string; number: number } | null;
  installments?: FinancialEntryRow[];
}

export interface CashSessionRow {
  id: string;
  status: "OPEN" | "CLOSED";
  openingBalance: string | number;
  closingBalance?: string | number | null;
  expectedBalance?: string | number | null;
  openedAt: string;
  closedAt?: string | null;
  notes?: string | null;
  openedBy?: { id: string; name: string };
  closedBy?: { id: string; name: string } | null;
  movements: Array<{
    id: string;
    movementType: string;
    amount: string | number;
    description?: string | null;
    createdAt: string;
  }>;
}

export interface ReportsBi {
  quoteConversion: { total: number; approved: number; rate: number };
  ordersByMechanic: Array<{ name: string; count: number; total: number }>;
  inactiveCustomers: Array<{ id: string; name: string; phone: string | null }>;
  dre: Array<{ month: string; revenue: number; expense: number; result: number }>;
  lowStock: Array<{
    name: string;
    sku: string | null;
    stock: number;
    reservedStock: number;
    minStock: number;
    salePrice: string | number;
  }>;
}

export interface ReportsSummary {
  dailyRevenue: string | number;
  monthRevenue: string | number;
  openReceivables: { count: number; amount: string | number };
  openPayables: { count: number; amount: string | number };
  serviceOrdersByStatus: Array<{ status: string; count: number }>;
  revenueWeek: Array<{ date: string; amount: string | number }>;
  customersCount: number;
  vehiclesCount: number;
  openOrders: number;
  lowStockCount: number;
}

export interface ServiceOrderItemRow {
  id: string;
  description: string;
  itemType: "SERVICE" | "PART";
  quantity: number;
  unitPrice: string | number;
  product?: { id: string; name: string } | null;
}

export interface ServiceOrderDetail extends ServiceOrderRow {
  complaint: string | null;
  diagnosis: string | null;
  internalNotes: string | null;
  customerVisibleNotes?: string | null;
  entryKm?: number | null;
  enteredAt?: string | null;
  bay?: string | null;
  priority?: string;
  createdAt: string;
  items: ServiceOrderItemRow[];
  quotes: Array<{
    id: string;
    number?: number | null;
    status: string;
    amount: string | number;
    createdAt: string;
    lines?: QuoteLineRow[];
  }>;
  checklistItems?: ChecklistItemRow[];
  statusHistory?: StatusHistoryRow[];
  attachments?: AttachmentRow[];
}

export interface CustomerContactRow {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
}

export interface CustomerKpis {
  totalSpent: number;
  averageTicket: number;
  orderCount: number;
  vehicleCount: number;
  lastVisit: string | null;
  openOrders: number;
  pendingQuotes: number;
}

export interface CustomerTimelineRow {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  notes: string | null;
  createdAt: string;
  serviceOrder: { number: number; vehicle: { plate: string } };
  user?: { id: string; name: string } | null;
}

export interface CustomerDetail extends CustomerRow {
  customerType?: "PF" | "PJ";
  notes: string | null;
  street?: string | null;
  addressNumber?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  origin?: string | null;
  isActive?: boolean;
  isVip?: boolean;
  isBlocked?: boolean;
  isDelinquent?: boolean;
  vehicles: VehicleRow[];
  contacts?: CustomerContactRow[];
  kpis: CustomerKpis;
  serviceOrders: ServiceOrderRow[];
  quotes: QuoteRow[];
  timeline: CustomerTimelineRow[];
}

export interface VehicleKpis {
  orderCount: number;
  totalSpent: number;
  lastService: string | null;
  lastKm: number | null;
  openOrders: number;
  pendingQuotes: number;
}

export interface VehicleDetail extends VehicleRow {
  vehicleKind?: string;
  chassis?: string | null;
  renavam?: string | null;
  fuelType?: string | null;
  currentKm?: number | null;
  notes?: string | null;
  customer: { id: string; name: string; document?: string | null };
  kpis: VehicleKpis;
  serviceOrders: ServiceOrderRow[];
  quotes: QuoteRow[];
  attachments: AttachmentRow[];
  timeline: CustomerTimelineRow[];
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
  allowEmpty = false,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetchWithTimeout(`${API_URL}/api${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errText = await res.text();
    let body: { message?: string | string[] } = {};
    if (errText.trim()) {
      try {
        body = JSON.parse(errText) as { message?: string | string[] };
      } catch {
        body = { message: errText };
      }
    }
    throw new ApiError(
      body.message?.toString() ?? "Erro na requisição",
      res.status,
    );
  }

  return parseJsonBody<T>(res, { allowEmpty });
}

function requestNullable<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  return request<T>(path, options, token, true);
}

export const api = {
  authSetupStatus: () =>
    request<{ hasOrganization: boolean; singleTenant: boolean }>(
      "/auth/setup-status",
      { method: "GET" },
    ),

  login: (email: string, password: string) =>
    request<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  registerOrganization: (data: {
    organizationName: string;
    tradeName?: string;
    document?: string;
    email: string;
    password: string;
    name: string;
    phone?: string;
  }) =>
    request<AuthSession>("/auth/register-organization", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: (token: string) =>
    request<AuthSession>("/auth/me", { method: "GET" }, token),

  dashboardKpis: (token: string) =>
    request<DashboardKpis>("/dashboard/kpis", { method: "GET" }, token),

  dashboardServiceOrdersInProgress: (token: string) =>
    request<ServiceOrderRow[]>("/dashboard/service-orders-in-progress", { method: "GET" }, token),

  dashboardPendingQuotes: (token: string) =>
    request<QuoteRow[]>("/dashboard/pending-quotes", { method: "GET" }, token),

  dashboardRevenueSeries: (token: string) =>
    request<Array<{ day: string; value: number }>>("/dashboard/revenue-series", { method: "GET" }, token),

  adminStats: (token: string) =>
    request<AdminStats>("/organizations/admin/stats", { method: "GET" }, token),

  customers: (token: string, search?: string) =>
    request<CustomerRow[]>(
      `/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      { method: "GET" },
      token,
    ),

  createCustomer: (
    token: string,
    data: {
      name: string;
      customerType?: string;
      document?: string;
      phone?: string;
      whatsapp?: string;
      email?: string;
      notes?: string;
      street?: string;
      addressNumber?: string;
      complement?: string;
      district?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      origin?: string;
      isVip?: boolean;
      isBlocked?: boolean;
      isDelinquent?: boolean;
    },
  ) =>
    request<CustomerRow>("/customers", { method: "POST", body: JSON.stringify(data) }, token),

  customer: (token: string, id: string) =>
    request<CustomerDetail>(`/customers/${id}`, { method: "GET" }, token),

  createCustomerContact: (
    token: string,
    customerId: string,
    data: { name: string; role?: string; phone?: string; email?: string; isPrimary?: boolean },
  ) =>
    request<CustomerContactRow>(
      `/customers/${customerId}/contacts`,
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  deleteCustomerContact: (token: string, customerId: string, contactId: string) =>
    request<{ ok: boolean }>(
      `/customers/${customerId}/contacts/${contactId}`,
      { method: "DELETE" },
      token,
    ),

  updateCustomer: (
    token: string,
    id: string,
    data: Partial<{
      name: string;
      customerType: string;
      document: string;
      phone: string;
      whatsapp: string;
      email: string;
      notes: string;
      street: string;
      addressNumber: string;
      complement: string;
      district: string;
      city: string;
      state: string;
      zipCode: string;
      origin: string;
      isVip: boolean;
      isBlocked: boolean;
      isDelinquent: boolean;
    }>,
  ) =>
    request<CustomerRow>(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),

  deleteCustomer: (token: string, id: string) =>
    request<{ ok: boolean }>(`/customers/${id}`, { method: "DELETE" }, token),

  vehicles: (token: string, search?: string) =>
    request<VehicleRow[]>(
      `/vehicles${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      { method: "GET" },
      token,
    ),

  createVehicle: (
    token: string,
    data: {
      customerId: string;
      plate: string;
      brand?: string;
      model?: string;
      year?: number;
      color?: string;
      vehicleKind?: string;
      chassis?: string;
      renavam?: string;
      fuelType?: string;
      currentKm?: number;
      notes?: string;
    },
  ) =>
    request<VehicleRow>("/vehicles", { method: "POST", body: JSON.stringify(data) }, token),

  vehicle: (token: string, id: string) =>
    request<VehicleDetail>(`/vehicles/${id}`, { method: "GET" }, token),

  uploadVehicleAttachment: async (token: string, vehicleId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/api/attachments/vehicle/${vehicleId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(
        (body as { message?: string }).message?.toString() ?? "Erro no upload",
        res.status,
      );
    }
    return res.json() as Promise<AttachmentRow>;
  },

  updateVehicle: (
    token: string,
    id: string,
    data: Partial<{
      customerId: string;
      plate: string;
      brand: string;
      model: string;
      year: number;
      color: string;
      vehicleKind: string;
      chassis: string;
      renavam: string;
      fuelType: string;
      currentKm: number;
      notes: string;
    }>,
  ) =>
    request<VehicleRow>(`/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),

  deleteVehicle: (token: string, id: string) =>
    request<{ ok: boolean }>(`/vehicles/${id}`, { method: "DELETE" }, token),

  serviceOrders: (token: string, search?: string, scheduled?: boolean, status?: string) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (scheduled) params.set("scheduled", "true");
    if (status) params.set("status", status);
    const q = params.toString();
    return request<ServiceOrderRow[]>(
      `/service-orders${q ? `?${q}` : ""}`,
      { method: "GET" },
      token,
    );
  },

  serviceOrder: (token: string, id: string) =>
    request<ServiceOrderDetail>(`/service-orders/${id}`, { method: "GET" }, token),

  updateServiceOrder: (
    token: string,
    id: string,
    data: Partial<{
      status: string;
      estimatedAt: string | null;
      complaint: string;
      diagnosis: string;
      internalNotes: string;
      customerVisibleNotes: string;
      entryKm: number;
      bay: string;
      priority: string;
      statusReason: string;
    }>,
  ) =>
    request<ServiceOrderDetail>(
      `/service-orders/${id}`,
      { method: "PATCH", body: JSON.stringify(data) },
      token,
    ),

  updateServiceOrderChecklist: (
    token: string,
    id: string,
    items: Array<{ id: string; result?: string | null; notes?: string }>,
  ) =>
    request<ServiceOrderDetail>(
      `/service-orders/${id}/checklist`,
      { method: "PATCH", body: JSON.stringify({ items }) },
      token,
    ),

  uploadServiceOrderAttachment: async (
    token: string,
    serviceOrderId: string,
    file: File,
    opts?: { category?: string; visibleToCustomer?: boolean; showOnQuote?: boolean },
  ) => {
    const form = new FormData();
    form.append("file", file);
    const params = new URLSearchParams();
    if (opts?.category) params.set("category", opts.category);
    if (opts?.visibleToCustomer) params.set("visibleToCustomer", "true");
    if (opts?.showOnQuote) params.set("showOnQuote", "true");
    const q = params.toString();
    const res = await fetch(
      `${API_URL}/api/attachments/service-order/${serviceOrderId}${q ? `?${q}` : ""}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(
        (body as { message?: string }).message?.toString() ?? "Erro no upload",
        res.status,
      );
    }
    return res.json() as Promise<AttachmentRow>;
  },

  deleteAttachment: (token: string, id: string) =>
    request<{ ok: boolean }>(`/attachments/${id}`, { method: "DELETE" }, token),

  deleteServiceOrder: (token: string, id: string) =>
    request<{ ok: boolean }>(`/service-orders/${id}`, { method: "DELETE" }, token),

  addServiceOrderItem: (
    token: string,
    serviceOrderId: string,
    data: {
      description: string;
      itemType?: "SERVICE" | "PART";
      quantity?: number;
      unitPrice: number;
      productId?: string;
      catalogItemId?: string;
    },
  ) =>
    request<ServiceOrderDetail>(
      `/service-orders/${serviceOrderId}/items`,
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  removeServiceOrderItem: (token: string, serviceOrderId: string, itemId: string) =>
    request<ServiceOrderDetail>(
      `/service-orders/${serviceOrderId}/items/${itemId}`,
      { method: "DELETE" },
      token,
    ),

  createServiceOrder: (
    token: string,
    data: {
      vehicleId: string;
      status?: string;
      estimatedAt?: string;
      totalAmount?: number;
      complaint?: string;
    },
  ) =>
    request<ServiceOrderRow>(
      "/service-orders",
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  quotes: (token: string, search?: string, status?: string) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const q = params.toString();
    return request<QuoteRow[]>(`/quotes${q ? `?${q}` : ""}`, { method: "GET" }, token);
  },

  createQuote: (
    token: string,
    data: { serviceOrderId: string; amount: number; status?: string },
  ) =>
    request<QuoteRow>("/quotes", { method: "POST", body: JSON.stringify(data) }, token),

  updateQuote: (
    token: string,
    id: string,
    data: Partial<{ status: string; amount: number }>,
  ) =>
    request<QuoteRow>(`/quotes/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),

  deleteQuote: (token: string, id: string) =>
    request<{ ok: boolean }>(`/quotes/${id}`, { method: "DELETE" }, token),

  createQuoteShareLink: (token: string, quoteId: string) =>
    request<{ token: string; expiresAt: string; path: string }>(
      `/quotes/${quoteId}/share-link`,
      { method: "POST" },
      token,
    ),

  publicQuote: (accessToken: string) =>
    request<{
      organizationName: string;
      customerName: string;
      vehicle: { plate: string; brand: string | null; model: string | null };
      quote: PortalQuoteRow;
      attachments: Array<{ id: string; fileName: string; mimeType: string; url: string }>;
    }>(`/portal/public/quote/${accessToken}`, { method: "GET" }),

  publicApproveQuote: (
    accessToken: string,
    data?: { lines?: Array<{ lineId: string; approved: boolean }>; comment?: string },
  ) =>
    request(`/portal/public/quote/${accessToken}/approve`, {
      method: "PATCH",
      body: JSON.stringify(data ?? {}),
    }),

  publicRejectQuote: (accessToken: string, comment?: string) =>
    request(`/portal/public/quote/${accessToken}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ comment }),
    }),

  products: (token: string, search?: string, lowStock?: boolean) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (lowStock) params.set("lowStock", "true");
    const q = params.toString();
    return request<ProductRow[]>(`/products${q ? `?${q}` : ""}`, { method: "GET" }, token);
  },

  createProduct: (
    token: string,
    data: {
      name: string;
      sku?: string;
      category?: string;
      brand?: string;
      ncm?: string;
      location?: string;
      stock?: number;
      minStock?: number;
      costPrice?: number;
      salePrice?: number;
    },
  ) =>
    request<ProductRow>("/products", { method: "POST", body: JSON.stringify(data) }, token),

  updateProduct: (
    token: string,
    id: string,
    data: Partial<{
      name: string;
      sku: string;
      category: string;
      brand: string;
      ncm: string;
      location: string;
      minStock: number;
      costPrice: number;
      salePrice: number;
    }>,
  ) =>
    request<ProductRow>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),

  adjustProductStock: (token: string, id: string, delta: number, reason?: string) =>
    request<ProductRow>(
      `/products/${id}/stock`,
      { method: "PATCH", body: JSON.stringify({ delta, reason }) },
      token,
    ),

  deleteProduct: (token: string, id: string) =>
    request<{ ok: boolean }>(`/products/${id}`, { method: "DELETE" }, token),

  organization: (token: string) =>
    request<OrganizationDetail>("/organizations/current", { method: "GET" }, token),

  updateOrganization: (
    token: string,
    data: Partial<{
      name: string;
      tradeName: string;
      document: string;
      email: string;
      phone: string;
      logoUrl: string;
      primaryColor: string;
      accentColor: string;
      footerText: string;
      termsServiceOrder: string;
      termsQuote: string;
      portalWelcome: string;
    }>,
  ) =>
    request<OrganizationDetail>("/organizations/current", {
      method: "PATCH",
      body: JSON.stringify(data),
    }, token),

  branches: (token: string) =>
    request<BranchRow[]>("/organizations/branches", { method: "GET" }, token),

  globalSearch: (token: string, q: string) =>
    request<GlobalSearchResult>(`/search?q=${encodeURIComponent(q)}`, { method: "GET" }, token),

  auditLogs: (token: string, search?: string, resource?: string) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (resource) params.set("resource", resource);
    const qs = params.toString();
    return request<AuditLogRow[]>(`/audit-logs${qs ? `?${qs}` : ""}`, { method: "GET" }, token);
  },

  portalLogin: (cpf: string, plate: string) =>
    request<PortalSession>("/portal/login", {
      method: "POST",
      body: JSON.stringify({ cpf, plate }),
    }),

  portalMe: (token: string) =>
    request<PortalMe>("/portal/me", { method: "GET" }, token),

  portalQuotes: (token: string) =>
    request<PortalQuoteRow[]>("/portal/quotes", { method: "GET" }, token),

  portalApprove: (
    token: string,
    quoteId: string,
    data?: { lines?: Array<{ lineId: string; approved: boolean }>; comment?: string },
  ) =>
    request<PortalQuoteRow>(`/portal/quotes/${quoteId}/approve`, {
      method: "PATCH",
      body: JSON.stringify(data ?? {}),
    }, token),

  portalReject: (token: string, quoteId: string) =>
    request<PortalQuoteRow>(`/portal/quotes/${quoteId}/reject`, { method: "PATCH" }, token),

  portalAccessByToken: (accessToken: string) =>
    request<PortalSession>(`/portal/access/${accessToken}`, { method: "GET" }),

  portalDashboard: (token: string) =>
    request<PortalDashboard>("/portal/dashboard", { method: "GET" }, token),

  portalServiceOrder: (token: string, serviceOrderId: string) =>
    request<PortalServiceOrderDetail>(
      `/portal/service-orders/${serviceOrderId}`,
      { method: "GET" },
      token,
    ),

  portalVapidPublicKey: () =>
    request<{ publicKey: string | null }>("/portal/push/vapid-public-key", { method: "GET" }),

  portalPushSubscribe: (
    token: string,
    data: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) =>
    request<{ ok: boolean }>("/portal/push/subscribe", {
      method: "POST",
      body: JSON.stringify(data),
    }, token),

  serviceOrderPortalLink: (token: string, serviceOrderId: string) =>
    request<{ token: string; expiresAt: string; path: string; whatsappMessage: string }>(
      `/service-orders/${serviceOrderId}/portal-link`,
      { method: "POST" },
      token,
    ),

  notificationsUnread: (token: string) =>
    request<OfficeNotificationRow[]>("/notifications/unread", { method: "GET" }, token),

  notificationMarkRead: (token: string, id: string) =>
    request<{ count: number }>(`/notifications/${id}/read`, { method: "PATCH" }, token),

  purchaseOrders: (token: string, search?: string) =>
    request<PurchaseOrderRow[]>(
      `/purchases${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      { method: "GET" },
      token,
    ),

  createPurchaseOrder: (
    token: string,
    data: { supplierName: string; totalAmount: number; number?: string },
  ) =>
    request<PurchaseOrderRow>(
      "/purchases",
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  receivePurchaseOrder: (token: string, id: string) =>
    request<PurchaseOrderRow>(`/purchases/${id}/receive`, { method: "PATCH" }, token),

  financialEntries: (token: string, search?: string) =>
    request<FinancialEntryRow[]>(
      `/financial${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      { method: "GET" },
      token,
    ),

  createFinancialEntry: (
    token: string,
    data: { description: string; type: "PAYABLE" | "RECEIVABLE"; dueDate: string; amount: number },
  ) =>
    request<FinancialEntryRow>(
      "/financial",
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  payFinancialEntry: (
    token: string,
    id: string,
    data?: { paymentMethod?: PaymentMethod; paidAt?: string; registerInCash?: boolean },
  ) =>
    request<FinancialEntryRow>(`/financial/${id}/pay`, {
      method: "PATCH",
      body: JSON.stringify(data ?? {}),
    }, token),

  createFinancialInstallments: (
    token: string,
    data: {
      description: string;
      type: "PAYABLE" | "RECEIVABLE";
      dueDate: string;
      amount: number;
      installments: number;
      customerId?: string;
      serviceOrderId?: string;
    },
  ) =>
    request<FinancialEntryRow>("/financial/installments", {
      method: "POST",
      body: JSON.stringify(data),
    }, token),

  financialFromServiceOrder: (token: string, serviceOrderId: string) =>
    request<FinancialEntryRow>(`/financial/from-service-order/${serviceOrderId}`, {
      method: "POST",
    }, token),

  financialCashFlow: (token: string) =>
    request<Array<{ type: string; amount: string | number; paidAt: string; paymentMethod: string | null }>>(
      "/financial/cash-flow",
      { method: "GET" },
      token,
    ),

  cashCurrent: (token: string) =>
    requestNullable<CashSessionRow | null>("/cash/current", { method: "GET" }, token),

  cashOpen: (token: string, openingBalance: number) =>
    request<CashSessionRow>("/cash/open", {
      method: "POST",
      body: JSON.stringify({ openingBalance }),
    }, token),

  cashClose: (token: string, sessionId: string, closingBalance: number, notes?: string) =>
    request<CashSessionRow>(`/cash/${sessionId}/close`, {
      method: "POST",
      body: JSON.stringify({ closingBalance, notes }),
    }, token),

  cashMovement: (
    token: string,
    sessionId: string,
    data: { movementType: "SUPPLY" | "WITHDRAWAL"; amount: number; description?: string },
  ) =>
    request<CashSessionRow | null>(`/cash/${sessionId}/movement`, {
      method: "POST",
      body: JSON.stringify(data),
    }, token),

  reportsSummary: (token: string) =>
    request<ReportsSummary>("/reports/summary", { method: "GET" }, token),

  reportsBi: (token: string) =>
    request<ReportsBi>("/reports/bi", { method: "GET" }, token),

  reportsExport: (token: string, type: string) =>
    request<unknown[]>(`/reports/export/${type}`, { method: "GET" }, token),

  organizationMembers: (token: string) =>
    request<OrganizationMemberRow[]>("/users/members", { method: "GET" }, token),

  serviceCatalog: (token: string, search?: string) =>
    request<ServiceCatalogRow[]>(
      `/service-catalog${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      { method: "GET" },
      token,
    ),

  createServiceCatalog: (
    token: string,
    data: {
      name: string;
      category?: string;
      estimatedMinutes?: number;
      defaultPrice?: number;
      warrantyDays?: number;
    },
  ) =>
    request<ServiceCatalogRow>("/service-catalog", { method: "POST", body: JSON.stringify(data) }, token),

  updateServiceCatalog: (
    token: string,
    id: string,
    data: Partial<{
      name: string;
      category: string;
      estimatedMinutes: number;
      defaultPrice: number;
      warrantyDays: number;
      isActive: boolean;
    }>,
  ) =>
    request<ServiceCatalogRow>(`/service-catalog/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),

  deleteServiceCatalog: (token: string, id: string) =>
    request<{ ok: boolean }>(`/service-catalog/${id}`, { method: "DELETE" }, token),

  stockMovements: (token: string, productId?: string) =>
    request<StockMovementRow[]>(
      `/products/movements${productId ? `?productId=${productId}` : ""}`,
      { method: "GET" },
      token,
    ),

  appointments: (token: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const q = params.toString();
    return request<AppointmentRow[]>(`/appointments${q ? `?${q}` : ""}`, { method: "GET" }, token);
  },

  createAppointment: (
    token: string,
    data: {
      vehicleId: string;
      scheduledAt: string;
      mechanicMemberId?: string;
      durationMinutes?: number;
      bay?: string;
      notes?: string;
    },
  ) =>
    request<AppointmentRow>("/appointments", { method: "POST", body: JSON.stringify(data) }, token),

  updateAppointment: (
    token: string,
    id: string,
    data: Partial<{
      scheduledAt: string;
      status: string;
      bay: string;
      notes: string;
      mechanicMemberId: string;
    }>,
  ) =>
    request<AppointmentRow>(`/appointments/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),

  convertAppointmentToOs: (token: string, id: string) =>
    request<AppointmentRow>(`/appointments/${id}/convert-to-os`, { method: "POST" }, token),

  deleteAppointment: (token: string, id: string) =>
    request<{ ok: boolean }>(`/appointments/${id}`, { method: "DELETE" }, token),
};

export interface CustomerRow {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  notes?: string | null;
  _count: { vehicles: number };
}

export interface VehicleRow {
  id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  customer: { id: string; name: string };
}

export interface ServiceOrderRow {
  id: string;
  number: number;
  status: string;
  totalAmount: string | number;
  estimatedAt: string | null;
  updatedAt: string;
  vehicle: {
    plate: string;
    brand: string | null;
    model: string | null;
    year?: number | null;
    color?: string | null;
    customer: { name: string; phone?: string | null };
  };
}

export interface QuoteRow {
  id: string;
  status: string;
  amount: string | number;
  createdAt: string;
  serviceOrder: {
    number: number;
    vehicle: {
      plate: string;
      customer: { name: string };
    };
  };
}

export interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  category?: string | null;
  brand?: string | null;
  ncm?: string | null;
  location?: string | null;
  stock: number;
  reservedStock?: number;
  minStock: number;
  costPrice: string | number;
  salePrice: string | number;
}

export interface ServiceCatalogRow {
  id: string;
  name: string;
  category: string | null;
  estimatedMinutes: number | null;
  defaultPrice: string | number;
  warrantyDays: number | null;
  isActive: boolean;
}

export interface StockMovementRow {
  id: string;
  movementType: string;
  quantity: number;
  balanceAfter: number;
  reason: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string | null };
  serviceOrder?: { id: string; number: number } | null;
}

export interface AppointmentRow {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  bay: string | null;
  notes: string | null;
  serviceOrderId: string | null;
  vehicle: {
    id: string;
    plate: string;
    brand: string | null;
    model: string | null;
    customer: { id: string; name: string };
  };
  mechanic?: { id: string; user: { name: string } } | null;
  serviceOrder?: { id: string; number: number; status: string } | null;
}

export interface OrganizationMemberRow {
  id: string;
  user: { id: string; name: string; email: string };
  role: { name: string; slug: string };
}

export interface OrganizationDetail {
  id: string;
  name: string;
  tradeName: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  plan: string;
  logoUrl?: string | null;
  primaryColor?: string;
  accentColor?: string;
  footerText?: string | null;
  termsServiceOrder?: string | null;
  termsQuote?: string | null;
  portalWelcome?: string | null;
  branches: BranchRow[];
}

export interface GlobalSearchResult {
  customers: Array<{ id: string; name: string; phone: string | null; document: string | null }>;
  vehicles: Array<{
    id: string;
    plate: string;
    brand: string | null;
    model: string | null;
    customer: { id: string; name: string };
  }>;
  serviceOrders: Array<{
    id: string;
    number: number;
    status: string;
    totalAmount: string | number;
    vehicle: { plate: string; customer: { name: string } };
  }>;
  quotes: Array<{
    id: string;
    number: number | null;
    status: string;
    amount: string | number;
    serviceOrder: { id: string; number: number; vehicle: { plate: string } };
  }>;
}

export interface AuditLogRow {
  id: string;
  action: string;
  resource: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
}

export interface BranchRow {
  id: string;
  name: string;
  code: string | null;
  isMain: boolean;
}

export { ApiError };
