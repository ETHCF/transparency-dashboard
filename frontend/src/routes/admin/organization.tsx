import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { SelectField } from "@/components/forms/Select";
import { Page, PageSection } from "@/components/layout/Page";
import { useUpdateOrganizationNameMutation, useUpdateTotalFundsRaisedMutation, useUpdateTotalFundsRaisedUnitMutation } from "@/services/settings";
import { useTreasuryQuery } from "@/services/treasury";
import { useUiStore } from "@/stores/ui";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  totalFundsRaised: z.coerce.number().min(0, "Total funds raised must be 0 or greater"),
  totalFundsRaisedUnit: z.enum(["ETH", "USD"]),
});

type FormValues = z.infer<typeof schema>;

const OrganizationSettingsPage = () => {
  const treasuryQuery = useTreasuryQuery();
  const updateNameMutation = useUpdateOrganizationNameMutation();
  const updateFundsRaisedMutation = useUpdateTotalFundsRaisedMutation();
  const updateFundsRaisedUnitMutation = useUpdateTotalFundsRaisedUnitMutation();
  const addToast = useUiStore((state) => state.addToast);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: treasuryQuery.data?.organizationName ?? "",
      totalFundsRaised: treasuryQuery.data?.totalFundsRaised ?? 0,
      totalFundsRaisedUnit: (treasuryQuery.data?.totalFundsRaisedUnit ?? "USD") as "ETH" | "USD",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await Promise.all([
      updateNameMutation.mutateAsync({ name: values.name }),
      updateFundsRaisedMutation.mutateAsync({ amount: values.totalFundsRaised }),
      updateFundsRaisedUnitMutation.mutateAsync({ unit: values.totalFundsRaisedUnit }),
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

  const isSaving = updateNameMutation.isPending || updateFundsRaisedMutation.isPending || updateFundsRaisedUnitMutation.isPending;
  const selectedUnit = form.watch("totalFundsRaisedUnit");

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
            label="Total Funds Raised Unit"
            error={form.formState.errors.totalFundsRaisedUnit?.message}
          >
            <Controller
              name="totalFundsRaisedUnit"
              control={form.control}
              render={({ field }) => (
                <SelectField
                  {...field}
                  placeholder="Select currency unit"
                  options={[
                    { label: "USD", value: "USD" },
                    { label: "ETH", value: "ETH" },
                  ]}
                  error={Boolean(form.formState.errors.totalFundsRaisedUnit)}
                />
              )}
            />
          </FormField>
          <FormField
            label={`Total Funds Raised (${selectedUnit})`}
            error={form.formState.errors.totalFundsRaised?.message}
          >
            <Input
              {...form.register("totalFundsRaised")}
              type="number"
              step={selectedUnit === "ETH" ? "0.1" : "0.01"}
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
