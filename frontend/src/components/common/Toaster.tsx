import * as ToastPrimitive from "@radix-ui/react-toast";
import { useNavigate } from "@tanstack/react-router";

import { useUiStore } from "@/stores/ui";

import styles from "./Toaster.module.css";

const toneToClass: Record<string, string | undefined> = {
  success: styles.success,
  warning: styles.warning,
  error: styles.error,
};

export const Toaster = (): JSX.Element => {
  const navigate = useNavigate();
  const toasts = useUiStore((state) => state.toasts);
  const dismissToast = useUiStore((state) => state.dismissToast);

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((toast) => (
        <ToastPrimitive.Root
          key={toast.id}
          open
          onOpenChange={(open) => {
            if (!open) {
              dismissToast(toast.id);
            }
          }}
          duration={toast.duration}
          className={`${styles.toast} ${toneToClass[toast.variant] ?? ""}`}
        >
          <div className={styles.content}>
            <ToastPrimitive.Title className={styles.title}>
              {toast.title}
            </ToastPrimitive.Title>
            {toast.description ? (
              <ToastPrimitive.Description className={styles.description}>
                {toast.description}
              </ToastPrimitive.Description>
            ) : null}
          </div>
          {toast.action ? (
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => {
                if (toast.action?.to) {
                  navigate({ to: toast.action.to });
                }
                dismissToast(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          ) : null}
          <ToastPrimitive.Close className={styles.close}>
            ✕
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className={styles.viewport} />
    </ToastPrimitive.Provider>
  );
};
