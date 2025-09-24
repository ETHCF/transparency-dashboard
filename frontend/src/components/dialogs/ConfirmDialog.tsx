import * as AlertDialog from "@radix-ui/react-alert-dialog";
import type { ReactNode } from "react";

import styles from "./ConfirmDialog.module.css";

export interface ConfirmDialogProps {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "default" | "danger";
}

export const ConfirmDialog = ({
  trigger,
  title,
  description,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
}: ConfirmDialogProps): JSX.Element => (
  <AlertDialog.Root>
    <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className={styles.overlay} />
      <AlertDialog.Content className={styles.content}>
        <AlertDialog.Title className={styles.title}>{title}</AlertDialog.Title>
        {description ? (
          <AlertDialog.Description className={styles.description}>
            {description}
          </AlertDialog.Description>
        ) : null}
        <div className={styles.actions}>
          <AlertDialog.Cancel className={styles.button}>
            {cancelLabel}
          </AlertDialog.Cancel>
          <AlertDialog.Action
            className={`${styles.button} ${variant === "danger" ? styles.danger : ""}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialog.Action>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>
);
