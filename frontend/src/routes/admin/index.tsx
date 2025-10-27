import { Link, createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { StatCard } from "@/components/common/StatCard";
import { Page, PageGrid, PageSection } from "@/components/layout/Page";
import { DataTable } from "@/components/table/DataTable";
import { useExpensesQuery } from "@/services/expenses";
import { useGrantsQuery } from "@/services/grants";
import { useTransfersQuery } from "@/services/transfers";
import { useTreasuryQuery } from "@/services/treasury";
import { formatCurrency, formatDate, formatTokenAmount } from "@/utils/format";
import styles from "./index.module.css";

const AdminDashboard = () => {
  const treasuryQuery = useTreasuryQuery();
  const transfersQuery = useTransfersQuery({ limit: 10 });
  const expensesQuery = useExpensesQuery({ limit: 10 });
  const grantsQuery = useGrantsQuery({ limit: 10 });

  if (treasuryQuery.isPending) {
    return <Loader label="Loading admin overview" />;
  }

  if (treasuryQuery.isError || !treasuryQuery.data) {
    return (
      <ErrorState
        title="Unable to load treasury data"
        description={treasuryQuery.error?.message}
      />
    );
  }

  const treasury = treasuryQuery.data;

  return (
    <Page>
      <PageSection
        title="Quick Actions"
        description="Jump straight into the most common admin tasks."
      >
        <div className={styles.actionGrid}>
          <Link to="/admin/expenses" className={styles.actionCard}>
            <span className={styles.actionTitle}>Log an expense</span>
            <p className={styles.actionDescription}>
              Capture a new transaction with item, cost, and supporting details.
            </p>
            <span className={styles.actionLink}>Add expense</span>
          </Link>

          <Link to="/admin/grants" className={styles.actionCard}>
            <span className={styles.actionTitle}>Create a grant</span>
            <p className={styles.actionDescription}>
              Record a new grant agreement, recipient, and funding timeline.
            </p>
            <span className={styles.actionLink}>Launch grant form</span>
          </Link>

          <Link to="/admin/wallets" className={styles.actionCard}>
            <span className={styles.actionTitle}>Add a wallet</span>
            <p className={styles.actionDescription}>
              Register an on-chain address to include in treasury reporting.
            </p>
            <span className={styles.actionLink}>Register wallet</span>
          </Link>

          <Link to="/admin/transfers" className={styles.actionCard}>
            <span className={styles.actionTitle}>Name a transfer party</span>
            <p className={styles.actionDescription}>
              Give a friendly label to payer or payee addresses used in transfers.
            </p>
            <span className={styles.actionLink}>Add transfer party</span>
          </Link>
        </div>
      </PageSection>

      <PageSection
        title="Key Metrics"
        description="Snapshot of current treasury performance"
      >
        <PageGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
          <StatCard
            label="Total Funds Raised"
            value={
              treasury.totalFundsRaisedUnit === "ETH"
                ? `${treasury.totalFundsRaised.toFixed(1)} ETH`
                : formatCurrency(treasury.totalFundsRaised)
            }
          />
          <StatCard
            label="Total USD"
            value={formatCurrency(treasury.totalValueUsd)}
          />
          <StatCard
            label="Total ETH"
            value={`${treasury.totalValueEth.toLocaleString()} ETH`}
          />
          <StatCard
            label="Active Grants"
            value={grantsQuery.data?.length ?? 0}
          />
          <StatCard
            label="Expenses Logged"
            value={expensesQuery.data?.length ?? 0}
          />
        </PageGrid>
      </PageSection>

      <PageSection title="Latest Transfers">
        {transfersQuery.isPending ? (
          <Loader />
        ) : transfersQuery.isError ? (
          <ErrorState
            title="Failed to load transfers"
            description={transfersQuery.error?.message}
          />
        ) : (
          <DataTable
            columns={[
              {
                key: "txHash",
                header: "Tx Hash",
                render: (transfer) => `${transfer.txHash.slice(0, 12)}…`,
              },
              { key: "direction", header: "Type" },
              {
                key: "timestamp",
                header: "Date",
                render: (transfer) => formatDate(transfer.timestamp),
              },
              {
                key: "amount",
                header: "Amount",
                render: (transfer) =>
                  formatTokenAmount(
                    transfer.amount,
                    transfer.assetSymbol ?? transfer.asset,
                  ),
                align: "right",
              },
            ]}
            data={transfersQuery.data ?? []}
            getRowId={(transfer) => transfer.txHash}
            emptyState={<EmptyState title="No transfers logged" />}
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
            emptyState={<EmptyState title="No expenses" />}
          />
        )}
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});
