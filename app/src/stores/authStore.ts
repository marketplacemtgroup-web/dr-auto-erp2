import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, type AuthSession } from "../lib/api";

interface AuthState {
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
  login: (email: string, password: string) => Promise<void>;
  registerOrganization: (data: {
    organizationName: string;
    tradeName?: string;
    document?: string;
    email: string;
    password: string;
    name: string;
    phone?: string;
  }) => Promise<void>;
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
      registerOrganization: async (data) => {
        const session = await api.registerOrganization(data);
        set({ session });
      },
      logout: () => set({ session: null }),
      refreshMe: async () => {
        const token = get().session?.accessToken;
        if (!token) return;
        try {
          const session = await api.me(token);
          set({ session });
        } catch {
          set({ session: null });
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
