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

// Check if we're in dev mode
const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

// Dev mode default state
const devModeDefaults = isDevMode ? {
  token: 'dev-token',
  admin: {
    address: '0x554c5aF96E9e3c05AEC01ce18221d0DD25975aB4',
    name: 'Dev User (zak.eth)'
  } as AdminIdentity,
  isAuthenticated: true
} : {
  token: undefined,
  admin: undefined,
  isAuthenticated: false
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...devModeDefaults,
      login: ({ token, admin }) => set({ token, admin, isAuthenticated: true }),
      logout: () =>
        set({ token: undefined, admin: undefined, isAuthenticated: false }),
      setToken: (token) => set({ token, isAuthenticated: Boolean(token) }),
    }),
    {
      name: "ethcf-dashboard-auth",
      partialize: (state) => ({ token: state.token, admin: state.admin }),
      skipHydration: isDevMode, // In dev mode, skip hydration to use defaults
    },
  ),
);

export const getAuthToken = () => useAuthStore.getState().token;
