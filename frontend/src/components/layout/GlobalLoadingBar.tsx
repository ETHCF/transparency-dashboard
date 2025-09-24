import { useUiStore } from "@/stores/ui";

import styles from "./GlobalLoadingBar.module.css";

export const GlobalLoadingBar = (): JSX.Element | null => {
  const isLoading = useUiStore((state) => state.isGlobalLoading);

  if (!isLoading) {
    return null;
  }

  return <div className={styles.bar} />;
};
