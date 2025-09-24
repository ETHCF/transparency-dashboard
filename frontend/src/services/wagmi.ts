import type { ResolvedAppConfig } from "@/types/config";

import { mainnet, sepolia } from "viem/chains";
import { createConfig, http, injected } from "wagmi";
import { coinbaseWallet, metaMask } from "wagmi/connectors";

export type ChainId = typeof mainnet.id | typeof sepolia.id;
export const CHAIN_ID = 1;

export const createWagmiConfig = (config: ResolvedAppConfig) => {
  const transports = Object.fromEntries(
    config.chains.map((chain) => [chain.id, http()]),
  );
  const connectors = [
    metaMask({ dappMetadata: { name: "Transparency Dashboard" } }),
  ];

  return createConfig({
    chains: [mainnet, sepolia],
    connectors: [
      metaMask({
        dappMetadata: {
          name: "Transparency Dashboard",
          url: "https://example.com", // TODO: get url
        },
      }),
      coinbaseWallet({
        appName: "Transparency Dashboard",
        chainId: CHAIN_ID,
        darkMode: true,
      }),
      // TODO: get wallet connect id
      // walletConnect({ projectId: "" }),
      injected(),
    ],
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(),
    },
  });
};
