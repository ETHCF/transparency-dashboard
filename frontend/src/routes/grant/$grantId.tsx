import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { StatusPill } from "@/components/common/StatusPill";
import { Page, PageGrid, PageSection } from "@/components/layout/Page";
import { DataTable } from "@/components/table/DataTable";
import {
  useGrantDisbursementsQuery,
  useGrantMilestonesQuery,
  useGrantQuery,
  useGrantFundsUsageQuery,
} from "@/services/grants";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTokenAmount,
} from "@/utils/format";
import { AddressLink } from "@/components/common/AddressLink";
import type { ColumnDef } from "@/components/table/DataTable";
import type { Expense, GrantDisbursement, GrantMilestone } from "@/types/domain";

const getMilestoneStatusDisplay = (milestone: GrantMilestone) => {
  const normalizedStatus =
    milestone.status && milestone.status.trim() !== ""
      ? milestone.status
      : milestone.completed
        ? "completed"
        : "pending";

  switch (normalizedStatus) {
    case "signed_off":
      return { label: "Signed off", variant: "success" as const };
    case "completed":
      return { label: "Completed", variant: "success" as const };
    default:
      return { label: "Pending", variant: "info" as const };
  }
};

const milestoneColumns: ColumnDef<GrantMilestone>[] = [
  {
    key: "name",
    header: "Milestone",
    render: (milestone) => (
      <div>
        <strong>{milestone.name}</strong>
        {milestone.description ? (
          <div>{milestone.description}</div>
        ) : null}
      </div>
    ),
  },
  {
    key: "grantAmount",
    header: "Amount",
    render: (milestone) => formatTokenAmount(milestone.grantAmount, "ETH"),
    align: "right",
  },
  {
    key: "status",
    header: "Status",
    render: (milestone) => {
      const { label, variant } = getMilestoneStatusDisplay(milestone);
      return <StatusPill status={label} variant={variant} />;
    },
    align: "center",
  },
  {
    key: "signedOff",
    header: "Sign-off",
    render: (milestone) => (
      <StatusPill
        status={milestone.signedOff ? "Signed" : "Pending"}
        variant={milestone.signedOff ? "success" : "warning"}
      />
    ),
    align: "center",
  },
];

const disbursementColumns: ColumnDef<GrantDisbursement>[] = [
  {
    key: "amount",
    header: "Amount",
    render: (disbursement) => formatTokenAmount(disbursement.amount, "ETH"),
    align: "right",
  },
  {
    key: "txHash",
    header: "Transaction",
    render: (disbursement) =>
      disbursement.txHash ? (
        <a
          href={`https://etherscan.io/tx/${disbursement.txHash}`}
          target="_blank"
          rel="noreferrer"
        >
          <code>{`${disbursement.txHash.slice(0, 10)}…`}</code>
        </a>
      ) : (
        "—"
      ),
  },
  {
    key: "createdAt",
    header: "Date",
    render: (disbursement) =>
      disbursement.createdAt ? formatDateTime(disbursement.createdAt) : "—",
  },
];

const expenseColumns: ColumnDef<Expense>[] = [
  {
    key: "item",
    header: "Item",
    render: (expense) => (
      <div>
        <strong>{expense.item}</strong>
        <div>{expense.purpose || "—"}</div>
      </div>
    ),
  },
  {
    key: "category",
    header: "Category",
    render: (expense) => expense.category ?? "—",
  },
  {
    key: "quantity",
    header: "Qty",
    align: "right",
  },
  {
    key: "total",
    header: "Total",
    render: (expense) => formatCurrency(expense.price * expense.quantity),
    align: "right",
  },
];

const GrantDetailPage = () => {
  const { grantId } = Route.useParams();
  const grantQuery = useGrantQuery(grantId);
  const milestonesQuery = useGrantMilestonesQuery(grantId);
  const disbursementsQuery = useGrantDisbursementsQuery(grantId);
  const fundsUsageQuery = useGrantFundsUsageQuery(grantId);

  if (grantQuery.isPending) {
    return <Loader label="Loading grant" />;
  }

  if (grantQuery.isError || !grantQuery.data) {
    return (
      <ErrorState
        title="Unable to load grant"
        description={grantQuery.error?.message}
      />
    );
  }

  const grant = grantQuery.data;

  return (
    <Page>
      <PageSection title={grant.name} description={grant.description}>
        <PageGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
          <div>
            <strong>Recipient</strong>
            <p>{grant.recipientName}</p>
            <AddressLink address={grant.recipientAddress} />
          </div>
          <div>
            <strong>Total Grant</strong>
            <p>{formatTokenAmount(grant.totalGrantAmount, "ETH")}</p>
          </div>
          <div>
            <strong>Disbursed</strong>
            <p>{formatTokenAmount(grant.amountGivenSoFar, "ETH")}</p>
          </div>
          <div>
            <strong>Timeline</strong>
            <p>
              {formatDate(grant.startDate)} –{" "}
              {formatDate(grant.expectedCompletionDate)}
            </p>
          </div>
        </PageGrid>
        {grant.teamUrl ? (
          <p>
            Team:{" "}
            <a href={grant.teamUrl} target="_blank" rel="noreferrer">
              {grant.teamUrl}
            </a>
          </p>
        ) : null}
        {grant.projectUrl ? (
          <p>
            Project:{" "}
            <a href={grant.projectUrl} target="_blank" rel="noreferrer">
              {grant.projectUrl}
            </a>
          </p>
        ) : null}
      </PageSection>

      <PageSection title="Milestones">
        {milestonesQuery.isPending ? (
          <Loader label="Loading milestones" />
        ) : milestonesQuery.isError ? (
          <ErrorState
            title="Unable to load milestones"
            description={milestonesQuery.error?.message}
          />
        ) : (milestonesQuery.data?.length ?? 0) === 0 ? (
          <EmptyState title="No milestones defined" />
        ) : (
          <DataTable
            columns={milestoneColumns}
            data={milestonesQuery.data ?? []}
            getRowId={(milestone) => milestone.id}
          />
        )}
      </PageSection>

      <PageSection title="Disbursements">
        {disbursementsQuery.isPending ? (
          <Loader label="Loading disbursements" />
        ) : disbursementsQuery.isError ? (
          <ErrorState
            title="Unable to load disbursements"
            description={disbursementsQuery.error?.message}
          />
        ) : (disbursementsQuery.data?.length ?? 0) === 0 ? (
          <EmptyState title="No disbursements yet" />
        ) : (
          <DataTable
            columns={disbursementColumns}
            data={disbursementsQuery.data ?? []}
            getRowId={(disbursement, index) =>
              disbursement.txHash ? disbursement.txHash : `disbursement-${index}`
            }
          />
        )}
      </PageSection>

      <PageSection title="Expenses">
        {fundsUsageQuery.isPending ? (
          <Loader label="Loading expenses" />
        ) : fundsUsageQuery.isError ? (
          <ErrorState
            title="Unable to load expenses"
            description={fundsUsageQuery.error?.message}
          />
        ) : (fundsUsageQuery.data?.length ?? 0) === 0 ? (
          <EmptyState title="No linked expenses" />
        ) : (
          <DataTable
            columns={expenseColumns}
            data={fundsUsageQuery.data ?? []}
            getRowId={(expense) => expense.id}
          />
        )}
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/grant/$grantId")({
  component: GrantDetailPage,
});
