import { Outlet, useLoaderData, Link } from "@tanstack/react-router";
import { createRootRouteWithContext } from "@tanstack/react-router";

import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppShell } from "@/components/layout/AppShell";
import { GlobalLoadingBar } from "@/components/layout/GlobalLoadingBar";
import { Toaster } from "@/components/common/Toaster";
import { ErrorState } from "@/components/common/ErrorState";
import { AdminMenu } from "@/components/layout/AdminMenu";
import { fetchTreasury } from "@/services/treasury";
import { queryKeys } from "@/services/query-keys";
import type { TreasuryOverview } from "@/types/domain";
import { useRuntimeConfig } from "@/providers/runtime-config";
import { useAuthStore } from "@/stores/auth";
import type { QueryClient } from "@tanstack/react-query";

export interface RouterContext {
  queryClient: QueryClient;
}

interface ErrorProps {
  error: Error;
}

const fallbackTreasury: TreasuryOverview = {
  organizationName: "",
  totalValueUsd: 0,
  totalValueEth: 0,
  totalFundsRaised: 0,
  lastUpdated: new Date(0),
  assets: [],
  wallets: [],
};

const RootComponent = () => {
  const data = useLoaderData({ from: Route.id });
  const treasury = data?.treasury ?? fallbackTreasury;
  const config = useRuntimeConfig();

  const hasAdminAccess = useAuthStore((state) => Boolean(state.token));

  const navItems = [
    { label: "Dashboard", to: "/", end: true },
    { label: "Transfers", to: "/transfers" },
    { label: "Grants", to: "/grant" },
    { label: "Expenses", to: "/expense" },
  ];

  const actions = hasAdminAccess ? (
    <AdminMenu />
  ) : (
    <Link to="/login" className="btn btn-primary">
      Sign In
    </Link>
  );

  const headerTitle =
    treasury.organizationName ||
    config.organizationName ||
    "Transparency Dashboard";

  return (
    <>
      <GlobalLoadingBar />
      <AppShell
        header={
          <AppHeader
            organizationName={headerTitle}
            navItems={navItems}
            actions={actions}
          />
        }
        footer={<AppFooter />}
      >
        <Outlet />
      </AppShell>
      <Toaster />
    </>
  );
};

const RootErrorComponent = ({ error }: ErrorProps) => {
  const config = useRuntimeConfig();
  const header = (
    <AppHeader
      organizationName={config.organizationName ?? "Transparency Dashboard"}
    />
  );

  return (
    <>
      <AppShell header={header} footer={<AppFooter />}>
        <ErrorState title="Unable to load data" description={error.message} />
      </AppShell>
      <Toaster />
    </>
  );
};

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: async ({ context }) => {
    const treasury = await context.queryClient.ensureQueryData({
      queryKey: queryKeys.treasury(),
      queryFn: fetchTreasury,
    });

    return { treasury };
  },
  component: RootComponent,
  errorComponent: RootErrorComponent,
});
