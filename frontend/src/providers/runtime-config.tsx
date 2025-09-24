import { createContext, useContext, useMemo } from "react";
import type { PropsWithChildren } from "react";

import { resolveRuntimeConfig } from "@/config/runtime";
import type { ResolvedAppConfig } from "@/types/config";

const RuntimeConfigContext = createContext<ResolvedAppConfig | null>(null);

export const RuntimeConfigProvider = ({
  children,
}: PropsWithChildren): JSX.Element => {
  const value = useMemo(() => resolveRuntimeConfig(), []);

  return (
    <RuntimeConfigContext.Provider value={value}>
      {children}
    </RuntimeConfigContext.Provider>
  );
};

export const useRuntimeConfig = (): ResolvedAppConfig => {
  const context = useContext(RuntimeConfigContext);

  if (!context) {
    throw new Error("RuntimeConfigProvider missing in component tree");
  }

  return context;
};
