import clsx from "clsx";
import type { ReactNode } from "react";

import styles from "./AppShell.module.css";

export interface AppShellProps {
  header?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  centered?: boolean;
  className?: string;
}

export const AppShell = ({
  header,
  sidebar,
  footer,
  children,
  centered,
  className,
}: AppShellProps): JSX.Element => (
  <div className={clsx(styles.shell, className)}>
    {header}
    <div className={clsx(styles.content, sidebar && styles.withSidebar)}>
      {sidebar ? <aside className={styles.sidebar}>{sidebar}</aside> : null}
      <main className={clsx(styles.main, centered && styles.centered)}>
        {children}
      </main>
    </div>
    {footer}
  </div>
);
