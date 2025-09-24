import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AdminIdentity {
  address: string;
  name?: string;
  roles?: string[];
}

interface AuthState {
  token?: string;
  admin?: AdminIdentity;
  isAuthenticated: boolean;
  login: (payload: { token: string; admin: AdminIdentity }) => void;
  logout: () => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: undefined,
      admin: undefined,
      isAuthenticated: false,
      login: ({ token, admin }) => set({ token, admin, isAuthenticated: true }),
      logout: () =>
        set({ token: undefined, admin: undefined, isAuthenticated: false }),
      setToken: (token) => set({ token, isAuthenticated: Boolean(token) }),
    }),
    {
      name: "ethcf-dashboard-auth",
      partialize: (state) => ({ token: state.token, admin: state.admin }),
    },
  ),
);

export const getAuthToken = () => useAuthStore.getState().token;
