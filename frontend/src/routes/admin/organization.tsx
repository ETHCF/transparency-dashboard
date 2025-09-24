import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { Page, PageSection } from "@/components/layout/Page";
import { useUpdateOrganizationNameMutation } from "@/services/settings";
import { useTreasuryQuery } from "@/services/treasury";
import { useUiStore } from "@/stores/ui";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
});

type FormValues = z.infer<typeof schema>;

const OrganizationSettingsPage = () => {
  const treasuryQuery = useTreasuryQuery();
  const updateMutation = useUpdateOrganizationNameMutation();
  const addToast = useUiStore((state) => state.addToast);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: treasuryQuery.data?.organizationName ?? "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await updateMutation.mutateAsync({ name: values.name });
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
          <button
            type="submit"
            className="btn btnPrimary"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/admin/organization")({
  component: OrganizationSettingsPage,
});
