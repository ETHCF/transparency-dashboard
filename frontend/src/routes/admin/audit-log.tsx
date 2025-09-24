import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { Page, PageSection } from "@/components/layout/Page";
import { DataTable } from "@/components/table/DataTable";
import { useAuditLogQuery } from "@/services/audit-log";
import { formatDate } from "@/utils/format";

const AuditLogPage = () => {
  const [address, setAddress] = useState("");
  const [action, setAction] = useState("");
  const auditLogQuery = useAuditLogQuery({
    adminAddress: address || undefined,
    action: action || undefined,
  });

  return (
    <Page>
      <PageSection title="Filters">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            auditLogQuery.refetch();
          }}
        >
          <FormField label="Admin Address" optional>
            <Input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="0x..."
            />
          </FormField>
          <FormField label="Action" optional>
            <Input
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="create_grant"
            />
          </FormField>
          <button type="submit">Apply Filters</button>
        </form>
      </PageSection>

      <PageSection title="Audit Log">
        {auditLogQuery.isPending ? (
          <Loader />
        ) : auditLogQuery.isError ? (
          <ErrorState
            title="Failed to load audit log"
            description={auditLogQuery.error?.message}
          />
        ) : auditLogQuery.data?.length === 0 ? (
          <EmptyState title="No audit events match the filters" />
        ) : (
          <DataTable
            columns={[
              { key: "adminName", header: "Admin" },
              { key: "adminAddress", header: "Address" },
              { key: "action", header: "Action" },
              { key: "resourceType", header: "Resource" },
              {
                key: "timestamp",
                header: "Timestamp",
                render: (entry) => formatDate(entry.timestamp),
              },
            ]}
            data={auditLogQuery.data ?? []}
            getRowId={(entry) => entry.id}
          />
        )}
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/admin/audit-log")({
  component: AuditLogPage,
});
