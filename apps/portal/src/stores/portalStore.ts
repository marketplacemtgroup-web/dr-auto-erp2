import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, type PortalDashboard, type PortalMe, type PortalSession } from "../lib/api";

interface PortalState {
  session: PortalSession | null;
  me: PortalMe | null;
  dashboard: PortalDashboard | null;
  setSession: (s: PortalSession | null) => void;
  logout: () => void;
  login: (cpf: string, plate: string) => Promise<void>;
  loginByAccessToken: (accessToken: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const usePortalStore = create<PortalState>()(
  persist(
    (set, get) => ({
      session: null,
      me: null,
      dashboard: null,
      setSession: (session) => set({ session }),
      logout: () => set({ session: null, me: null, dashboard: null }),
      login: async (cpf, plate) => {
        const session = await api.portalLogin(cpf, plate);
        set({ session });
        await get().refresh();
      },
      loginByAccessToken: async (accessToken) => {
        const session = await api.portalAccessByToken(accessToken);
        set({ session });
        await get().refresh();
      },
      refresh: async () => {
        const token = get().session?.accessToken;
        if (!token) return;
        const dashboard = await api.portalDashboard(token);
        set({
          dashboard,
          me: {
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
          },
        });
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

