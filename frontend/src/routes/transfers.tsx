import { useCallback, useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { Page, PageSection } from "@/components/layout/Page";
import { DataTable } from "@/components/table/DataTable";
import type { ColumnDef } from "@/components/table/DataTable";
import { createTransferColumns } from "@/components/transfers/columns";
import { useTreasuryQuery } from "@/services/treasury";
import { useTransfersQuery } from "@/services/transfers";
import type { TransferRecord } from "@/types/domain";
import { formatDateTime } from "@/utils/format";

const PAGE_SIZE = 25;

export const Route = createFileRoute("/transfers")({
  component: TransfersPage,
});

function TransfersPage(): JSX.Element {
  const [pagination, setPagination] = useState({ limit: PAGE_SIZE, offset: 0 });

  const treasuryQuery = useTreasuryQuery();
  const transfersQuery = useTransfersQuery(pagination);

  const treasuryAssets = treasuryQuery.data?.assets ?? [];
  const treasuryWalletAddresses = useMemo(() => {
    if (!treasuryQuery.data?.wallets) {
      return new Set<string>();
    }

    return new Set(
      treasuryQuery.data.wallets
        .map((wallet) => wallet.address?.toLowerCase())
        .filter((address): address is string => Boolean(address)),
    );
  }, [treasuryQuery.data?.wallets]);

  const isTreasuryWallet = useCallback(
    (address?: string | null) =>
      address ? treasuryWalletAddresses.has(address.toLowerCase()) : false,
    [treasuryWalletAddresses],
  );

  const assetDecimalsByAddress = useMemo(() => {
    const map = new Map<string, number>();
    treasuryAssets.forEach((asset) => {
      if (asset.address && typeof asset.decimals === "number") {
        map.set(asset.address.toLowerCase(), asset.decimals);
      }
    });
    return map;
  }, [treasuryAssets]);

  const assetDecimalsBySymbol = useMemo(() => {
    const map = new Map<string, number>();
    treasuryAssets.forEach((asset) => {
      if (asset.symbol && typeof asset.decimals === "number") {
        map.set(asset.symbol.toLowerCase(), asset.decimals);
      }
    });
    return map;
  }, [treasuryAssets]);

  const getAssetDecimals = useCallback(
    (transfer: TransferRecord) => {
      const ETH_PLACEHOLDER_ADDRESS =
        "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
      const DEFAULT_TOKEN_DECIMALS: Record<string, number> = {
        usdc: 6,
        usdt: 6,
        usdcet: 6,
        busd: 18,
        dai: 18,
        weth: 18,
        wbtc: 8,
        btc: 8,
      };

      const address = transfer.asset?.toLowerCase();
      if (address) {
        const decimals = assetDecimalsByAddress.get(address);
        if (decimals !== undefined) {
          return decimals;
        }
        if (address === ETH_PLACEHOLDER_ADDRESS) {
          return 18;
        }
      }

      const symbol = transfer.assetSymbol?.toLowerCase();
      if (symbol) {
        const decimals = assetDecimalsBySymbol.get(symbol);
        if (decimals !== undefined) {
          return decimals;
        }

        const fallback = DEFAULT_TOKEN_DECIMALS[symbol];
        if (fallback !== undefined) {
          return fallback;
        }
      }

      return undefined;
    },
    [assetDecimalsByAddress, assetDecimalsBySymbol],
  );

  const baseColumns = useMemo(
    () => createTransferColumns(isTreasuryWallet, getAssetDecimals),
    [getAssetDecimals, isTreasuryWallet],
  );

  const columns = useMemo<ColumnDef<TransferRecord>[]>(
    () => [
      ...baseColumns,
      {
        key: "timestamp",
        header: "Date",
        render: (transfer) => formatDateTime(transfer.timestamp),
        align: "right",
      },
    ],
    [baseColumns],
  );

  const data = transfersQuery.data ?? [];
  const isInitialLoading = transfersQuery.isPending || treasuryQuery.isPending;
  const hasError = transfersQuery.isError;
  const reachedEnd = data.length < pagination.limit;

  const handlePrev = () => {
    setPagination((current) => ({
      limit: current.limit,
      offset: Math.max(current.offset - current.limit, 0),
    }));
  };

  const handleNext = () => {
    if (reachedEnd) {
      return;
    }
    setPagination((current) => ({
      limit: current.limit,
      offset: current.offset + current.limit,
    }));
  };

  return (
    <Page>
      <PageSection
        title="Transfers"
        description="Full ledger of treasury movements"
        actions={
          <div
            style={{ display: "flex", gap: "var(--spacing-8)", flexWrap: "wrap" }}
          >
            <Link to="/" className="btn btnGhost">
              Back to dashboard
            </Link>
            <div style={{ display: "flex", gap: "var(--spacing-8)" }}>
              <button
                type="button"
                className="btn btnGhost"
                onClick={handlePrev}
                disabled={pagination.offset === 0 || isInitialLoading}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btnGhost"
                onClick={handleNext}
                disabled={isInitialLoading || reachedEnd}
              >
                Next
              </button>
            </div>
          </div>
        }
      >
        {isInitialLoading ? (
          <Loader label="Loading transfers" />
        ) : hasError ? (
          <ErrorState
            title="Failed to load transfers"
            description={transfersQuery.error?.message}
          />
        ) : (
          <DataTable
            columns={columns}
            data={data}
            getRowId={(transfer) => transfer.txHash}
            emptyState={<EmptyState title="No transfers found" />}
          />
        )}
      </PageSection>
    </Page>
  );
}
