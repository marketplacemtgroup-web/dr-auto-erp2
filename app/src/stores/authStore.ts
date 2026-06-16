import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, ApiError, type AuthSession } from "../lib/api";

interface AuthState {
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
  login: (email: string, password: string) => Promise<void>;
  registerOrganization: (
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
  ) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      setSession: (session) => set({ session }),
      login: async (email, password) => {
        const session = await api.login(email, password);
        set({ session });
      },
      registerOrganization: async (data, logo) => {
        const session = await api.registerOrganization(data, logo);
        set({ session });
      },
      logout: () => set({ session: null }),
      refreshMe: async () => {
        const token = get().session?.accessToken;
        if (!token) return;
        try {
          const session = await api.me(token);
          set({ session });
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            set({ session: null });
          }
        }
      },
    }),
    {
      name: "autocore-auth",
      partialize: (state) => ({ session: state.session }),
    },
  ),
);

export const useAuthUser = () => useAuthStore((s) => s.session?.user);
export const useAuthToken = () => useAuthStore((s) => s.session?.accessToken);
