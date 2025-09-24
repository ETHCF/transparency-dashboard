import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import styles from "./AdminSidebar.module.css";

export interface AdminSidebarItem {
  label: string;
  to: string;
  icon?: ReactNode;
}

export interface AdminSidebarProps {
  title?: string;
  items: AdminSidebarItem[];
}

export const AdminSidebar = ({
  title = "Admin",
  items,
}: AdminSidebarProps): JSX.Element => {
  const routerState = useRouterState();

  return (
    <div className={styles.sidebar}>
      <span className={styles.sectionTitle}>{title}</span>
      <nav className={styles.navList}>
        {items.map((item) => {
          const active = routerState.location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`${styles.navItem} ${active ? styles.activeNavItem : ""}`}
            >
              {item.icon ? (
                <span className={styles.icon}>{item.icon}</span>
              ) : null}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
