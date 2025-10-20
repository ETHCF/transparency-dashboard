import { useCallback, useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { ChevronLeftIcon, ChevronRightIcon, ExportIcon } from "@/components/icons";
import { Page, PageSection } from "@/components/layout/Page";
import { DataTable } from "@/components/table/DataTable";
import type { ColumnDef } from "@/components/table/DataTable";
import { createTransferColumns } from "@/components/transfers/columns";
import { useTreasuryQuery } from "@/services/treasury";
import { useTransfersQuery } from "@/services/transfers";
import type { TransferRecord } from "@/types/domain";
import { formatDateTime } from "@/utils/format";
import { generateMockTransfers } from "@/utils/mockData";
import { TransferEditModal } from "@/components/transfers/TransferEditModal";
import { useAuthStore } from "@/stores/auth";
import { exportTransfers, generatePDFReport } from "@/utils/export";

const PAGE_SIZE = 25;

export const Route = createFileRoute("/transfers")({
  component: TransfersPage,
});

function TransfersPage() {
  const [pagination, setPagination] = useState({ limit: PAGE_SIZE, offset: 0 });
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hasAdminAccess = useAuthStore((state) => Boolean(state.token));

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

  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';
  const mockTransfers = useMemo(() => generateMockTransfers(150), []);
  const apiData = transfersQuery.data ?? [];
  const data = isDevMode && apiData.length === 0 ? mockTransfers.slice(pagination.offset, pagination.offset + pagination.limit) : apiData;
  const isInitialLoading = transfersQuery.isPending || treasuryQuery.isPending;
  const hasError = transfersQuery.isError;
  const reachedEnd = isDevMode && apiData.length === 0
    ? pagination.offset + pagination.limit >= mockTransfers.length
    : data.length < pagination.limit;

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

  const handleTransferClick = (transfer: TransferRecord) => {
    if (hasAdminAccess) {
      setSelectedTransfer(transfer);
      setIsModalOpen(true);
    }
  };

  const handleSaveMetadata = (metadata: any) => {
    // TODO: Implement API call to save metadata
    // In a real implementation, this would call an API endpoint to save the metadata
  };

  const handleExportCSV = () => {
    exportTransfers(data, 'csv');
  };

  const handleExportJSON = () => {
    exportTransfers(data, 'json');
  };

  return (
    <Page>
      <PageSection
        title="Transfers"
        description="Full ledger of treasury movements"
        actions={
          <div
            style={{ display: "flex", gap: "var(--spacing-8)", flexWrap: "wrap", alignItems: "center" }}
          >
            <div style={{ display: "flex", gap: "var(--spacing-8)" }}>
              <button
                type="button"
                className="btn btn-outlined"
                onClick={handleExportCSV}
                disabled={!data.length}
                style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ExportIcon size={14} />
                Export CSV
              </button>
              <button
                type="button"
                className="btn btn-outlined"
                onClick={handleExportJSON}
                disabled={!data.length}
                style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ExportIcon size={14} />
                Export JSON
              </button>
            </div>
            <Link to="/" className="btn btnGhost">
              Back to dashboard
            </Link>
            <div style={{ display: "flex", gap: "var(--spacing-8)" }}>
              <button
                type="button"
                className="btn btnGhost"
                onClick={handlePrev}
                disabled={pagination.offset === 0 || isInitialLoading}
                aria-label="Previous page"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ChevronLeftIcon size={16} />
                Previous
              </button>
              <button
                type="button"
                className="btn btnGhost"
                onClick={handleNext}
                disabled={isInitialLoading || reachedEnd}
                aria-label="Next page"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Next
                <ChevronRightIcon size={16} />
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
            onRowClick={hasAdminAccess ? handleTransferClick : undefined}
          />
        )}
      </PageSection>

      {selectedTransfer && (
        <TransferEditModal
          transfer={selectedTransfer}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTransfer(null);
          }}
          onSave={handleSaveMetadata}
        />
      )}
    </Page>
  );
}
