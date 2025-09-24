import {
  arbitrum,
  base,
  celo,
  gnosis,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from "viem/chains";
import type { Chain } from "viem";

const chainRegistry: Record<number, Chain> = {
  [mainnet.id]: mainnet,
  [optimism.id]: optimism,
  [polygon.id]: polygon,
  [arbitrum.id]: arbitrum,
  [base.id]: base,
  [gnosis.id]: gnosis,
  [celo.id]: celo,
  [sepolia.id]: sepolia,
};

export const getChainById = (id: number): Chain | undefined =>
  chainRegistry[id];

export const defaultSupportedChains: Chain[] = [mainnet, optimism, base];
