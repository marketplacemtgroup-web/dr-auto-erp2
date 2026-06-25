import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  api,
  type PortalDashboard,
  type PortalMe,
  type PortalNotification,
  type PortalQuoteRow,
  type PortalSession,
  type PortalVehicle,
} from "../lib/api";
import { useBrandingStore } from "./brandingStore";

interface PortalState {
  session: PortalSession | null;
  me: PortalMe | null;
  dashboard: PortalDashboard | null;
  notifications: PortalNotification[];
  vehicles: PortalVehicle[];
  setSession: (s: PortalSession | null) => void;
  logout: () => void;
  login: (cpf: string, plate: string) => Promise<void>;
  loginByAccessToken: (accessToken: string) => Promise<void>;
  refresh: (opts?: { orders?: boolean; quotes?: boolean }) => Promise<void>;
  loadQuotes: () => Promise<PortalQuoteRow[]>;
  loadOrders: () => Promise<PortalDashboard["serviceOrders"]>;
  loadNotifications: () => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  loadVehicles: () => Promise<void>;
  switchVehicle: (vehicleId: string) => Promise<void>;
}

function buildMe(dashboard: PortalDashboard): PortalMe {
  return {
    organizationName: dashboard.organization.name,
    customer: {
      name: dashboard.customer.name,
      document: null,
    },
    vehicle: dashboard.vehicle,
    latestServiceOrder: dashboard.serviceOrders[0]
      ? {
          id: dashboard.serviceOrders[0].id,
          number: dashboard.serviceOrders[0].number,
          status: dashboard.serviceOrders[0].status,
          totalAmount: dashboard.serviceOrders[0].totalAmount,
          updatedAt: dashboard.serviceOrders[0].updatedAt,
        }
      : null,
  };
}

function applyBranding(dashboard: PortalDashboard) {
  useBrandingStore.getState().apply({
    name: dashboard.organization.name,
    tradeName: dashboard.organization.name,
    logoUrl: dashboard.organization.logoUrl,
    primaryColor: dashboard.organization.primaryColor,
    accentColor: dashboard.organization.accentColor,
  });
}

export const usePortalStore = create<PortalState>()(
  persist(
    (set, get) => ({
      session: null,
      me: null,
      dashboard: null,
      notifications: [],
      vehicles: [],
      setSession: (session) => set({ session }),
      logout: () =>
        set({
          session: null,
          me: null,
          dashboard: null,
          notifications: [],
          vehicles: [],
        }),
      login: async (cpf, plate) => {
        const session = await api.portalLogin(cpf, plate);
        set({ session });
        await get().refresh({ orders: true, quotes: true });
      },
      loginByAccessToken: async (accessToken) => {
        const session = await api.portalAccessByToken(accessToken);
        set({ session });
        await get().refresh({ orders: true, quotes: true });
      },
      refresh: async (opts) => {
        const token = get().session?.accessToken;
        if (!token) return;
        const loadOrders = opts?.orders ?? false;
        const loadQuotes = opts?.quotes ?? false;
        const prev = get().dashboard;

        const summary = await api.portalSummary(token);
        let serviceOrders = prev?.serviceOrders ?? [];
        let quotes = prev?.quotes ?? [];

        const tasks: Promise<void>[] = [];
        if (loadOrders) {
          tasks.push(
            api.portalOrders(token).then((res) => {
              serviceOrders = res.data;
            }),
          );
        }
        if (loadQuotes) {
          tasks.push(
            api.portalQuotes(token).then((res) => {
              quotes = res.data;
            }),
          );
        }
        if (tasks.length) await Promise.all(tasks);

        const dashboard: PortalDashboard = {
          ...summary,
          serviceOrders,
          quotes,
          attachments: [],
        };
        set({ dashboard, me: buildMe(dashboard) });
        applyBranding(dashboard);
      },
      loadQuotes: async () => {
        const token = get().session?.accessToken;
        if (!token) return [];
        const res = await api.portalQuotes(token);
        const dashboard = get().dashboard;
        if (dashboard) {
          const next = { ...dashboard, quotes: res.data };
          set({ dashboard: next, me: buildMe(next) });
        }
        return res.data;
      },
      loadOrders: async () => {
        const token = get().session?.accessToken;
        if (!token) return [];
        const res = await api.portalOrders(token);
        const dashboard = get().dashboard;
        if (dashboard) {
          const next = { ...dashboard, serviceOrders: res.data };
          set({ dashboard: next, me: buildMe(next) });
        }
        return res.data;
      },
      loadNotifications: async () => {
        const token = get().session?.accessToken;
        if (!token) return;
        const notifications = await api.portalNotifications(token);
        set({ notifications });
      },
      markAllNotificationsRead: async () => {
        const token = get().session?.accessToken;
        if (!token) return;
        await api.portalMarkAllNotificationsRead(token);
        await get().loadNotifications();
      },
      loadVehicles: async () => {
        const token = get().session?.accessToken;
        if (!token) return;
        const res = await api.portalVehicles(token);
        set({ vehicles: res.data });
      },
      switchVehicle: async (vehicleId) => {
        const token = get().session?.accessToken;
        if (!token) return;
        const session = await api.portalSwitchVehicle(token, vehicleId);
        set({ session, notifications: [], vehicles: [], dashboard: null });
        await get().refresh({ orders: true, quotes: true });
        await get().loadVehicles();
      },
    }),
    {
      name: "oficina-beto-portal",
      partialize: (state) => ({
        session: state.session,
        dashboard: state.dashboard,
      }),
    },
  ),
);

export function useUnreadNotificationCount() {
  return usePortalStore((s) => s.notifications.filter((n) => !n.read).length);
}
