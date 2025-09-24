import { Link, createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { Page, PageSection } from "@/components/layout/Page";
import { DataTable } from "@/components/table/DataTable";
import { useCreateGrantMutation, useGrantsQuery } from "@/services/grants";
import { useUiStore } from "@/stores/ui";
import { formatDate, formatTokenAmount } from "@/utils/format";

const schema = z.object({
  name: z.string().min(2),
  recipientName: z.string().min(2),
  recipientAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/u, "Invalid address"),
  description: z.string().min(6),
  status: z.string().min(2),
  totalGrantAmount: z.coerce.string(),
  initialGrantAmount: z.coerce.string(),
  startDate: z.string().min(4),
  expectedCompletionDate: z.string().min(4),
  teamUrl: z.string().optional().or(z.literal("")),
  projectUrl: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

const GrantsAdminPage = () => {
  const grantsQuery = useGrantsQuery();
  const createMutation = useCreateGrantMutation();
  const addToast = useUiStore((state) => state.addToast);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = form.handleSubmit(async (values) => {
    await createMutation.mutateAsync({
      name: values.name,
      recipientName: values.recipientName,
      recipientAddress: values.recipientAddress,
      description: values.description,
      status: values.status,
      totalGrantAmount: values.totalGrantAmount,
      initialGrantAmount: values.initialGrantAmount,
      startDate: values.startDate,
      expectedCompletionDate: values.expectedCompletionDate,
      teamUrl: values.teamUrl || undefined,
      projectUrl: values.projectUrl || undefined,
      milestones: [],
    });
    form.reset();
    addToast({ title: "Grant created", variant: "success" });
  });

  if (grantsQuery.isPending) {
    return <Loader label="Loading grants" />;
  }

  if (grantsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load grants"
        description={grantsQuery.error?.message}
      />
    );
  }

  const grants = grantsQuery.data ?? [];

  return (
    <Page>
      <PageSection title="Create Grant">
        <form onSubmit={onSubmit}>
          <FormField label="Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} />
          </FormField>
          <FormField
            label="Recipient Name"
            error={form.formState.errors.recipientName?.message}
          >
            <Input {...form.register("recipientName")} />
          </FormField>
          <FormField
            label="Recipient Address"
            error={form.formState.errors.recipientAddress?.message}
          >
            <Input {...form.register("recipientAddress")} />
          </FormField>
          <FormField
            label="Description"
            error={form.formState.errors.description?.message}
          >
            <Input {...form.register("description")} />
          </FormField>
          <FormField
            label="Status"
            error={form.formState.errors.status?.message}
          >
            <Input {...form.register("status")} />
          </FormField>
          <FormField
            label="Total Amount (ETH)"
            error={form.formState.errors.totalGrantAmount?.message}
          >
            <Input
              type="number"
              step="0.01"
              {...form.register("totalGrantAmount")}
            />
          </FormField>
          <FormField
            label="Initial Amount (ETH)"
            error={form.formState.errors.initialGrantAmount?.message}
          >
            <Input
              type="number"
              step="0.01"
              {...form.register("initialGrantAmount")}
            />
          </FormField>
          <FormField
            label="Start Date"
            error={form.formState.errors.startDate?.message}
          >
            <Input type="date" {...form.register("startDate")} />
          </FormField>
          <FormField
            label="Expected Completion"
            error={form.formState.errors.expectedCompletionDate?.message}
          >
            <Input type="date" {...form.register("expectedCompletionDate")} />
          </FormField>
          <FormField label="Team URL" optional>
            <Input {...form.register("teamUrl")} />
          </FormField>
          <FormField label="Project URL" optional>
            <Input {...form.register("projectUrl")} />
          </FormField>
          <div style={{ marginTop: "1rem" }}>
            <button
              type="submit"
              className="btn btnPrimary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Saving…" : "Create Grant"}
            </button>
          </div>
        </form>
      </PageSection>

      <PageSection title="Grants">
        {grants.length === 0 ? (
          <EmptyState title="No grants available" />
        ) : (
          <DataTable
            columns={[
              { key: "name", header: "Name", render: (grant) => grant.name },
              { key: "recipientName", header: "Recipient" },
              {
                key: "amountGivenSoFar",
                header: "Disbursed",
                render: (grant) =>
                  formatTokenAmount(grant.amountGivenSoFar, "ETH"),
                align: "right",
              },
              {
                key: "expectedCompletionDate",
                header: "Expected",
                render: (grant) => formatDate(grant.expectedCompletionDate),
              },
              {
                key: "actions",
                header: "Actions",
                render: (grant) => (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Link
                      to="/admin/grants/$grantId"
                      params={{ grantId: grant.id }}
                      className="btn btnPrimary"
                    >
                      Edit
                    </Link>
                    <Link to="/grant/$grantId" params={{ grantId: grant.id }}>
                      View
                    </Link>
                  </div>
                ),
              },
            ]}
            data={grants}
            getRowId={(grant) => grant.id}
          />
        )}
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/admin/grants/")({
  component: GrantsAdminPage,
});
