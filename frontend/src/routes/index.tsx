import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

import { AddressLink } from "@/components/common/AddressLink";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { StatCard } from "@/components/common/StatCard";
import { StatusPill } from "@/components/common/StatusPill";
import { Page, PageGrid, PageSection } from "@/components/layout/Page";
import { DataTable } from "@/components/table/DataTable";
import { createTransferColumns } from "@/components/transfers/columns";
import { useExpensesQuery } from "@/services/expenses";
import { useGrantsQuery } from "@/services/grants";
import { useTransfersQuery } from "@/services/transfers";
import { useTreasuryQuery } from "@/services/treasury";
import type { ColumnDef } from "@/components/table/DataTable";
import type { Grant, TransferRecord, TreasuryAsset } from "@/types/domain";
import { formatCurrency, formatDate, formatTokenAmount } from "@/utils/format";

const assetColumns: ColumnDef<TreasuryAsset>[] = [
  { key: "name", header: "Asset" },
  {
    key: "amount",
    header: "Amount",
    render: (asset) =>
      formatTokenAmount(asset.amount, asset.symbol ?? asset.name),
    align: "right",
  },
  {
    key: "usdWorth",
    header: "USD Value",
    render: (asset) => formatCurrency(asset.usdWorth),
    align: "right",
  },
];

const grantColumns: ColumnDef<Grant>[] = [
  { key: "name", header: "Grant", render: (grant) => grant.name },
  { key: "recipientName", header: "Recipient" },
  {
    key: "amountGivenSoFar",
    header: "Disbursed",
    render: (grant) => formatTokenAmount(grant.amountGivenSoFar, "ETH"),
    align: "right",
  },
  {
    key: "status",
    header: "Status",
    render: (grant) => (
      <StatusPill
        status={grant.status}
        variant={grant.status.includes("completed") ? "success" : "info"}
      />
    ),
  },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const treasuryQuery = useTreasuryQuery();
  const transfersQuery = useTransfersQuery({ limit: 5 });
  const expensesQuery = useExpensesQuery({ limit: 5 });
  const grantsQuery = useGrantsQuery({ limit: 5 });

  if (treasuryQuery.isPending) {
    return <Loader label="Loading dashboard" />;
  }

  if (treasuryQuery.isError || !treasuryQuery.data) {
    return (
      <ErrorState
        title="Unable to load treasury data"
        description={treasuryQuery.error?.message ?? "Unknown error"}
      />
    );
  }

  const treasury = treasuryQuery.data;
  const treasuryAssets = treasury.assets ?? [];
  const treasuryWalletAddresses = useMemo(() => {
    const addresses = new Set<string>();
    (treasury.wallets ?? []).forEach((wallet) => {
      if (wallet.address) {
        addresses.add(wallet.address.toLowerCase());
      }
    });
    return addresses;
  }, [treasury.wallets]);

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

  const isTreasuryWallet = useCallback(
    (address?: string | null) => {
      if (!address) {
        return false;
      }
      return treasuryWalletAddresses.has(address.toLowerCase());
    },
    [treasuryWalletAddresses],
  );

  const transferColumns = useMemo(
    () => createTransferColumns(isTreasuryWallet, getAssetDecimals),
    [getAssetDecimals, isTreasuryWallet],
  );

  return (
    <Page>
      <PageSection
        title="Treasury Overview"
        description={
          treasury.lastUpdated
            ? `Last updated ${formatDate(treasury.lastUpdated)}`
            : undefined
        }
      >
        <PageGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
          <StatCard
            label="Total Value (USD)"
            value={formatCurrency(treasury.totalValueUsd)}
          />
          <StatCard
            label="Total Value (ETH)"
            value={`${treasury.totalValueEth?.toLocaleString?.() ?? "0"} ETH`}
          />
          <StatCard label="Wallets" value={treasury.wallets?.length ?? 0} />
        </PageGrid>
      </PageSection>

      <PageSection title="Assets" description="Current treasury allocation">
        <DataTable
          columns={assetColumns}
          data={treasury.assets ?? []}
          getRowId={(asset) => asset.address ?? asset.name}
          emptyState={
            <EmptyState
              title="No assets"
              description="Add wallets to begin tracking assets."
            />
          }
        />
      </PageSection>

      <PageSection title="Wallets">
        <PageGrid columns="repeat(auto-fit, minmax(260px, 1fr))">
          {(treasury.wallets ?? []).map((wallet) => (
            <StatCard
              key={wallet.address}
              label="Wallet"
              value={
                <AddressLink address={wallet.address} label={wallet.address} />
              }
              caption={
                <a href={wallet.etherscanUrl} target="_blank" rel="noreferrer">
                  View on Etherscan
                </a>
              }
            />
          ))}
        </PageGrid>
      </PageSection>

      <PageSection
        title="Recent Transfers"
        description="Latest on-chain activity"
        actions={
          <Link to="/transfers" className="btn btnGhost">
            View all
          </Link>
        }
      >
        {transfersQuery.isPending ? (
          <Loader />
        ) : transfersQuery.isError ? (
          <ErrorState
            title="Failed to load transfers"
            description={transfersQuery.error?.message}
          />
        ) : (
          <DataTable
            columns={transferColumns}
            data={transfersQuery.data ?? []}
            getRowId={(transfer) => transfer.txHash}
            emptyState={<EmptyState title="No transfers yet" />}
          />
        )}
      </PageSection>

      <PageSection title="Recent Expenses">
        {expensesQuery.isPending ? (
          <Loader />
        ) : expensesQuery.isError ? (
          <ErrorState
            title="Failed to load expenses"
            description={expensesQuery.error?.message}
          />
        ) : (
          <DataTable
            columns={[
              { key: "item", header: "Item" },
              { key: "category", header: "Category" },
              {
                key: "date",
                header: "Date",
                render: (expense) => formatDate(expense.date),
              },
              {
                key: "price",
                header: "Price",
                render: (expense) => formatCurrency(expense.price),
                align: "right",
              },
            ]}
            data={expensesQuery.data ?? []}
            getRowId={(expense) => expense.id}
            emptyState={<EmptyState title="No expenses recorded" />}
          />
        )}
      </PageSection>

      <PageSection title="Grants">
        {grantsQuery.isPending ? (
          <Loader />
        ) : grantsQuery.isError ? (
          <ErrorState
            title="Failed to load grants"
            description={grantsQuery.error?.message}
          />
        ) : (
          <DataTable
            columns={grantColumns}
            data={grantsQuery.data ?? []}
            getRowId={(grant) => grant.id}
            onRowClick={(grant) =>
              navigate({
                to: "/grant/$grantId",
                params: { grantId: grant.id },
              })
            }
            emptyState={
              <EmptyState
                title="No grants found"
                description="Create your first grant from the admin portal."
              />
            }
          />
        )}
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/")({
  component: DashboardPage,
});
