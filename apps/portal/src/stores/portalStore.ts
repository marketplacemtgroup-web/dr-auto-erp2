import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  api,
  type PortalDashboard,
  type PortalMe,
  type PortalNotification,
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
  refresh: () => Promise<void>;
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
        await get().refresh();
        await get().loadNotifications();
      },
      loginByAccessToken: async (accessToken) => {
        const session = await api.portalAccessByToken(accessToken);
        set({ session });
        await get().refresh();
        await get().loadNotifications();
      },
      refresh: async () => {
        const token = get().session?.accessToken;
        if (!token) return;
        const dashboard = await api.portalDashboard(token);
        set({ dashboard, me: buildMe(dashboard) });
        useBrandingStore.getState().apply({
          name: dashboard.organization.name,
          tradeName: dashboard.organization.name,
          logoUrl: dashboard.organization.logoUrl,
          primaryColor: dashboard.organization.primaryColor,
          accentColor: dashboard.organization.accentColor,
        });
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
        const vehicles = await api.portalVehicles(token);
        set({ vehicles });
      },
      switchVehicle: async (vehicleId) => {
        const token = get().session?.accessToken;
        if (!token) return;
        const session = await api.portalSwitchVehicle(token, vehicleId);
        set({ session, notifications: [], vehicles: [] });
        await get().refresh();
        await get().loadNotifications();
        await get().loadVehicles();
      },
    }),
    {
      name: "dr-auto-portal",
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
