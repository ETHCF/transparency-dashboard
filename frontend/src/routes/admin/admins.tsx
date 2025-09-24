import { createFileRoute } from "@tanstack/react-router";
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
import {
  useAddAdminMutation,
  useAdminsQuery,
  useRemoveAdminMutation,
} from "@/services/admin";
import { useUiStore } from "@/stores/ui";

const schema = z.object({
  name: z.string().min(2),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/u, "Invalid address"),
});

type FormValues = z.infer<typeof schema>;

const AdminsPage = () => {
  const adminsQuery = useAdminsQuery();
  const addMutation = useAddAdminMutation();
  const removeMutation = useRemoveAdminMutation();
  const addToast = useUiStore((state) => state.addToast);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = form.handleSubmit(async (values) => {
    await addMutation.mutateAsync(values);
    form.reset();
    addToast({ title: "Admin added", variant: "success" });
  });

  const handleRemove = async (address: string) => {
    await removeMutation.mutateAsync(address);
    addToast({ title: "Admin removed", variant: "success" });
  };

  if (adminsQuery.isPending) {
    return <Loader label="Loading admins" />;
  }

  if (adminsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load admins"
        description={adminsQuery.error?.message}
      />
    );
  }

  const admins = adminsQuery.data ?? [];

  return (
    <Page>
      <PageSection title="Add Admin">
        <form onSubmit={onSubmit}>
          <FormField label="Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} />
          </FormField>
          <FormField
            label="Address"
            error={form.formState.errors.address?.message}
          >
            <Input {...form.register("address")} />
          </FormField>
          <button type="submit" disabled={addMutation.isPending}>
            {addMutation.isPending ? "Saving…" : "Add Admin"}
          </button>
        </form>
      </PageSection>

      <PageSection title="Administrators">
        {admins.length === 0 ? (
          <EmptyState title="No admins configured" />
        ) : (
          <DataTable
            columns={[
              { key: "name", header: "Name" },
              { key: "address", header: "Address" },
              {
                key: "actions",
                header: "Actions",
                render: (admin) => (
                  <button
                    type="button"
                    disabled={removeMutation.isPending}
                    onClick={() => handleRemove(admin.address)}
                  >
                    Remove
                  </button>
                ),
              },
            ]}
            data={admins}
            getRowId={(admin) => admin.address}
          />
        )}
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/admin/admins")({
  component: AdminsPage,
});
