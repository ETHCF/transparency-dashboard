import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import styles from "./AdminMenu.module.css";

export const AdminMenu = (): JSX.Element => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const routerState = useRouterState();

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current) {
        return;
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [routerState.location.pathname]);

  return (
    <div className={styles.menu} ref={menuRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        Admin Menu
        <span className={styles.caret} aria-hidden>▾</span>
      </button>
      {open ? (
        <div className={styles.dropdown} role="menu">
          <Link to="/admin" role="menuitem" className={styles.item}>
            Overview
          </Link>
          <Link to="/admin/organization" role="menuitem" className={styles.item}>
            Organization
          </Link>
          <Link to="/admin/expenses" role="menuitem" className={styles.item}>
            Expenses
          </Link>
          <Link to="/admin/grants" role="menuitem" className={styles.item}>
            Grants
          </Link>
          <Link to="/admin/wallets" role="menuitem" className={styles.item}>
            Wallets
          </Link>
          <Link to="/admin/add-asset" role="menuitem" className={styles.item}>
            Add Asset
          </Link>
          <Link to="/admin/transfers" role="menuitem" className={styles.item}>
            Transfers
          </Link>
          <Link to="/admin/budgets" role="menuitem" className={styles.item}>
            Budget Allocations
          </Link>
          <Link to="/admin/add-admin" role="menuitem" className={styles.item}>
            Add Admin
          </Link>
          <Link to="/admin/admins" role="menuitem" className={styles.item}>
            Admins
          </Link>
          <Link to="/admin/audit-log" role="menuitem" className={styles.item}>
            Audit Log
          </Link>
        </div>
      ) : null}
    </div>
  );
};
