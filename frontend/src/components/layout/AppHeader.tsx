import { Link, useRouterState } from "@tanstack/react-router";
import clsx from "clsx";
import { useState, useEffect, type ReactNode } from "react";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [elevated, setElevated] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setElevated(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className={clsx(styles.header, elevated && styles.elevated)}>
        <button
          className={styles.menuButton}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
          aria-expanded={mobileMenuOpen}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            {mobileMenuOpen ? (
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            ) : (
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            )}
          </svg>
        </button>
        <div className={styles.brand}>
          <img
            src="/logo.svg"
            alt={organizationName}
            style={{ height: '28px' }}
          />
          <Link to="/" className={styles.title}>
            {organizationName}
          </Link>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>
        {navItems && navItems.length > 0 ? (
          <nav className={clsx(styles.nav, mobileMenuOpen && styles.open)}>
            {navItems.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.to}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.navLink}
                  onClick={handleNavClick}
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
                  onClick={handleNavClick}
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
      {mobileMenuOpen && (
        <div
          className={clsx(styles.scrim, styles.visible)}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
};
