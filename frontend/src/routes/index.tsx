import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";

import { AddressLink } from "@/components/common/AddressLink";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { StatCard } from "@/components/common/StatCard";
import { StatusPill } from "@/components/common/StatusPill";
import { Page, PageGrid, PageSection } from "@/components/layout/Page";
import { DataTable } from "@/components/table/DataTable";
import { createTransferColumns } from "@/components/transfers/columns";
import { AssetAllocation } from "@/components/charts/AssetAllocation";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { BudgetTracker } from "@/components/budget/BudgetTracker";
import { useAuthStore } from "@/stores/auth";
import { useExpensesQuery } from "@/services/expenses";
import { useGrantsQuery } from "@/services/grants";
import { useTransfersQuery } from "@/services/transfers";
import { useTreasuryQuery } from "@/services/treasury";
import type { ColumnDef } from "@/components/table/DataTable";
import type { Grant, TransferRecord, TreasuryAsset } from "@/types/domain";
import { formatCurrency, formatDate, formatTokenAmount } from "@/utils/format";
import {
  generateMockTransfers,
  generateMockExpenses,
  generateMockGrants,
  generateMockAssets,
  generateHistoricalBalances,
  generateActivityFeed,
  getBurnRateExplanation
} from "@/utils/mockData";

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
  const [showBurnRateInfo, setShowBurnRateInfo] = useState(false);
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

  const treasuryQuery = useTreasuryQuery();
  const transfersQuery = useTransfersQuery({ limit: 5 });
  const expensesQuery = useExpensesQuery({ limit: 5 });
  const grantsQuery = useGrantsQuery({ limit: 5 });

  // Use mock data in dev mode if real data is empty
  const mockTransfers = useMemo(() => isDevMode ? generateMockTransfers(50) : [], [isDevMode]);
  const mockExpenses = useMemo(() => isDevMode ? generateMockExpenses(30) : [], [isDevMode]);
  const mockGrants = useMemo(() => isDevMode ? generateMockGrants(10) : [], [isDevMode]);
  const mockAssets = useMemo(() => isDevMode ? generateMockAssets() : [], [isDevMode]);
  const historicalData = useMemo(() => isDevMode ? generateHistoricalBalances(90) : [], [isDevMode]);
  const activityFeed = useMemo(() => isDevMode ? generateActivityFeed(15) : [], [isDevMode]);

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
  const hasAdminAccess = useAuthStore((state) => Boolean(state.token));

  // Use mock data in dev mode if real data is empty
  const treasuryAssets = (isDevMode && (!treasury.assets || treasury.assets.length === 0))
    ? mockAssets
    : (treasury.assets ?? []);

  const transfers = (isDevMode && (!transfersQuery.data || transfersQuery.data.length === 0))
    ? mockTransfers.slice(0, 5)
    : (transfersQuery.data ?? []);

  const expenses = (isDevMode && (!expensesQuery.data || expensesQuery.data.length === 0))
    ? mockExpenses.slice(0, 5)
    : (expensesQuery.data ?? []);

  const grants = (isDevMode && (!grantsQuery.data || grantsQuery.data.length === 0))
    ? mockGrants.slice(0, 5)
    : (grantsQuery.data ?? []);

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

  // Prepare data for charts
  const assetAllocationData = useMemo(() => {
    const assets = treasuryAssets;
    return assets.map(asset => ({
      name: asset.symbol || asset.name,
      value: asset.usdWorth || 0
    })).filter(asset => asset.value > 0);
  }, [treasuryAssets]);

  // Calculate cash flow data from transfers
  const cashFlowData = useMemo(() => {
    const transferData = isDevMode ? mockTransfers : transfersQuery.data;
    if (!transferData || transferData.length === 0) return [];

    const monthlyData = new Map<string, { inflow: number; outflow: number }>();

    transferData.forEach(transfer => {
      if (!transfer.blockTimestamp) return;
      const month = new Date(transfer.blockTimestamp).toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit'
      });

      if (!monthlyData.has(month)) {
        monthlyData.set(month, { inflow: 0, outflow: 0 });
      }

      const data = monthlyData.get(month)!;
      const amount = transfer.usdWorth || 0;

      if (isTreasuryWallet(transfer.toAddress)) {
        data.inflow += amount;
      } else if (isTreasuryWallet(transfer.fromAddress)) {
        data.outflow += amount;
      }
    });

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      inflow: data.inflow,
      outflow: data.outflow,
      net: data.inflow - data.outflow
    })).slice(-6); // Last 6 months
  }, [transfersQuery.data, isTreasuryWallet]);

  // Calculate burn rate and runway
  const burnRateMetrics = useMemo(() => {
    const expenseData = isDevMode ? mockExpenses : expensesQuery.data;
    if (!expenseData || expenseData.length === 0) {
      return { burnRate: 0, runway: 'N/A', details: 'No expense data available' };
    }

    // Calculate monthly burn rate from expenses
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentExpenses = expenseData.filter(expense =>
      new Date(expense.date) >= thirtyDaysAgo
    );

    const monthlyBurn = recentExpenses.reduce((sum, expense) =>
      sum + (expense.price || 0), 0
    );

    const totalValue = isDevMode
      ? treasuryAssets.reduce((sum, asset) => sum + (asset.usdWorth || 0), 0)
      : treasury.totalValueUsd;

    const runway = totalValue > 0 && monthlyBurn > 0
      ? Math.floor(totalValue / monthlyBurn)
      : 0;

    return {
      burnRate: monthlyBurn,
      runway: runway > 0 ? `${runway} months` : 'N/A',
      details: `Based on ${recentExpenses.length} expenses in last 30 days`
    };
  }, [expensesQuery.data, treasury.totalValueUsd, isDevMode, mockExpenses, treasuryAssets]);

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
          <div style={{ position: 'relative' }}>
            <StatCard
              label="Monthly Burn Rate"
              value={formatCurrency(burnRateMetrics.burnRate)}
              caption={burnRateMetrics.details}
            />
            <button
              onClick={() => setShowBurnRateInfo(!showBurnRateInfo)}
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                background: 'var(--md-sys-color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              ?
            </button>
          </div>
          <StatCard
            label="Runway"
            value={burnRateMetrics.runway}
            caption="Time until treasury depleted"
          />
        </PageGrid>
        {showBurnRateInfo && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'var(--md-sys-color-primary-container)',
            borderRadius: '8px',
            border: '1px solid var(--md-sys-color-primary)'
          }}>
            <h4 style={{ marginTop: 0 }}>📊 How Burn Rate & Runway are Calculated:</h4>
            <ul style={{ marginBottom: 0 }}>
              <li><strong>Burn Rate:</strong> Total expenses in the last 30 days</li>
              <li><strong>Runway:</strong> Total Treasury Value ÷ Monthly Burn Rate</li>
              <li><strong>Example:</strong> $1M treasury with $50k monthly burn = 20 months runway</li>
            </ul>
          </div>
        )}
      </PageSection>

      {/* Historical Balance Chart */}
      {isDevMode && historicalData.length > 0 && (
        <PageSection title="Treasury Balance History" description="90-day treasury value trend">
          <LineChart
            data={historicalData}
            dataKey="balance"
            xAxisKey="date"
            height={350}
            type="area"
            color="var(--md-sys-color-primary)"
          />
        </PageSection>
      )}

      {/* Asset Allocation Chart */}
      {assetAllocationData.length > 0 && (
        <PageSection title="Asset Allocation" description="Portfolio distribution by asset">
          <AssetAllocation
            data={assetAllocationData.map(a => ({
              name: a.name,
              value: a.value,
              symbol: a.name
            }))}
          />
        </PageSection>
      )}

      {/* Cash Flow Analysis */}
      {cashFlowData.length > 0 && (
        <PageSection title="Cash Flow Analysis" description="Monthly inflows vs outflows">
          <BarChart
            data={cashFlowData}
            xAxisKey="month"
            height={350}
            multiBar={[
              { dataKey: 'inflow', color: 'var(--md-sys-color-tertiary)', name: 'Inflow' },
              { dataKey: 'outflow', color: 'var(--md-sys-color-error)', name: 'Outflow' }
            ]}
          />
        </PageSection>
      )}

      {/* Budget Tracker - Only show to admins */}
      {hasAdminAccess && (
        <PageSection title="Budget Management" description="Track spending against budget allocations">
          <BudgetTracker
            showVariance={true}
            enableEdit={hasAdminAccess}
          />
        </PageSection>
      )}

      <PageSection title="Assets" description="Current treasury allocation">
        <DataTable
          columns={assetColumns}
          data={treasuryAssets}
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
            data={transfers}
            getRowId={(transfer) => transfer.txHash}
            emptyState={<EmptyState title="No transfers yet" />}
          />
        )}
      </PageSection>

      {/* Activity Feed */}
      {isDevMode && activityFeed.length > 0 && (
        <PageSection title="Recent Activity" description="Live feed of treasury activity">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activityFeed.slice(0, 10).map((activity) => (
              <div
                key={activity.id}
                style={{
                  padding: '0.75rem',
                  background: 'var(--md-sys-color-surface)',
                  borderRadius: '8px',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{activity.description}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
                <div style={{ fontWeight: 600, color: 'var(--md-sys-color-primary)' }}>
                  {formatCurrency(activity.amount)}
                </div>
              </div>
            ))}
          </div>
        </PageSection>
      )}

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
            data={expenses}
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
            data={grants}
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
