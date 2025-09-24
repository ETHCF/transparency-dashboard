import { Outlet, redirect } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";

import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useAuthStore } from "@/stores/auth";

import styles from "./__layout.module.css";

const adminNavItems = [
  { label: "Overview", to: "/admin" },
  { label: "Organization", to: "/admin/organization" },
  { label: "Wallets", to: "/admin/wallets" },
  { label: "Asset", to: "/admin/add-asset" },
  { label: "Transfers", to: "/admin/transfers" },
  { label: "Expenses", to: "/admin/expenses" },
  { label: "Grants", to: "/admin/grants" },
  { label: "Admins", to: "/admin/admins" },
  { label: "Admin", to: "/admin/add-admin" },
  { label: "Audit Log", to: "/admin/audit-log" },
];

const AdminLayout = (): JSX.Element => (
  <div className={styles.layout}>
    <AdminSidebar items={adminNavItems} />
    <div className={styles.content}>
      <Outlet />
    </div>
  </div>
);

export const Route = createFileRoute("/admin/__layout")({
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: AdminLayout,
});
