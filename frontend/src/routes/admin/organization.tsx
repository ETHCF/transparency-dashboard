import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { Page, PageSection } from "@/components/layout/Page";
import { useUpdateOrganizationNameMutation, useUpdateTotalFundsRaisedMutation } from "@/services/settings";
import { useTreasuryQuery } from "@/services/treasury";
import { useUiStore } from "@/stores/ui";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  totalFundsRaised: z.coerce.number().min(0, "Total funds raised must be 0 or greater"),
});

type FormValues = z.infer<typeof schema>;

const OrganizationSettingsPage = () => {
  const treasuryQuery = useTreasuryQuery();
  const updateNameMutation = useUpdateOrganizationNameMutation();
  const updateFundsRaisedMutation = useUpdateTotalFundsRaisedMutation();
  const addToast = useUiStore((state) => state.addToast);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: treasuryQuery.data?.organizationName ?? "",
      totalFundsRaised: treasuryQuery.data?.totalFundsRaised ?? 0,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await Promise.all([
      updateNameMutation.mutateAsync({ name: values.name }),
      updateFundsRaisedMutation.mutateAsync({ amount: values.totalFundsRaised }),
    ]);
    addToast({ title: "Organization updated", variant: "success" });
  });

  if (treasuryQuery.isPending) {
    return <Loader label="Loading organization settings" />;
  }

  if (treasuryQuery.isError) {
    return (
      <ErrorState
        title="Unable to load organization data"
        description={treasuryQuery.error?.message}
      />
    );
  }

  const isSaving = updateNameMutation.isPending || updateFundsRaisedMutation.isPending;

  return (
    <Page>
      <PageSection title="Organization Profile">
        <form onSubmit={onSubmit} className="formStack">
          <FormField
            label="Organization Name"
            error={form.formState.errors.name?.message}
          >
            <Input
              {...form.register("name")}
              error={Boolean(form.formState.errors.name)}
            />
          </FormField>
          <FormField
            label="Total Funds Raised (USD)"
            error={form.formState.errors.totalFundsRaised?.message}
          >
            <Input
              {...form.register("totalFundsRaised")}
              type="number"
              step="0.01"
              error={Boolean(form.formState.errors.totalFundsRaised)}
            />
          </FormField>
          <button
            type="submit"
            className="btn btnPrimary"
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/admin/organization")({
  component: OrganizationSettingsPage,
});
