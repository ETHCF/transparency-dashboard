import { Link, createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { Page, PageSection } from "@/components/layout/Page";
import { DataTable } from "@/components/table/DataTable";
import {
  useGrantDisbursementsQuery,
  useGrantFundsUsageQuery,
  useGrantMilestonesQuery,
  useGrantQuery,
  useUpdateGrantMutation,
} from "@/services/grants";
import { useUiStore } from "@/stores/ui";
import type { ColumnDef } from "@/components/table/DataTable";
import type { GrantDisbursement, GrantMilestone, Expense } from "@/types/domain";
import { formatCurrency, formatDate, formatDateTime, formatTokenAmount } from "@/utils/format";
import { StatusPill } from "@/components/common/StatusPill";

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

const GrantEditPage = () => {
  const { grantId } = Route.useParams();
  const grantQuery = useGrantQuery(grantId);
  const milestonesQuery = useGrantMilestonesQuery(grantId);
  const disbursementsQuery = useGrantDisbursementsQuery(grantId);
  const fundsUsageQuery = useGrantFundsUsageQuery(grantId);
  const updateMutation = useUpdateGrantMutation(grantId);
  const addToast = useUiStore((state) => state.addToast);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!grantQuery.data) {
      return;
    }

    const grant = grantQuery.data;
    form.reset({
      name: grant.name,
      recipientName: grant.recipientName,
      recipientAddress: grant.recipientAddress,
      description: grant.description,
      status: grant.status,
      totalGrantAmount: grant.totalGrantAmount.toString(),
      initialGrantAmount: grant.initialGrantAmount.toString(),
      startDate: grant.startDate.toISOString().slice(0, 10),
      expectedCompletionDate: grant.expectedCompletionDate
        .toISOString()
        .slice(0, 10),
      teamUrl: grant.teamUrl ?? "",
      projectUrl: grant.projectUrl ?? "",
    });
  }, [grantQuery.data, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const grant = grantQuery.data;
    if (!grant) {
      return;
    }

    await updateMutation.mutateAsync({
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
      milestones: grant.milestones.map((milestone) => ({
        name: milestone.name,
        description: milestone.description ?? "",
        grantAmount: milestone.grantAmount.toString(),
        completed: milestone.completed,
        signedOff: milestone.signedOff,
      })),
    });

    addToast({ title: "Grant updated", variant: "success" });
  });

  const milestoneColumns: ColumnDef<GrantMilestone>[] = [
    { key: "name", header: "Milestone" },
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
      render: (disbursement) => <code>{disbursement.txHash}</code>,
    },
    {
      key: "blockNumber",
      header: "Block",
      render: (disbursement) => disbursement.blockNumber ?? "—",
      align: "right",
    },
    {
      key: "createdAt",
      header: "Created",
      render: (disbursement) =>
        disbursement.createdAt ? formatDateTime(disbursement.createdAt) : "—",
    },
  ];

  const fundsUsageColumns: ColumnDef<Expense>[] = [
    { key: "item", header: "Item" },
    { key: "category", header: "Category" },
    {
      key: "date",
      header: "Date",
      render: (usage) => formatDate(usage.date),
    },
    {
      key: "total",
      header: "Total",
      render: (usage) => formatCurrency(usage.price * usage.quantity),
      align: "right",
    },
  ];

  const manageMilestonesPath = `/admin/grants/${grantId}/milestones`;
  const manageDisbursementsPath = `/admin/grants/${grantId}/disbursements`;
  const manageFundsUsagePath = `/admin/grants/${grantId}/funds-usage`;

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

  return (
    <Page>
      <PageSection
        title="Edit Grant"
        description="Update the grant details, then save your changes."
      >
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
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              type="submit"
              className="btn btnPrimary"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </button>
            <Link to="/admin/grants" className="btn btnGhost">
              Cancel
            </Link>
          </div>
        </form>
      </PageSection>

      <PageSection title="Milestones">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <span style={{ opacity: 0.8 }}>Track milestone progress for this grant.</span>
          <Link
            to={manageMilestonesPath}
            className="btn btnPrimary"
          >
            Manage milestones
          </Link>
        </div>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <span style={{ opacity: 0.8 }}>Recorded transfers made to this grant.</span>
          <Link
            to={manageDisbursementsPath}
            className="btn btnPrimary"
          >
            Manage disbursements
          </Link>
        </div>
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
            getRowId={(disbursement, index) => disbursement.id ?? `${disbursement.txHash}-${index}`}
          />
        )}
      </PageSection>

      <PageSection title="Funds usage">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <span style={{ opacity: 0.8 }}>Expenses attributed to this grant.</span>
          <Link
            to={manageFundsUsagePath}
            className="btn btnPrimary"
          >
            Manage funds usage
          </Link>
        </div>
        {fundsUsageQuery.isPending ? (
          <Loader label="Loading funds usage" />
        ) : fundsUsageQuery.isError ? (
          <ErrorState
            title="Unable to load funds usage"
            description={fundsUsageQuery.error?.message}
          />
        ) : (fundsUsageQuery.data?.length ?? 0) === 0 ? (
          <EmptyState title="No expenses linked" />
        ) : (
          <DataTable
            columns={fundsUsageColumns}
            data={fundsUsageQuery.data ?? []}
            getRowId={(usage) => usage.id}
          />
        )}
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/admin/grants/$grantId/")({
  component: GrantEditPage,
});
