import { Link, useRouterState } from "@tanstack/react-router";
import clsx from "clsx";
import type { ReactNode } from "react";

import styles from "./AppHeader.module.css";

export interface HeaderNavItem {
  label: string;
  to: string;
  external?: boolean;
  end?: boolean;
  icon?: ReactNode;
}

export interface AppHeaderProps {
  organizationName: string;
  subtitle?: string;
  navItems?: HeaderNavItem[];
  actions?: ReactNode;
}

export const AppHeader = ({
  organizationName,
  subtitle,
  navItems,
  actions,
}: AppHeaderProps): JSX.Element => {
  const routerState = useRouterState();

  const isActive = (item: HeaderNavItem) => {
    const pathname = routerState.location.pathname;

    if (item.external) {
      return false;
    }

    if (item.end) {
      return pathname === item.to;
    }

    return pathname.startsWith(item.to);
  };

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.title}>{organizationName}</span>
      </div>
      {navItems && navItems.length > 0 ? (
        <nav className={styles.nav}>
          {navItems.map((item) =>
            item.external ? (
              <a
                key={item.label}
                href={item.to}
                target="_blank"
                rel="noreferrer"
                className={styles.navLink}
              >
                {item.icon}
                {item.label}
              </a>
            ) : (
              <Link
                key={item.label}
                to={item.to}
                className={clsx(
                  styles.navLink,
                  isActive(item) && styles.activeNavLink,
                )}
                activeOptions={{ exact: item.end }}
              >
                {item.icon}
                {item.label}
              </Link>
            ),
          )}
        </nav>
      ) : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
};
