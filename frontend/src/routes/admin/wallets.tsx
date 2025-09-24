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
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import {
  useAddTreasuryWalletMutation,
  useDeleteTreasuryWalletMutation,
  useTreasuryWalletsQuery,
} from "@/services/treasury";
import { useUiStore } from "@/stores/ui";

const schema = z.object({
  address: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/u, "Enter a valid Ethereum address"),
});

type FormValues = z.infer<typeof schema>;

const WalletsAdminPage = () => {
  const walletsQuery = useTreasuryWalletsQuery();
  const addMutation = useAddTreasuryWalletMutation();
  const deleteMutation = useDeleteTreasuryWalletMutation();
  const addToast = useUiStore((state) => state.addToast);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = form.handleSubmit(async (values) => {
    await addMutation.mutateAsync({ address: values.address });
    form.reset();
    addToast({ title: "Wallet added", variant: "success" });
  });

  const handleDelete = async (address: string) => {
    if (deleteMutation.isPending) {
      return;
    }
    await deleteMutation.mutateAsync(address);
    addToast({ title: "Wallet removed", variant: "success" });
  };

  if (walletsQuery.isPending) {
    return <Loader label="Loading wallets" />;
  }

  if (walletsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load wallets"
        description={walletsQuery.error?.message}
      />
    );
  }

  const wallets = walletsQuery.data ?? [];

  return (
    <Page>
      <PageSection title="Add Wallet" description="Register a new treasury wallet.">
        <form onSubmit={onSubmit} style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <FormField
            label="Wallet Address"
            error={form.formState.errors.address?.message}
          >
            <Input
              placeholder="0x…"
              {...form.register("address")}
              error={Boolean(form.formState.errors.address)}
            />
          </FormField>
          <button
            type="submit"
            className="btn btnPrimary"
            disabled={addMutation.isPending}
          >
            {addMutation.isPending ? "Saving…" : "Add Wallet"}
          </button>
        </form>
      </PageSection>

      <PageSection title="Treasury Wallets">
        {wallets.length === 0 ? (
          <EmptyState title="No wallets added yet" />
        ) : (
          <DataTable
            columns={[
              {
                key: "address",
                header: "Address",
                render: (wallet) => <code>{wallet.address}</code>,
              },
              {
                key: "link",
                header: "Explorer",
                render: (wallet) => (
                  <a
                    href={wallet.etherscanUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                render: (wallet) => (
                  <ConfirmDialog
                    title="Remove wallet?"
                    description={
                      <span>
                        This will remove <code>{wallet.address}</code> from the treasury wallet
                        list.
                      </span>
                    }
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    variant="danger"
                    onConfirm={() => {
                      void handleDelete(wallet.address);
                    }}
                    trigger={
                      <button
                        type="button"
                        className="btn btnDanger"
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </button>
                    }
                  />
                ),
              },
            ]}
            data={wallets}
            getRowId={(wallet) => wallet.address}
          />
        )}
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/admin/wallets")({
  component: WalletsAdminPage,
});
