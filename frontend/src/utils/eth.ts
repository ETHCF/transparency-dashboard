import type { Chain } from "viem";

import { getChainById } from "@/config/chains";
import { resolveRuntimeConfig } from "@/config/runtime";

export const truncateAddress = (address: string, start = 6, end = 4) => {
  if (!address) {
    return "";
  }

  return `${address.slice(0, start)}…${address.slice(-end)}`;
};

const getExplorer = (chain: Chain) =>
  chain.blockExplorers?.default?.url ?? "https://etherscan.io";

export const buildExplorerUrl = (
  type: "address" | "tx",
  value: string,
  chainId?: number,
) => {
  const config = resolveRuntimeConfig();
  const chain = chainId ? getChainById(chainId) : config.defaultChain;
  const base = chain ? getExplorer(chain) : "https://etherscan.io";

  return `${base.replace(/\/$/, "")}/${type}/${value}`;
};
