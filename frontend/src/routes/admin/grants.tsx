import { Outlet, createFileRoute } from "@tanstack/react-router";

const GrantsLayout = () => <Outlet />;

export const Route = createFileRoute("/admin/grants")({
  component: GrantsLayout,
});
