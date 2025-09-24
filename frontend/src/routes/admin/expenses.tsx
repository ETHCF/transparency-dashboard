import { Outlet, createFileRoute } from "@tanstack/react-router";

const ExpensesLayout = () => <Outlet />;

export const Route = createFileRoute("/admin/expenses")({
  component: ExpensesLayout,
});
