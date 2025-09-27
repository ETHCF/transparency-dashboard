import { createFileRoute } from "@tanstack/react-router";
import { useGrantsQuery } from "@/services/grants";
import { Page, PageHeader, PageSection } from "@/components/layout/Page";
import { DataTable } from "@/components/table/DataTable";
import { Loader } from "@/components/common/Loader";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { Link } from "@tanstack/react-router";
import { formatTokenAmount, formatDate } from "@/utils/format";
import type { Grant } from "@/types/domain";
import type { ColumnDef } from "@/components/table/DataTable";

const grantColumns: ColumnDef<Grant>[] = [
  {
    key: "name",
    header: "Grant Name",
    render: (grant) => (
      <Link to={`/grant/${grant.id}`} className="link-primary">
        {grant.name}
      </Link>
    )
  },
  { key: "recipientName", header: "Recipient" },
  {
    key: "totalGrantAmount",
    header: "Total Amount",
    render: (grant) => formatTokenAmount(grant.totalGrantAmount, "ETH"),
    align: "right",
  },
  {
    key: "amountGivenSoFar",
    header: "Disbursed",
    render: (grant) => formatTokenAmount(grant.amountGivenSoFar, "ETH"),
    align: "right",
  },
  {
    key: "startDate",
    header: "Start Date",
    render: (grant) => grant.startDate ? formatDate(grant.startDate) : "-",
  },
  {
    key: "status",
    header: "Status",
    render: (grant) => (
      <span className={`status-pill ${grant.status === 'active' ? 'status-success' : 'status-default'}`}>
        {grant.status}
      </span>
    ),
  },
];

const GrantsPage = () => {
  const { data: grants, isLoading, error } = useGrantsQuery({});

  if (isLoading) {
    return (
      <Page>
        <Loader label="Loading grants" />
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <ErrorState
          title="Unable to load grants"
          description={error.message || "An error occurred while loading grants"}
        />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Grants"
        description="Track and monitor all organizational grants and their progress"
      />
      <PageSection>
        {grants && grants.length > 0 ? (
          <DataTable
            columns={grantColumns}
            data={grants}
            keyExtractor={(grant) => grant.id}
          />
        ) : (
          <EmptyState
            title="No grants found"
            description="There are no grants to display at this time"
          />
        )}
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/grant/")({
  component: GrantsPage,
});