import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useMemo } from "react";
import { WagmiProvider } from "wagmi";

import { queryClient } from "@/services/query-client";
import { createWagmiConfig } from "@/services/wagmi";

import { RuntimeConfigProvider, useRuntimeConfig } from "./runtime-config";

const WagmiComposer = ({ children }: PropsWithChildren): JSX.Element => {
  const config = useRuntimeConfig();
  const wagmiConfig = useMemo(() => createWagmiConfig(config), [config]);

  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
};

export const AppProviders = ({ children }: PropsWithChildren): JSX.Element => (
  <RuntimeConfigProvider>
    <QueryClientProvider client={queryClient}>
      <WagmiComposer>{children}</WagmiComposer>
    </QueryClientProvider>
  </RuntimeConfigProvider>
);
