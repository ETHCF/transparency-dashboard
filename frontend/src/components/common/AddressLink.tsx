import { useCallback } from "react";

import { CopyIcon } from "@/components/icons";
import { useUiStore } from "@/stores/ui";
import { buildExplorerUrl, truncateAddress } from "@/utils/eth";

import styles from "./AddressLink.module.css";

export interface AddressLinkProps {
  address: string;
  chainId?: number;
  label?: string;
  showCopy?: boolean;
}

export const AddressLink = ({
  address,
  chainId,
  label,
  showCopy = true,
}: AddressLinkProps): JSX.Element => {
  const addToast = useUiStore((state) => state.addToast);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      addToast({
        title: "Address copied",
        description: truncateAddress(address),
        variant: "success",
      });
    } catch (error) {
      addToast({
        title: "Copy failed",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    }
  }, [addToast, address]);

  return (
    <span className={styles.address}>
      <a
        href={buildExplorerUrl("address", address, chainId)}
        target="_blank"
        rel="noreferrer"
      >
        {label ?? truncateAddress(address)}
      </a>
      {showCopy ? (
        <button
          type="button"
          aria-label="Copy address"
          className={styles.button}
          onClick={handleCopy}
        >
          <CopyIcon size={14} className={styles.icon} />
        </button>
      ) : null}
    </span>
  );
};
