import type { Chain } from "viem";

export interface RuntimeChainConfig {
  id: number;
}

export interface AppFeatureFlags {
  receiptsEnabled: boolean;
  auditLogsExportEnabled: boolean;
}

export interface AppRuntimeConfig {
  apiBaseUrl: string;
  walletConnectProjectId?: string;
  defaultChainId: number;
  supportedChains: RuntimeChainConfig[];
  organizationName?: string;
  features: AppFeatureFlags;
}

export interface ResolvedAppConfig extends AppRuntimeConfig {
  chains: Chain[];
  defaultChain: Chain;
}
