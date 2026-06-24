import { fetchWithTimeout, parseJsonBody } from "./http";
import type { ServiceOrderItemType } from "./itemType";

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

function buildQuery(params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) q.set(key, value);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

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

export interface DashboardOperationalKpis {
  openServiceOrders: number;
  openServiceOrdersTrend: number;
  vehiclesInShop: number;
  vehiclesInShopTrend: number;
  pendingQuotes: number;
  pendingQuotesTrend: number;
  lowStockParts: number;
  lowStockPartsTrend: number;
  delayedServices: number;
  waitingClients: number;
}

export interface DashboardFinancialKpis {
  dailyRevenue: number;
  dailyRevenueTrend: number;
  dailyProfit: number;
  dailyProfitTrend: number;
  invoicesThisMonth: number;
  averageTicket: number;
  monthlyRevenue: number;
  averageServiceTimeMinutes: number;
  partsProfit: number;
  servicesProfit: number;
  scannerProfit?: number;
  outsourcedProfit?: number;
  grossProfit?: number;
  expenses?: number;
  totalProfit?: number;
}

export type DashboardKpis = DashboardOperationalKpis & DashboardFinancialKpis;

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
  lineType: "SERVICE" | "PART" | "SCANNER" | "THIRD_PARTY";
  quantity: number;
  unitPrice: string | number;
  discount?: string | number;
  approved?: boolean | null;
  sortOrder?: number;
  serviceOrderItemId?: string | null;
}

export interface PortalQuoteItemRow {
  id: string;
  description: string;
  itemType: "SERVICE" | "PART" | "SCANNER" | "THIRD_PARTY";
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
  supplierId?: string | null;
  supplierName: string;
  status: string;
  purchaseType?: string;
  subtotal?: string | number;
  freight?: string | number;
  totalAmount: string | number;
  financialStatus?: string;
  stockStatus?: string;
  createdAt: string;
  supplier?: { id: string; legalName: string; tradeName: string | null } | null;
  items?: Array<{ id: string }>;
}

export interface PurchaseOrderItemRow {
  id: string;
  productId?: string | null;
  description: string;
  quantity: number;
  quantityReceived: number;
  unitCost: string | number;
  discount: string | number;
  finalUnitCost: string | number;
  total: string | number;
  movesStock: boolean;
  product?: { id: string; name: string; sku: string | null; stock?: number } | null;
}

export interface PurchaseOrderDetail extends PurchaseOrderRow {
  insurance?: string | number;
  otherExpenses?: string | number;
  discount?: string | number;
  surcharge?: string | number;
  invoiceNumber?: string | null;
  notes?: string | null;
  paymentTerms?: {
    installments?: number;
    firstDueDate?: string;
    intervalDays?: number;
  } | null;
  items: PurchaseOrderItemRow[];
}

export interface SupplierRow {
  id: string;
  personType: string;
  legalName: string;
  tradeName: string | null;
  document: string | null;
  supplierType: string;
  status: string;
  phone: string | null;
  whatsapp?: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  createdAt: string;
}

export interface SupplierDetail extends SupplierRow {
  contactName?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  zipCode?: string | null;
  street?: string | null;
  addressNumber?: string | null;
  district?: string | null;
  complement?: string | null;
  defaultPaymentDays?: number | null;
  pixKey?: string | null;
  notes?: string | null;
}

export interface SupplierProfile {
  supplier: SupplierDetail;
  stats: {
    purchaseCount: number;
    totalPurchased: number;
    openPayablesCount: number;
    openPayablesAmount: number;
  };
  recentPurchases: Array<{
    id: string;
    number: string;
    status: string;
    totalAmount: string | number;
    createdAt: string;
    financialStatus: string;
    stockStatus: string;
  }>;
}

export type PaymentMethod =
  | "CASH"
  | "PIX"
  | "CARD"
  | "BOLETO"
  | "TRANSFER"
  | "OTHER";

export interface FinancialReceiveQueueOrder {
  serviceOrderId: string;
  number: number;
  status: string;
  totalAmount: number;
  customerName: string;
  plate: string;
}

export interface FinancialReceiveQueue {
  readyToBill: FinancialReceiveQueueOrder[];
  openReceivables: FinancialEntryRow[];
}

export interface FinancialProfitSummary {
  from: string;
  to: string;
  revenue: number;
  expenses: number;
  partsProfit: number;
  servicesProfit: number;
  scannerProfit?: number;
  outsourcedProfit?: number;
  grossProfit: number;
  totalProfit: number;
  partsRevenue: number;
  servicesRevenue: number;
  scannerRevenue?: number;
  outsourcedRevenue?: number;
}

export interface FinancialEntryRow {
  id: string;
  description: string;
  type: "PAYABLE" | "RECEIVABLE";
  status: string;
  dueDate: string;
  amount: string | number;
  createdAt: string;
  paymentMethod?: PaymentMethod | null;
  discountAmount?: string | number;
  discountPercent?: string | number | null;
  amountReceived?: string | number | null;
  paymentSplits?: Array<{
    id: string;
    paymentMethod: PaymentMethod;
    amount: string | number;
  }>;
  paidAt?: string | null;
  installmentNumber?: number;
  installmentTotal?: number;
  origin?: string;
  interestAmount?: string | number;
  penaltyAmount?: string | number;
  feeAmount?: string | number;
  customer?: { id: string; name: string } | null;
  supplier?: { id: string; legalName: string; tradeName: string | null } | null;
  purchaseOrder?: { id: string; number: string } | null;
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

export interface ReportsQueryParams {
  from?: string;
  to?: string;
  compare?: boolean;
}

export interface ReportsFull {
  period: { from: string; to: string };
  comparison: {
    period: { from: string; to: string };
    revenueChange: number;
    profitChange: number;
    averageTicketChange: number;
    deliveredOrdersChange: number;
    previousRevenue: number;
    previousProfit: number;
  } | null;
  financial: {
    revenueToday: number;
    revenue: number;
    expense: number;
    expenses: number;
    result: number;
    partsProfit: number;
    servicesProfit: number;
    scannerProfit?: number;
    outsourcedProfit?: number;
    grossProfit: number;
    totalProfit: number;
    partsRevenue: number;
    servicesRevenue: number;
    scannerRevenue?: number;
    outsourcedRevenue?: number;
    discountsGiven: number;
    openReceivables: { count: number; amount: number };
    openPayables: { count: number; amount: number };
    overdueReceivables: Array<{
      id: string;
      description: string;
      amount: number;
      dueDate: string;
      customerName: string | null;
      serviceOrderNumber: number | null;
    }>;
    paymentMethods: Array<{ method: PaymentMethod; amount: number; count: number }>;
    cashFlow: {
      paymentIn: number;
      supply: number;
      withdrawal: number;
      paymentOut: number;
      netCash: number;
    };
    dreByMonth: Array<{ month: string; revenue: number; expense: number; result: number }>;
    revenueByDay: Array<{ date: string; amount: number }>;
    paymentReceipts: Array<{
      paymentMethod: PaymentMethod;
      amount: number;
      customerName: string | null;
      description: string;
      serviceOrderNumber: number | null;
      paidAt: string | null;
    }>;
  };
  operations: {
    ordersByStatus: Array<{ status: string; count: number }>;
    openOrdersCount: number;
    deliveredCount: number;
    averageTicket: number;
    averageDeliveryDays: number;
    delayedOrders: Array<{
      id: string;
      number: number;
      status: string;
      customerName: string;
      plate: string;
      estimatedAt: string | null;
    }>;
    ordersByMechanic: Array<{
      name: string;
      count: number;
      total: number;
      deliveredCount: number;
      averageDeliveryDays: number;
    }>;
    topServices: Array<{ description: string; count: number; revenue: number }>;
    topScanner?: Array<{ description: string; count: number; revenue: number }>;
    topOutsourced?: Array<{ description: string; count: number; revenue: number }>;
    topParts: Array<{ description: string; count: number; revenue: number; profit: number }>;
    marginByOrder: Array<{
      id: string;
      number: number;
      customerName: string;
      plate: string;
      revenue: number;
      cost: number;
      margin: number;
      marginPercent: number;
      deliveredAt: string;
    }>;
    ordersHeatmap: Array<{ dow: number; hour: number; dayLabel: string; count: number }>;
    ordersCreatedCount: number;
  };
  commercial: {
    totalCustomers: number;
    totalVehicles: number;
    quoteFunnel: { DRAFT: number; PENDING: number; APPROVED: number; REJECTED: number; total: number };
    quoteConversion: { total: number; approved: number; rate: number };
    topCustomers: Array<{ id: string; name: string; revenue: number; orderCount: number }>;
    customersByOrigin: Array<{ origin: string; count: number }>;
    returningCustomers: {
      count: number;
      rate: number;
      list: Array<{ id: string; name: string; revenue: number; orderCount: number }>;
    };
    inactiveCustomers: Array<{ id: string; name: string; phone: string | null }>;
  };
  inventory: {
    lowStockCount: number;
    lowStock: Array<{
      name: string;
      sku: string | null;
      stock: number;
      reservedStock: number;
      minStock: number;
      salePrice: number;
    }>;
    stockValue: number;
    reorderSuggestion: Array<{
      name: string;
      sku: string | null;
      currentStock: number;
      minStock: number;
      suggestedQty: number;
    }>;
    topMovingProducts: Array<{
      name: string;
      sku: string | null;
      soldQty: number;
      revenue: number;
    }>;
    slowMovingProducts: Array<{
      name: string;
      sku: string | null;
      stock: number;
      stockValue: number;
    }>;
    purchasesBySupplier: Array<{ supplier: string; count: number; total: number }>;
    purchases: Array<{
      number: string;
      supplierName: string;
      status: string;
      totalAmount: number;
      createdAt: string;
    }>;
  };
}

export interface EmployeeMini {
  id: string;
  name: string;
  photoUrl?: string | null;
}

export interface EmployeeRow {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  accessProfile: string | null;
  photoUrl: string | null;
  isTechnical: boolean;
  jobTitle?: { id: string; name: string } | null;
  paymentConfig?: {
    paymentType: string;
    fixedSalary: string | number | null;
  } | null;
  member?: {
    id: string;
    isActive: boolean;
    user: { name: string; email: string; isActive: boolean };
    role: { name: string; slug: string };
  } | null;
  pendingCommission?: number;
  osInProgress?: number;
  monthToPay?: number;
}

export interface EmployeeDocumentRow {
  id: string;
  employeeId: string;
  docType: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}

export interface JobTitleRow {
  id: string;
  name: string;
  description: string | null;
  isTechnical: boolean;
  isActive: boolean;
  _count?: { employees: number };
}

export interface CommissionRuleRow {
  id: string;
  employeeId: string;
  ruleType: string;
  baseCalculation: string;
  percentage: string | number | null;
  fixedAmount: string | number | null;
  trigger: string;
  isActive: boolean;
  employee?: { id: string; name: string; paymentConfig?: { paymentType: string } | null };
  catalogItem?: { id: string; name: string } | null;
  product?: { id: string; name: string } | null;
}

export interface EmployeeEntryRow {
  id: string;
  employeeId: string;
  entryType: string;
  description: string;
  amount: string | number;
  entryDate: string;
  status: string;
  employee?: { id: string; name: string };
}

export interface PayrollRow {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  fixedSalary: string | number;
  totalCommissions: string | number;
  totalBonus: string | number;
  totalDiscounts: string | number;
  totalAdvances: string | number;
  netTotal: string | number;
  status: string;
  employee?: EmployeeRow;
}

export interface TeamStats {
  activeEmployees: number;
  pendingCommissions: number;
  monthPayments: number;
  osInProgress: number;
}

export interface ServiceOrderItemRow {
  id: string;
  description: string;
  itemType: "SERVICE" | "PART" | "SCANNER" | "THIRD_PARTY";
  quantity: number;
  unitPrice: string | number;
  discount?: string | number;
  expectedCommission?: string | number | null;
  executor?: EmployeeMini | null;
  soldBy?: EmployeeMini | null;
  appliedBy?: EmployeeMini | null;
  separatedBy?: EmployeeMini | null;
  catalogItem?: { id: string; name: string } | null;
  product?: { id: string; name: string } | null;
}

export interface ServiceOrderDetail extends ServiceOrderRow {
  complaint: string | null;
  diagnosis: string | null;
  internalNotes: string | null;
  customerVisibleNotes?: string | null;
  paymentAgreement?: string | null;
  entryKm?: number | null;
  enteredAt?: string | null;
  bay?: string | null;
  priority?: string;
  createdAt: string;
  generalResponsible?: EmployeeMini | null;
  checklistBy?: EmployeeMini | null;
  diagnosisBy?: EmployeeMini | null;
  quoteBy?: EmployeeMini | null;
  executionBy?: EmployeeMini | null;
  finalizedBy?: EmployeeMini | null;
  revisionIntervalKm?: number | null;
  revisionIntervalMonths?: number | null;
  oilChangeIntervalKm?: number | null;
  oilChangeIntervalMonths?: number | null;
  items: ServiceOrderItemRow[];
  quotes: Array<{
    id: string;
    number?: number | null;
    status: string;
    amount: string | number;
    createdAt: string;
    paymentAgreement?: string | null;
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

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function formatApiErrorMessage(
  message: string | string[] | undefined,
  fallback = "Erro na requisição",
): string {
  if (!message) return fallback;
  if (Array.isArray(message)) return message.join(". ");
  return message;
}

export function getErrorMessage(err: unknown, fallback = "Erro na requisição"): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

type RequestOptions = {
  allowEmpty?: boolean;
  timeoutMs?: number;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
  requestOpts: RequestOptions = {},
): Promise<T> {
  const { allowEmpty = false, timeoutMs } = requestOpts;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetchWithTimeout(
    `${API_URL}/api${path}`,
    {
      ...options,
      headers,
    },
    timeoutMs,
  );

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
    throw new ApiError(formatApiErrorMessage(body.message), res.status);
  }

  return parseJsonBody<T>(res, { allowEmpty });
}

function requestNullable<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  return request<T>(path, options, token, { allowEmpty: true });
}

export interface AuthSetupStatus {
  hasOrganization: boolean;
  singleTenant: boolean;
  organizationCount?: number;
  dbReady?: boolean;
  error?: string;
  detail?: string;
  hint?: string;
}

async function fetchSetupStatus(): Promise<AuthSetupStatus> {
  const res = await fetchWithTimeout(`${API_URL}/api/auth/setup-status`, { method: "GET" });
  const text = await res.text();
  let body: AuthSetupStatus = { hasOrganization: false, singleTenant: true };
  if (text.trim()) {
    try {
      body = JSON.parse(text) as AuthSetupStatus;
    } catch {
      /* resposta não-JSON */
    }
  }
  if (res.ok || body.error || body.hint) return body;
  throw new ApiError(formatApiErrorMessage(body.error), res.status);
}

export const api = {
  authSetupStatus: fetchSetupStatus,

  publicBranding: () =>
    request<{
      name: string | null;
      tradeName: string | null;
      logoUrl: string | null;
      primaryColor?: string;
      accentColor?: string;
    }>("/auth/branding", { method: "GET" }),

  login: (email: string, password: string) =>
    request<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  registerOrganization: async (
    data: {
      organizationName: string;
      tradeName?: string;
      document?: string;
      loginUsername: string;
      loginEmailDomain: string;
      password: string;
      name: string;
      phone?: string;
    },
    logo?: File | null,
  ) => {
    const form = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== "") form.append(key, value);
    });
    if (logo) form.append("logo", logo);

    const res = await fetchWithTimeout(`${API_URL}/api/auth/register-organization`, {
      method: "POST",
      body: form,
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
      throw new ApiError(body.message?.toString() ?? "Erro no cadastro", res.status);
    }
    return parseJsonBody<AuthSession>(res);
  },

  uploadOrganizationLogo: async (token: string, file: File) => {
    const form = new FormData();
    form.append("logo", file);
    const res = await fetchWithTimeout(`${API_URL}/api/organizations/current/logo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
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
      throw new ApiError(body.message?.toString() ?? "Erro no upload", res.status);
    }
    return parseJsonBody<OrganizationDetail>(res);
  },

  me: (token: string) =>
    request<AuthSession>("/auth/me", { method: "GET" }, token),

  dashboardOperationalKpis: (token: string) =>
    request<DashboardOperationalKpis>("/dashboard/kpis", { method: "GET" }, token),

  dashboardFinancialKpis: (token: string) =>
    request<DashboardFinancialKpis>(
      "/dashboard/kpis/financial",
      { method: "GET" },
      token,
      { timeoutMs: 45_000 },
    ),

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
      paymentAgreement: string;
      entryKm: number;
      bay: string;
      priority: string;
      statusReason: string;
      generalResponsibleId: string | null;
      checklistById: string | null;
      diagnosisById: string | null;
      quoteById: string | null;
      executionById: string | null;
      finalizedById: string | null;
      revisionIntervalKm: number | null;
      revisionIntervalMonths: number | null;
      oilChangeIntervalKm: number | null;
      oilChangeIntervalMonths: number | null;
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
    const payload = {
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      category: opts?.category,
      visibleToCustomer: opts?.visibleToCustomer,
      showOnQuote: opts?.showOnQuote,
    };

    const storageInfo = await request<{ directUpload: boolean }>(
      "/attachments/storage-info",
      { method: "GET" },
      token,
    );

    if (storageInfo.directUpload) {
      const prep = await request<{
        uploadUrl: string;
        storagePath: string;
        token?: string;
        headers: { "Content-Type": string };
      }>(
        `/attachments/service-order/${serviceOrderId}/prepare-upload`,
        { method: "POST", body: JSON.stringify(payload) },
        token,
      );
      const putHeaders: Record<string, string> = { ...prep.headers };
      if (prep.token) {
        putHeaders.Authorization = `Bearer ${prep.token}`;
      }
      const putRes = await fetch(prep.uploadUrl, {
        method: "PUT",
        headers: putHeaders,
        body: file,
      });
      if (!putRes.ok) {
        const detail = await putRes.text().catch(() => "");
        throw new ApiError(
          detail
            ? `Falha ao enviar arquivo para o storage: ${detail.slice(0, 200)}`
            : "Falha ao enviar arquivo para o Supabase Storage",
          putRes.status,
        );
      }
      return request<AttachmentRow>(
        `/attachments/service-order/${serviceOrderId}/confirm-upload`,
        { method: "POST", body: JSON.stringify({ ...payload, storagePath: prep.storagePath }) },
        token,
      );
    }

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
      itemType?: ServiceOrderItemType;
      quantity?: number;
      unitPrice: number;
      productId?: string;
      catalogItemId?: string;
      discount?: number;
      executorId?: string;
      soldById?: string;
      appliedById?: string;
      separatedById?: string;
    },
  ) =>
    request<ServiceOrderDetail>(
      `/service-orders/${serviceOrderId}/items`,
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  updateServiceOrderItem: (
    token: string,
    serviceOrderId: string,
    itemId: string,
    data: {
      description?: string;
      itemType?: ServiceOrderItemType;
      quantity?: number;
      unitPrice?: number;
      discount?: number;
      executorId?: string | null;
      soldById?: string | null;
      appliedById?: string | null;
      separatedById?: string | null;
    },
  ) =>
    request<ServiceOrderDetail>(
      `/service-orders/${serviceOrderId}/items/${itemId}`,
      { method: "PATCH", body: JSON.stringify(data) },
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

  quotes: (
    token: string,
    search?: string,
    status?: string,
    includeApproved?: boolean,
  ) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (includeApproved) params.set("includeApproved", "true");
    const q = params.toString();
    return request<QuoteRow[]>(`/quotes${q ? `?${q}` : ""}`, { method: "GET" }, token);
  },

  quote: (token: string, id: string) =>
    request<QuoteDetail>(`/quotes/${id}`, { method: "GET" }, token),

  createQuote: (
    token: string,
    data: {
      vehicleId?: string;
      serviceOrderId?: string;
      complaint?: string;
      amount?: number;
      status?: string;
    },
  ) =>
    request<QuoteDetail>("/quotes", { method: "POST", body: JSON.stringify(data) }, token),

  updateQuote: (
    token: string,
    id: string,
    data: Partial<{
      status: string;
      amount: number;
      paymentAgreement: string;
      freeTextEnabled: boolean;
      freeTextContent: string;
      freeTextAmount: number | null;
    }>,
  ) =>
    request<QuoteRow>(`/quotes/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),

  approveQuote: (
    token: string,
    id: string,
    data?: { lines?: Array<{ lineId: string; approved: boolean }> },
  ) =>
    request<QuoteRow>(`/quotes/${id}/approve`, {
      method: "PATCH",
      body: JSON.stringify(data ?? {}),
    }, token),

  rejectQuote: (token: string, id: string) =>
    request<QuoteRow>(`/quotes/${id}/reject`, { method: "PATCH" }, token),

  reopenQuoteSupplement: (token: string, id: string) =>
    request<QuoteDetail>(
      `/quotes/${id}/reopen-supplement`,
      { method: "POST", body: "{}" },
      token,
    ),

  deleteQuote: (token: string, id: string) =>
    request<{ ok: boolean }>(`/quotes/${id}`, { method: "DELETE" }, token),

  createQuoteShareLink: (token: string, quoteId: string) =>
    request<{ token: string; expiresAt: string; path: string; whatsappMessage?: string }>(
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
      zipCode: string;
      street: string;
      addressNumber: string;
      complement: string;
      district: string;
      city: string;
      state: string;
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

  purchaseOrders: (token: string, search?: string, status?: string) =>
    request<PurchaseOrderRow[]>(
      `/purchases${buildQuery({ search, status })}`,
      { method: "GET" },
      token,
    ),

  purchaseOrder: (token: string, id: string) =>
    request<PurchaseOrderDetail>(`/purchases/${id}`, { method: "GET" }, token),

  createPurchaseOrder: (
    token: string,
    data: {
      supplierId?: string;
      supplierName: string;
      purchaseType?: string;
      freight?: number;
      insurance?: number;
      otherExpenses?: number;
      discount?: number;
      surcharge?: number;
      notes?: string;
      paymentTerms?: { installments?: number; firstDueDate?: string; intervalDays?: number };
      items: Array<{
        productId?: string;
        description: string;
        quantity: number;
        unitCost: number;
        discount?: number;
        movesStock?: boolean;
      }>;
    },
  ) =>
    request<PurchaseOrderDetail>(
      "/purchases",
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  updatePurchaseOrder: (token: string, id: string, data: Record<string, unknown>) =>
    request<PurchaseOrderDetail>(
      `/purchases/${id}`,
      { method: "PATCH", body: JSON.stringify(data) },
      token,
    ),

  confirmPurchaseOrder: (
    token: string,
    id: string,
    data?: { postToStock?: boolean; autoCreateProducts?: boolean },
  ) =>
    request<PurchaseOrderDetail>(
      `/purchases/${id}/confirm`,
      { method: "PATCH", body: JSON.stringify(data ?? { postToStock: true }) },
      token,
    ),

  receivePurchaseOrder: (
    token: string,
    id: string,
    data?: { items?: Array<{ itemId: string; quantity: number }> },
  ) =>
    request<PurchaseOrderDetail>(
      `/purchases/${id}/receive`,
      { method: "PATCH", body: JSON.stringify(data ?? {}) },
      token,
    ),

  cancelPurchaseOrder: (token: string, id: string) =>
    request<PurchaseOrderDetail>(`/purchases/${id}/cancel`, { method: "PATCH" }, token),

  suppliers: (token: string, search?: string, status?: string) =>
    request<SupplierRow[]>(`/suppliers${buildQuery({ search, status })}`, { method: "GET" }, token),

  supplier: (token: string, id: string) =>
    request<SupplierDetail>(`/suppliers/${id}`, { method: "GET" }, token),

  supplierProfile: (token: string, id: string) =>
    request<SupplierProfile>(`/suppliers/${id}/profile`, { method: "GET" }, token),

  createSupplier: (token: string, data: Partial<SupplierDetail> & { legalName: string; personType: string }) =>
    request<SupplierDetail>("/suppliers", { method: "POST", body: JSON.stringify(data) }, token),

  updateSupplier: (token: string, id: string, data: Partial<SupplierDetail>) =>
    request<SupplierDetail>(
      `/suppliers/${id}`,
      { method: "PATCH", body: JSON.stringify(data) },
      token,
    ),

  deleteSupplier: (token: string, id: string) =>
    request<SupplierDetail>(`/suppliers/${id}`, { method: "DELETE" }, token),

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
    data?: {
      paymentMethod?: PaymentMethod;
      paidAt?: string;
      registerInCash?: boolean;
      discountAmount?: number;
      discountPercent?: number;
      interestAmount?: number;
      penaltyAmount?: number;
      feeAmount?: number;
      splits?: Array<{
        paymentMethod: PaymentMethod;
        amount: number;
        registerInCash?: boolean;
      }>;
    },
  ) =>
    request<FinancialEntryRow>(`/financial/${id}/pay`, {
      method: "PATCH",
      body: JSON.stringify(data ?? {}),
    }, token),

  deleteFinancialEntry: (token: string, id: string, reason: string) =>
    request<{ ok: boolean }>(`/financial/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ reason }),
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

  financialReceiveQueue: (token: string) =>
    request<FinancialReceiveQueue>("/financial/receive-queue", { method: "GET" }, token),

  financialProfitSummary: (token: string, period: "day" | "week" | "month" | "year" = "month") =>
    request<FinancialProfitSummary>(
      `/financial/profit-summary?period=${encodeURIComponent(period)}`,
      { method: "GET" },
      token,
    ),

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

  reportsFull: (token: string, params?: ReportsQueryParams) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.compare) q.set("compare", "true");
    const suffix = q.toString() ? `?${q}` : "";
    return request<ReportsFull>(
      `/reports/full${suffix}`,
      { method: "GET" },
      token,
      { timeoutMs: 60_000 },
    );
  },

  reportsSummary: (token: string, params?: ReportsQueryParams) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const suffix = q.toString() ? `?${q}` : "";
    return request<ReportsSummary>(`/reports/summary${suffix}`, { method: "GET" }, token);
  },

  reportsBi: (token: string, params?: ReportsQueryParams) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const suffix = q.toString() ? `?${q}` : "";
    return request<ReportsBi>(`/reports/bi${suffix}`, { method: "GET" }, token);
  },

  reportsExport: (token: string, type: string, params?: ReportsQueryParams) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const suffix = q.toString() ? `?${q}` : "";
    return request<unknown[]>(`/reports/export/${type}${suffix}`, { method: "GET" }, token);
  },

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

  maintenanceReminders: (
    token: string,
    filter?: "overdue" | "upcoming" | "all",
  ) => {
    const q = filter ? `?filter=${filter}` : "";
    return request<MaintenanceReminderRow[]>(`/maintenance-reminders${q}`, { method: "GET" }, token);
  },

  maintenanceMonthOverdue: (token: string) =>
    request<MaintenanceReminderRow[]>(`/maintenance-reminders/month-overdue`, { method: "GET" }, token),

  updateMaintenanceReminder: (
    token: string,
    id: string,
    status: "COMPLETED" | "DISMISSED" | "ACTIVE",
  ) =>
    request<MaintenanceReminderRow>(`/maintenance-reminders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }, token),

  teamStats: (token: string) =>
    request<TeamStats>("/team/stats", { method: "GET" }, token),

  teamLoginEmailDomain: (token: string) =>
    request<{ loginEmailDomain: string }>("/team/login-email-domain", { method: "GET" }, token),

  employees: (
    token: string,
    params?: { status?: string; jobTitleId?: string; search?: string },
  ) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.jobTitleId) q.set("jobTitleId", params.jobTitleId);
    if (params?.search) q.set("search", params.search);
    const suffix = q.toString() ? `?${q}` : "";
    return request<EmployeeRow[]>(`/team/employees${suffix}`, { method: "GET" }, token);
  },

  employeeTechnicians: (token: string) =>
    request<EmployeeMini[]>("/team/employees/technicians", { method: "GET" }, token),

  employee: (token: string, id: string) =>
    request<EmployeeRow & Record<string, unknown>>(`/team/employees/${id}`, { method: "GET" }, token),

  createEmployee: (token: string, data: Record<string, unknown>) =>
    request<EmployeeRow>("/team/employees", { method: "POST", body: JSON.stringify(data) }, token),

  updateEmployee: (token: string, id: string, data: Record<string, unknown>) =>
    request<EmployeeRow>(`/team/employees/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),

  upsertEmployeePaymentConfig: (token: string, id: string, data: Record<string, unknown>) =>
    request<unknown>(`/team/employees/${id}/payment-config`, {
      method: "POST",
      body: JSON.stringify(data),
    }, token),

  createEmployeeAccess: (
    token: string,
    id: string,
    data: {
      loginUsername: string;
      password: string;
      accessProfile: string;
      accessActive?: boolean;
    },
  ) =>
    request<EmployeeRow>(`/team/employees/${id}/access`, {
      method: "POST",
      body: JSON.stringify(data),
    }, token),

  updateEmployeeAccess: (
    token: string,
    id: string,
    data: { accessProfile?: string; accessActive?: boolean },
  ) =>
    request<EmployeeRow>(`/team/employees/${id}/access`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }, token),

  resetEmployeePassword: (token: string, id: string, password: string) =>
    request<{ ok: boolean }>(`/team/employees/${id}/access/reset-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }, token),

  employeeDocuments: (token: string, employeeId: string) =>
    request<EmployeeDocumentRow[]>(`/team/employees/${employeeId}/documentos`, { method: "GET" }, token),

  uploadEmployeeDocument: async (
    token: string,
    employeeId: string,
    file: File,
    docType: string,
  ) => {
    const form = new FormData();
    form.append("file", file);
    form.append("docType", docType);
    const res = await fetch(`${API_URL}/api/team/employees/${employeeId}/documentos`, {
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
    return res.json() as Promise<EmployeeDocumentRow>;
  },

  deleteEmployeeDocument: (token: string, employeeId: string, docId: string) =>
    request<{ ok: boolean }>(`/team/employees/${employeeId}/documentos/${docId}`, {
      method: "DELETE",
    }, token),

  jobTitles: (token: string) =>
    request<JobTitleRow[]>("/team/job-titles", { method: "GET" }, token),

  createJobTitle: (token: string, data: { name: string; description?: string; isTechnical?: boolean }) =>
    request<JobTitleRow>("/team/job-titles", { method: "POST", body: JSON.stringify(data) }, token),

  commissionRules: (token: string, employeeId?: string) =>
    request<CommissionRuleRow[]>(
      `/team/commission-rules${employeeId ? `?employeeId=${employeeId}` : ""}`,
      { method: "GET" },
      token,
    ),

  createCommissionRule: (token: string, data: Record<string, unknown>) =>
    request<CommissionRuleRow>("/team/commission-rules", {
      method: "POST",
      body: JSON.stringify(data),
    }, token),

  updateCommissionRule: (token: string, id: string, data: Record<string, unknown>) =>
    request<CommissionRuleRow>(`/team/commission-rules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }, token),

  duplicateCommissionRule: (token: string, id: string) =>
    request<CommissionRuleRow>(`/team/commission-rules/${id}/duplicate`, { method: "POST" }, token),

  teamEntries: (
    token: string,
    params?: { employeeId?: string; entryType?: string; from?: string; to?: string },
  ) => {
    const q = new URLSearchParams();
    if (params?.employeeId) q.set("employeeId", params.employeeId);
    if (params?.entryType) q.set("entryType", params.entryType);
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const suffix = q.toString() ? `?${q}` : "";
    return request<EmployeeEntryRow[]>(`/team/entries${suffix}`, { method: "GET" }, token);
  },

  createTeamEntry: (token: string, data: Record<string, unknown>) =>
    request<EmployeeEntryRow>("/team/entries", { method: "POST", body: JSON.stringify(data) }, token),

  payrolls: (
    token: string,
    params?: { periodStart?: string; periodEnd?: string; employeeId?: string; status?: string },
  ) => {
    const q = new URLSearchParams();
    if (params?.periodStart) q.set("periodStart", params.periodStart);
    if (params?.periodEnd) q.set("periodEnd", params.periodEnd);
    if (params?.employeeId) q.set("employeeId", params.employeeId);
    if (params?.status) q.set("status", params.status);
    const suffix = q.toString() ? `?${q}` : "";
    return request<PayrollRow[]>(`/team/payroll${suffix}`, { method: "GET" }, token);
  },

  payrollPreview: (
    token: string,
    employeeId: string,
    periodStart: string,
    periodEnd: string,
  ) =>
    request<Record<string, unknown>>(
      `/team/payroll/preview?employeeId=${employeeId}&periodStart=${periodStart}&periodEnd=${periodEnd}`,
      { method: "GET" },
      token,
    ),

  payroll: (token: string, id: string) =>
    request<Record<string, unknown>>(`/team/payroll/${id}`, { method: "GET" }, token),

  createPayroll: (token: string, data: Record<string, unknown>) =>
    request<PayrollRow>("/team/payroll", { method: "POST", body: JSON.stringify(data) }, token),

  closePayroll: (token: string, id: string) =>
    request<PayrollRow>(`/team/payroll/${id}/close`, { method: "PATCH" }, token),

  markPayrollPaid: (token: string, id: string, paymentMethod?: string) =>
    request<PayrollRow>(`/team/payroll/${id}/paid`, {
      method: "PATCH",
      body: JSON.stringify({ paymentMethod }),
    }, token),

  teamProductivity: (
    token: string,
    periodStart: string,
    periodEnd: string,
    employeeId?: string,
  ) => {
    const q = new URLSearchParams({ periodStart, periodEnd });
    if (employeeId) q.set("employeeId", employeeId);
    return request<unknown[]>(`/team/productivity?${q}`, { method: "GET" }, token);
  },

  roles: (token: string) =>
    request<
      Array<{
        id: string;
        name: string;
        slug: string;
        permissions: Array<{ permission: { slug: string; name: string; module: string } }>;
      }>
    >("/roles", { method: "GET" }, token),

  permissions: (token: string) =>
    request<Array<{ id: string; slug: string; name: string; module: string }>>(
      "/roles/permissions",
      { method: "GET" },
      token,
    ),

  regenerateCommissions: (token: string, serviceOrderId: string) =>
    request<unknown[]>(`/team/commissions/regenerate/${serviceOrderId}`, { method: "POST" }, token),

  generatedCommissions: (token: string, params?: { employeeId?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.employeeId) q.set("employeeId", params.employeeId);
    if (params?.status) q.set("status", params.status);
    const suffix = q.toString() ? `?${q}` : "";
    return request<unknown[]>(`/team/commissions${suffix}`, { method: "GET" }, token);
  },

  escalasStats: (token: string, date?: string) =>
    request<EscalasStats>(
      `/escalas/stats${date ? `?date=${date}` : ""}`,
      { method: "GET" },
      token,
    ),

  escalas: (
    token: string,
    params?: {
      employeeId?: string;
      jobTitleId?: string;
      periodStart?: string;
      periodEnd?: string;
      dayType?: string;
      status?: string;
    },
  ) => {
    const q = new URLSearchParams();
    if (params?.employeeId) q.set("employeeId", params.employeeId);
    if (params?.jobTitleId) q.set("jobTitleId", params.jobTitleId);
    if (params?.periodStart) q.set("periodStart", params.periodStart);
    if (params?.periodEnd) q.set("periodEnd", params.periodEnd);
    if (params?.dayType) q.set("dayType", params.dayType);
    if (params?.status) q.set("status", params.status);
    const suffix = q.toString() ? `?${q}` : "";
    return request<ScheduleRow[]>(`/escalas${suffix}`, { method: "GET" }, token);
  },

  createEscala: (token: string, data: Record<string, unknown>) =>
    request<ScheduleRow>("/escalas", { method: "POST", body: JSON.stringify(data) }, token),

  createEscalaRecorrencia: (token: string, data: Record<string, unknown>) =>
    request<{ recurrence: unknown; schedulesCreated: number }>(
      "/escalas/recorrencia",
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  updateEscala: (token: string, id: string, data: Record<string, unknown>) =>
    request<ScheduleRow>(`/escalas/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),

  cancelEscala: (token: string, id: string) =>
    request<ScheduleRow>(`/escalas/${id}`, { method: "DELETE" }, token),

  escalasRelatorio: (
    token: string,
    periodStart: string,
    periodEnd: string,
    employeeId?: string,
  ) => {
    const q = new URLSearchParams({ periodStart, periodEnd });
    if (employeeId) q.set("employeeId", employeeId);
    return request<unknown[]>(`/escalas/relatorio?${q}`, { method: "GET" }, token);
  },

  pontoPainel: (token: string, date?: string) =>
    request<PontoPainel>(
      `/ponto/painel${date ? `?date=${date}` : ""}`,
      { method: "GET" },
      token,
    ),

  baterPonto: (token: string, data: { entryType: string; employeeId?: string; notes?: string }) =>
    request<unknown>("/ponto/bater", { method: "POST", body: JSON.stringify(data) }, token),

  pontoHistorico: (
    token: string,
    params?: { employeeId?: string; periodStart?: string; periodEnd?: string; status?: string },
  ) => {
    const q = new URLSearchParams();
    if (params?.employeeId) q.set("employeeId", params.employeeId);
    if (params?.periodStart) q.set("periodStart", params.periodStart);
    if (params?.periodEnd) q.set("periodEnd", params.periodEnd);
    if (params?.status) q.set("status", params.status);
    const suffix = q.toString() ? `?${q}` : "";
    return request<TimeClockDayRow[]>(`/ponto/historico${suffix}`, { method: "GET" }, token);
  },

  pontoAjustesPendentes: (token: string) =>
    request<TimeClockDayRow[]>("/ponto/ajustes-pendentes", { method: "GET" }, token),

  pontoAjuste: (token: string, data: Record<string, unknown>) =>
    request<TimeClockDayRow>("/ponto/ajuste", { method: "POST", body: JSON.stringify(data) }, token),

  pontoAprovarAjuste: (token: string, id: string) =>
    request<TimeClockDayRow>(`/ponto/ajuste/${id}/aprovar`, { method: "PATCH" }, token),

  pontoRecusarAjuste: (token: string, id: string, reason?: string) =>
    request<TimeClockDayRow>(
      `/ponto/ajuste/${id}/recusar`,
      { method: "PATCH", body: JSON.stringify({ reason }) },
      token,
    ),

  pontoRelatorio: (
    token: string,
    periodStart: string,
    periodEnd: string,
    params?: { employeeId?: string; jobTitleId?: string; status?: string },
  ) => {
    const q = new URLSearchParams({ periodStart, periodEnd });
    if (params?.employeeId) q.set("employeeId", params.employeeId);
    if (params?.jobTitleId) q.set("jobTitleId", params.jobTitleId);
    if (params?.status) q.set("status", params.status);
    return request<unknown[]>(`/ponto/relatorio?${q}`, { method: "GET" }, token);
  },

  pontoFuncionario: (
    token: string,
    employeeId: string,
    periodStart: string,
    periodEnd: string,
  ) =>
    request<Record<string, unknown>>(
      `/ponto/funcionario/${employeeId}?periodStart=${periodStart}&periodEnd=${periodEnd}`,
      { method: "GET" },
      token,
    ),

  solicitacoesFuncionarios: (
    token: string,
    params?: {
      employeeId?: string;
      requestType?: string;
      status?: string;
      periodStart?: string;
      periodEnd?: string;
    },
  ) => {
    const q = new URLSearchParams();
    if (params?.employeeId) q.set("employeeId", params.employeeId);
    if (params?.requestType) q.set("requestType", params.requestType);
    if (params?.status) q.set("status", params.status);
    if (params?.periodStart) q.set("periodStart", params.periodStart);
    if (params?.periodEnd) q.set("periodEnd", params.periodEnd);
    const suffix = q.toString() ? `?${q}` : "";
    return request<EmployeeRequestRow[]>(
      `/solicitacoes-funcionarios${suffix}`,
      { method: "GET" },
      token,
    );
  },

  createSolicitacaoFuncionario: (token: string, data: Record<string, unknown>) =>
    request<EmployeeRequestRow>(
      "/solicitacoes-funcionarios",
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  aprovarSolicitacaoFuncionario: (token: string, id: string) =>
    request<EmployeeRequestRow>(
      `/solicitacoes-funcionarios/${id}/aprovar`,
      { method: "PATCH" },
      token,
    ),

  recusarSolicitacaoFuncionario: (token: string, id: string, reason: string) =>
    request<EmployeeRequestRow>(
      `/solicitacoes-funcionarios/${id}/recusar`,
      { method: "PATCH", body: JSON.stringify({ reason }) },
      token,
    ),

  cancelarSolicitacaoFuncionario: (token: string, id: string) =>
    request<EmployeeRequestRow>(
      `/solicitacoes-funcionarios/${id}/cancelar`,
      { method: "PATCH" },
      token,
    ),
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
    customer: PrintCustomerSummary;
  };
}

export interface PrintCustomerSummary {
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  street?: string | null;
  addressNumber?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

export interface QuoteRow {
  id: string;
  number?: number | null;
  status: string;
  amount: string | number;
  createdAt: string;
  serviceOrder: {
    id?: string;
    number: number;
    vehicle: {
      plate: string;
      customer: { name: string };
    };
  };
}

export interface QuoteDetail extends QuoteRow {
  validUntil?: string | null;
  terms?: string | null;
  paymentAgreement?: string | null;
  freeTextEnabled?: boolean;
  freeTextContent?: string | null;
  freeTextAmount?: string | number | null;
  lines?: QuoteLineRow[];
  serviceOrder: {
    id: string;
    number: number;
    complaint?: string | null;
    vehicle: {
      plate: string;
      brand?: string | null;
      model?: string | null;
      year?: number | null;
      color?: string | null;
      customer: PrintCustomerSummary;
    };
    items?: ServiceOrderItemRow[];
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
  purchaseOrder?: { id: string; number: string } | null;
  supplier?: { id: string; legalName: string; tradeName: string | null } | null;
  unitCost?: string | number | null;
}

export interface AppointmentRow {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  source?: string;
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

export interface MaintenanceReminderRow {
  id: string;
  type: "REVISION" | "OIL_CHANGE";
  intervalKm: number | null;
  intervalMonths: number | null;
  baselineKm: number;
  baselineDate: string;
  dueKm: number | null;
  dueDate: string | null;
  status: string;
  isOverdue?: boolean;
  isUpcoming?: boolean;
  vehicle: {
    id: string;
    plate: string;
    currentKm: number | null;
    customer: { id: string; name: string };
  };
  serviceOrder: { id: string; number: number; status?: string };
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
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
}

export interface BranchRow {
  id: string;
  name: string;
  code: string | null;
  isMain: boolean;
  address?: string | null;
  street?: string | null;
  addressNumber?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

export interface EscalasStats {
  workingToday: number;
  offToday: number;
  weekPlantao: number;
  pendingConfirm: number;
}

export interface ScheduleRow {
  id: string;
  scheduleDate: string;
  dayOfWeek: number;
  dayType: string;
  startTime: string | null;
  endTime: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  status: string;
  notes: string | null;
  isRecurring: boolean;
  isException: boolean;
  employee: { id: string; name: string; jobTitle?: { name: string } | null };
}

export interface PontoPainel {
  stats: {
    presentNow: number;
    entriesToday: number;
    pendingExit: number;
    lateToday: number;
    pendingAdjustments: number;
    totalWorkedMinutes: number;
  };
  rows: TimeClockDayRow[];
}

export interface TimeClockDayRow {
  id: string;
  workDate: string;
  clockIn: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  clockOut: string | null;
  workedMinutes: number;
  expectedMinutes: number;
  lateMinutes: number;
  overtimeMinutes: number;
  earlyLeaveMinutes: number;
  status: string;
  clockInFormatted?: string | null;
  breakStartFormatted?: string | null;
  breakEndFormatted?: string | null;
  clockOutFormatted?: string | null;
  employee: { id: string; name: string; jobTitle?: { name: string } | null };
  schedule?: ScheduleRow | null;
}

export interface EmployeeRequestRow {
  id: string;
  requestType: string;
  referenceDate: string;
  description: string;
  attachmentUrl: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  employee: { id: string; name: string; jobTitle?: { name: string } | null };
}
