import { defaultSupportedChains, getChainById } from "@/config/chains";
import type { AppRuntimeConfig, ResolvedAppConfig } from "@/types/config";

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  }
  return undefined;
};

const baseConfig = (): AppRuntimeConfig => ({
  apiBaseUrl: "/api/v1",
  defaultChainId: defaultSupportedChains[0].id,
  walletConnectProjectId: undefined,
  supportedChains: defaultSupportedChains.map((chain) => ({ id: chain.id })),
  organizationName: "Transparency Dashboard",
  features: {
    receiptsEnabled: true,
    auditLogsExportEnabled: true,
  },
});

const readEnvConfig = (): Partial<AppRuntimeConfig> => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const defaultChainId = import.meta.env.VITE_DEFAULT_CHAIN_ID;
  const chainIds = import.meta.env.VITE_CHAIN_IDS as string | undefined;
  const receipts = parseBoolean(import.meta.env.VITE_FEATURE_RECEIPTS);
  const auditExport = parseBoolean(import.meta.env.VITE_FEATURE_AUDIT_EXPORTS);

  const supportedChains = chainIds
    ?.split(",")
    .map((id) => Number.parseInt(id.trim(), 10))
    .filter((id) => !Number.isNaN(id))
    .map((id) => ({ id }));

  return {
    apiBaseUrl,
    defaultChainId: defaultChainId
      ? Number.parseInt(defaultChainId, 10)
      : undefined,
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
    supportedChains,
    features: {
      receiptsEnabled: !!receipts,
      auditLogsExportEnabled: !!auditExport,
    },
  };
};

const mergeConfigs = (
  fallback: AppRuntimeConfig,
  overrides: Array<Partial<AppRuntimeConfig> | undefined>,
): AppRuntimeConfig => {
  const result: AppRuntimeConfig = {
    ...fallback,
    supportedChains: [...fallback.supportedChains],
    features: { ...fallback.features },
  };

  overrides.forEach((override) => {
    if (!override) {
      return;
    }

    if (override.apiBaseUrl) {
      result.apiBaseUrl = override.apiBaseUrl;
    }
    if (override.walletConnectProjectId !== undefined) {
      result.walletConnectProjectId = override.walletConnectProjectId;
    }
    if (override.defaultChainId) {
      result.defaultChainId = override.defaultChainId;
    }
    if (override.supportedChains && override.supportedChains.length > 0) {
      result.supportedChains = override.supportedChains;
    }
    if (override.organizationName) {
      result.organizationName = override.organizationName;
    }
    if (override.features) {
      result.features = {
        receiptsEnabled:
          override.features.receiptsEnabled ?? result.features.receiptsEnabled,
        auditLogsExportEnabled:
          override.features.auditLogsExportEnabled ??
          result.features.auditLogsExportEnabled,
      };
    }
  });

  return result;
};

let cachedConfig: ResolvedAppConfig | null = null;

export const resolveRuntimeConfig = (): ResolvedAppConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const fallback = baseConfig();
  const envConfig = readEnvConfig();
  const windowConfig =
    typeof window !== "undefined" ? window.__APP_CONFIG__ : undefined;
  const merged = mergeConfigs(fallback, [windowConfig, envConfig]);

  if (!merged.apiBaseUrl) {
    throw new Error("Missing API base URL in runtime configuration");
  }

  const chainObjects = merged.supportedChains
    .map((entry) => getChainById(entry.id))
    .filter((chain): chain is NonNullable<typeof chain> => Boolean(chain));

  const resolvedChains =
    chainObjects.length > 0 ? chainObjects : defaultSupportedChains;
  const resolvedDefault =
    resolvedChains.find((chain) => chain.id === merged.defaultChainId) ??
    resolvedChains[0];

  cachedConfig = {
    ...merged,
    defaultChainId: resolvedDefault.id,
    supportedChains: resolvedChains.map((chain) => ({ id: chain.id })),
    chains: resolvedChains,
    defaultChain: resolvedDefault,
  };

  return cachedConfig;
};
