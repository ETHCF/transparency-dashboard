import * as Dialog from "@radix-ui/react-dialog";
import type { PropsWithChildren, ReactNode } from "react";

import styles from "./Modal.module.css";

export interface ModalProps extends PropsWithChildren {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
}

export const Modal = ({
  trigger,
  title,
  description,
  children,
}: ModalProps): JSX.Element => (
  <Dialog.Root>
    <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className={styles.overlay} />
      <Dialog.Content className={styles.content}>
        <header className={styles.header}>
          <Dialog.Title className={styles.title}>{title}</Dialog.Title>
          <Dialog.Close className={styles.close} aria-label="Close">
            ✕
          </Dialog.Close>
        </header>
        {description ? <p>{description}</p> : null}
        <div className={styles.body}>{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
