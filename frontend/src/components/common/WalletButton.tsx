import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

import { truncateAddress } from "@/utils/eth";

import styles from "./WalletButton.module.css";

export const WalletButton = (): JSX.Element => {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);

    try {
      const connector = connectors[0];

      if (!connector) {
        setError("No wallet connectors available");
        return;
      }

      await connectAsync({ connector });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    }
  };

  const handleDisconnect = async () => {
    setError(null);
    await disconnectAsync();
  };

  if (isConnected && address) {
    return (
      <div>
        <button
          type="button"
          className={`${styles.button} ${styles.connected}`}
          onClick={handleDisconnect}
        >
          {truncateAddress(address)}
        </button>
        {error ? <div>{error}</div> : null}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={styles.button}
        onClick={handleConnect}
        disabled={isPending}
      >
        {isPending ? "Connecting…" : "Connect Wallet"}
      </button>
      {error ? <div>{error}</div> : null}
    </div>
  );
};
