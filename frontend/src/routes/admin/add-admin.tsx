import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { Page, PageSection } from "@/components/layout/Page";
import { useAddAdminMutation } from "@/services/admin";
import { useUiStore } from "@/stores/ui";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/u, "Invalid Ethereum address"),
});

type FormValues = z.infer<typeof schema>;

const AddAdminPage = (): JSX.Element => {
  const addAdminMutation = useAddAdminMutation();
  const addToast = useUiStore((state) => state.addToast);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await addAdminMutation.mutateAsync(values);
      addToast({ title: "Admin added", variant: "success" });
      form.reset();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add admin";
      addToast({ title: "Failed to add admin", description: message, variant: "error" });
    }
  });

  return (
    <Page>
      <PageSection
        title="Add Admin"
        description="Grant dashboard access to a new administrator"
        actions={
          <Link to="/admin/admins" className="btn btnGhost">
            View admins
          </Link>
        }
      >
        <form onSubmit={onSubmit}>
          <FormField
            label="Name"
            error={form.formState.errors.name?.message}
          >
            <Input
              {...form.register("name")}
              placeholder="Jane Doe"
              error={Boolean(form.formState.errors.name)}
            />
          </FormField>

          <FormField
            label="Address"
            error={form.formState.errors.address?.message}
            hint="Ethereum address of the admin wallet"
          >
            <Input
              {...form.register("address")}
              placeholder="0x..."
              error={Boolean(form.formState.errors.address)}
            />
          </FormField>

          <button
            type="submit"
            className="btn btnPrimary"
            disabled={addAdminMutation.isPending}
          >
            {addAdminMutation.isPending ? "Saving…" : "Add Admin"}
          </button>
        </form>
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/admin/add-admin")({
  component: AddAdminPage,
});
