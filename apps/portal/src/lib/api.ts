import { fetchWithTimeout, parseJsonBody } from "./http";

function resolveApiBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";
  if (!fromEnv) return "";
  if (typeof window === "undefined") return fromEnv;
  const pointsToLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(fromEnv);
  const onLocalhost =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (pointsToLocalhost && !onLocalhost) return "";
  return fromEnv.replace(/\/$/, "");
}

const API_URL = resolveApiBaseUrl();

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
    address: string | null;
    logoUrl: string | null;
    primaryColor?: string;
    accentColor?: string;
  };
  customer: { name: string; phone: string | null; whatsapp: string | null };
  vehicle: {
    id: string;
    plate: string;
    brand: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    currentKm: number | null;
    vehicleKind: string | null;
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

export interface PortalNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  serviceOrderId: string | null;
  quoteId: string | null;
  createdAt: string;
}

export interface PortalVehicle {
  id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  currentKm: number | null;
  vehicleKind: string | null;
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

export class ApiError extends Error {
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

  return parseJsonBody<T>(res);
}

export const api = {
  publicBranding: () =>
    request<{
      name: string | null;
      tradeName: string | null;
      logoUrl: string | null;
      primaryColor?: string;
      accentColor?: string;
    }>("/auth/branding", { method: "GET" }),

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

  portalNotifications: (token: string, unreadOnly?: boolean) =>
    request<PortalNotification[]>(
      `/portal/notifications${unreadOnly ? "?unreadOnly=true" : ""}`,
      { method: "GET" },
      token,
    ),

  portalMarkNotificationRead: (token: string, id: string) =>
    request<{ ok: boolean }>(`/portal/notifications/${id}/read`, { method: "PATCH" }, token),

  portalMarkAllNotificationsRead: (token: string) =>
    request<{ ok: boolean }>("/portal/notifications/read-all", { method: "PATCH" }, token),

  portalVehicles: (token: string) =>
    request<PortalVehicle[]>("/portal/vehicles", { method: "GET" }, token),

  portalSwitchVehicle: (token: string, vehicleId: string) =>
    request<PortalSession>("/portal/switch-vehicle", {
      method: "POST",
      body: JSON.stringify({ vehicleId }),
    }, token),
};
