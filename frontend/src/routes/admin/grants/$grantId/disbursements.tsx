import { Link, createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { Page, PageSection } from "@/components/layout/Page";
import {
  useCreateGrantDisbursementMutation,
  useGrantDisbursementsQuery,
  useUpdateGrantDisbursementMutation,
} from "@/services/grants";
import { useUiStore } from "@/stores/ui";
import type { GrantDisbursement } from "@/types/domain";
import { formatDateTime, formatTokenAmount } from "@/utils/format";

const createSchema = z.object({
  amount: z.coerce.string().min(1),
  txHash: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{64}$/u, "Enter a valid transaction hash"),
  blockNumber: z.coerce.number().min(0),
  blockTimestamp: z.coerce.number().min(0),
});

type CreateFormValues = z.infer<typeof createSchema>;

type DraftDisbursement = GrantDisbursement & {
  amountInput: string;
  blockNumberInput: string;
  blockTimestampInput: string;
};

const mapDrafts = (disbursements: GrantDisbursement[]): DraftDisbursement[] =>
  disbursements.map((item) => ({
    ...item,
    amountInput: item.amount.toString(),
    blockNumberInput:
      item.blockNumber !== undefined ? String(item.blockNumber) : "0",
    blockTimestampInput:
      item.blockTimestamp !== undefined ? String(item.blockTimestamp) : "0",
  }));

const DisbursementManagerPage = () => {
  const { grantId } = Route.useParams();
  const disbursementsQuery = useGrantDisbursementsQuery(grantId);
  const createMutation = useCreateGrantDisbursementMutation(grantId);
  const updateMutation = useUpdateGrantDisbursementMutation(grantId);
  const addToast = useUiStore((state) => state.addToast);
  const [drafts, setDrafts] = useState<DraftDisbursement[]>([]);
  const createForm = useForm<CreateFormValues>({ resolver: zodResolver(createSchema) });

  useEffect(() => {
    if (disbursementsQuery.data) {
      setDrafts(mapDrafts(disbursementsQuery.data));
    }
  }, [disbursementsQuery.data]);

  const handleDraftChange = (
    id: string,
    field: keyof DraftDisbursement,
    value: string,
  ) => {
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.id === id
          ? {
              ...draft,
              [field]: value,
              ...(field === "amountInput"
                ? { amount: Number.parseFloat(value || "0") }
                : {}),
              ...(field === "blockNumberInput"
                ? { blockNumber: Number.parseInt(value || "0", 10) }
                : {}),
              ...(field === "blockTimestampInput"
                ? { blockTimestamp: Number.parseInt(value || "0", 10) }
                : {}),
            }
          : draft,
      ),
    );
  };

  const handleSave = async (id: string) => {
    const draft = drafts.find((entry) => entry.id === id);
    if (!draft) {
      return;
    }

    const blockNumber = Number.parseInt(draft.blockNumberInput, 10);
    const blockTimestamp = Number.parseInt(draft.blockTimestampInput, 10);

    await updateMutation.mutateAsync({
      disbursementId: id,
      payload: {
        amount: draft.amountInput,
        txHash: draft.txHash,
        blockNumber: Number.isNaN(blockNumber) ? 0 : blockNumber,
        blockTimestamp: Number.isNaN(blockTimestamp) ? 0 : blockTimestamp,
      },
    });

    addToast({ title: "Disbursement updated", variant: "success" });
  };

  const handleCreate = createForm.handleSubmit(async (values) => {
    await createMutation.mutateAsync({
      amount: values.amount,
      txHash: values.txHash,
      blockNumber: values.blockNumber,
      blockTimestamp: values.blockTimestamp,
    });

    addToast({ title: "Disbursement added", variant: "success" });
    createForm.reset();
  });

  if (disbursementsQuery.isPending) {
    return <Loader label="Loading disbursements" />;
  }

  if (disbursementsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load disbursements"
        description={disbursementsQuery.error?.message}
      />
    );
  }

  return (
    <Page>
      <PageSection
        title="Add Disbursement"
        description="Record a new distribution of funds for this grant."
      >
        <form
          onSubmit={handleCreate}
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <FormField label="Amount (ETH)" error={createForm.formState.errors.amount?.message}>
            <Input
              type="number"
              step="0.01"
              {...createForm.register("amount")}
            />
          </FormField>
          <FormField label="Transaction hash" error={createForm.formState.errors.txHash?.message}>
            <Input {...createForm.register("txHash")} />
          </FormField>
          <FormField
            label="Block number"
            error={createForm.formState.errors.blockNumber?.message}
          >
            <Input
              type="number"
              {...createForm.register("blockNumber", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Block timestamp"
            error={createForm.formState.errors.blockTimestamp?.message}
          >
            <Input
              type="number"
              {...createForm.register("blockTimestamp", { valueAsNumber: true })}
            />
          </FormField>
          <div style={{ alignSelf: "end" }}>
            <button
              type="submit"
              className="btn btnPrimary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Saving…" : "Add disbursement"}
            </button>
          </div>
        </form>
      </PageSection>

      <PageSection
        title="Existing Disbursements"
        description="Edit the transaction details for each disbursement."
      >
        {drafts.length === 0 ? (
          <EmptyState title="No disbursements yet" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {drafts.map((draft) => (
              <div
                key={draft.id}
                style={{
                  border: "1px solid rgba(92, 108, 255, 0.2)",
                  borderRadius: "var(--radius-md)",
                  padding: "1rem",
                  display: "grid",
                  gap: "0.75rem",
                }}
              >
                <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                  <div>
                    <strong>Current amount:</strong> {formatTokenAmount(draft.amount, "ETH")}
                  </div>
                  <div>
                    <strong>Recorded:</strong> {draft.createdAt ? formatDateTime(draft.createdAt) : "—"}
                  </div>
                </div>
                <FormField label="Amount (ETH)">
                  <Input
                    type="number"
                    step="0.01"
                    value={draft.amountInput}
                    onChange={(event) =>
                      handleDraftChange(draft.id, "amountInput", event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Transaction hash">
                  <Input
                    value={draft.txHash}
                    onChange={(event) =>
                      handleDraftChange(draft.id, "txHash", event.target.value)
                    }
                  />
                </FormField>
                <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                  <FormField label="Block number">
                    <Input
                      type="number"
                      value={draft.blockNumberInput}
                      onChange={(event) =>
                        handleDraftChange(draft.id, "blockNumberInput", event.target.value)
                      }
                    />
                  </FormField>
                  <FormField label="Block timestamp">
                    <Input
                      type="number"
                      value={draft.blockTimestampInput}
                      onChange={(event) =>
                        handleDraftChange(
                          draft.id,
                          "blockTimestampInput",
                          event.target.value,
                        )
                      }
                    />
                  </FormField>
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    type="button"
                    className="btn btnPrimary"
                    disabled={updateMutation.isPending}
                    onClick={() => void handleSave(draft.id)}
                  >
                    {updateMutation.isPending ? "Saving…" : "Save changes"}
                  </button>
                  <code style={{ opacity: 0.7 }}>ID: {draft.id}</code>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: "1.5rem" }}>
          <Link to={`/admin/grants/${grantId}`} className="btn btnGhost">
            Back to grant
          </Link>
        </div>
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/admin/grants/$grantId/disbursements")({
  component: DisbursementManagerPage,
});
