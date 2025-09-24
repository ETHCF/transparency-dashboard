import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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
  useCreateTransferPartyMutation,
  useTransferPartiesQuery,
  useUpdateTransferPartyMutation,
} from "@/services/transfers";
import { useUiStore } from "@/stores/ui";

const schema = z.object({
  address: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/u, "Enter a valid Ethereum address"),
  name: z.string().trim().min(2, "Name is required"),
});

type FormValues = z.infer<typeof schema>;

const TransfersAdminPage = () => {
  const partiesQuery = useTransferPartiesQuery({ limit: 100 });
  const updateMutation = useUpdateTransferPartyMutation();
  const createMutation = useCreateTransferPartyMutation();
  const addToast = useUiStore((state) => state.addToast);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const handleSave = async (address: string, fallbackName: string) => {
    const name = draftNames[address]?.trim() || fallbackName;
    await updateMutation.mutateAsync({ address, payload: { name } });
    addToast({ title: "Display name updated", variant: "success" });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    await createMutation.mutateAsync({
      address: values.address.trim(),
      name: values.name.trim(),
    });
    addToast({ title: "Transfer party added", variant: "success" });
    form.reset();
    setDraftNames((prev) => ({
      ...prev,
      [values.address.trim()]: values.name.trim(),
    }));
  });

  if (partiesQuery.isPending) {
    return <Loader label="Loading transfer parties" />;
  }

  if (partiesQuery.isError) {
    return (
      <ErrorState
        title="Unable to load transfer parties"
        description={partiesQuery.error?.message}
      />
    );
  }

  const parties = partiesQuery.data ?? [];

  return (
    <Page>
      <PageSection
        title="Add Transfer Party"
        description="Associate an on-chain address with a readable name for future transfers."
      >
        <form
          onSubmit={onSubmit}
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <FormField
            label="Wallet address"
            error={form.formState.errors.address?.message}
          >
            <Input
              placeholder="0x…"
              {...form.register("address")}
              error={Boolean(form.formState.errors.address)}
            />
          </FormField>
          <FormField label="Display name" error={form.formState.errors.name?.message}>
            <Input
              placeholder="Treasury multisig"
              {...form.register("name")}
              error={Boolean(form.formState.errors.name)}
            />
          </FormField>
          <button
            type="submit"
            className="btn btnPrimary"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Saving…" : "Add transfer party"}
          </button>
        </form>
      </PageSection>

      <PageSection
        title="Transfer Parties"
        description="Review and update existing payer and payee display names."
      >
        {parties.length === 0 ? (
          <EmptyState title="No transfer parties found" />
        ) : (
          <DataTable
            columns={[
              { key: "address", header: "Address" },
              {
                key: "name",
                header: "Display Name",
                render: (party) => (
                  <Input
                    value={draftNames[party.address] ?? party.name}
                    onChange={(event) =>
                      setDraftNames((prev) => ({
                        ...prev,
                        [party.address]: event.target.value,
                      }))
                    }
                  />
                ),
              },
              {
                key: "actions",
                header: "Actions",
                render: (party) => (
                  <button
                    type="button"
                    className="btn btnPrimary"
                    disabled={updateMutation.isPending}
                    onClick={() => handleSave(party.address, party.name)}
                  >
                    Save
                  </button>
                ),
              },
            ]}
            data={parties}
            getRowId={(party) => party.address}
          />
        )}
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/admin/transfers")({
  component: TransfersAdminPage,
});
