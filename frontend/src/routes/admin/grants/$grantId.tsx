import { Outlet, createFileRoute } from "@tanstack/react-router";

const GrantLayout = () => <Outlet />;

export const Route = createFileRoute("/admin/grants/$grantId")({
  component: GrantLayout,
});
