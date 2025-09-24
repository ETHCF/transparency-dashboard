import { create } from "zustand";

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface ToastAction {
  label: string;
  to?: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
  action?: ToastAction;
}

interface UiState {
  toasts: ToastMessage[];
  isGlobalLoading: boolean;
  addToast: (toast: Omit<ToastMessage, "id"> & { id?: string }) => void;
  dismissToast: (id: string) => void;
  setGlobalLoading: (value: boolean) => void;
}

const createId = () =>
  typeof crypto !== "undefined"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  isGlobalLoading: false,
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id: toast.id ?? createId(),
          title: toast.title,
          description: toast.description,
          variant: toast.variant,
          duration: toast.duration ?? 5000,
          action: toast.action,
        },
      ],
    })),
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  setGlobalLoading: (value) => set({ isGlobalLoading: value }),
}));
