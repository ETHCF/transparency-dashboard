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
import { TextArea } from "@/components/forms/TextArea";
import { Page, PageSection } from "@/components/layout/Page";
import {
  useCreateGrantFundsUsageMutation,
  useGrantFundsUsageQuery,
  useUpdateGrantFundsUsageMutation,
} from "@/services/grants";
import { useUiStore } from "@/stores/ui";
import type { Expense } from "@/types/domain";
import { formatCurrency, formatDate } from "@/utils/format";

const createSchema = z.object({
  item: z.string().min(1),
  quantity: z.coerce.number().min(1),
  price: z.coerce.string().min(1),
  purpose: z.string().min(1),
  category: z.string().min(1),
  date: z.string().min(1),
  txHash: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined)
    .refine(
      (value) => !value || /^0x[a-fA-F0-9]{64}$/u.test(value),
      "Enter a valid transaction hash",
    ),
});

type CreateFormValues = z.infer<typeof createSchema>;

type DraftUsage = Expense & {
  priceInput: string;
  dateInput: string;
};

const toDrafts = (items: Expense[]): DraftUsage[] =>
  items.map((usage) => ({
    ...usage,
    priceInput: usage.price.toString(),
    dateInput: usage.date.toISOString().slice(0, 10),
  }));

const FundsUsageManagerPage = () => {
  const { grantId } = Route.useParams();
  const fundsUsageQuery = useGrantFundsUsageQuery(grantId);
  const createMutation = useCreateGrantFundsUsageMutation(grantId);
  const updateMutation = useUpdateGrantFundsUsageMutation(grantId);
  const addToast = useUiStore((state) => state.addToast);
  const [drafts, setDrafts] = useState<DraftUsage[]>([]);
  const createForm = useForm<CreateFormValues>({ resolver: zodResolver(createSchema) });

  useEffect(() => {
    if (fundsUsageQuery.data) {
      setDrafts(toDrafts(fundsUsageQuery.data));
    }
  }, [fundsUsageQuery.data]);

  const handleDraftChange = (
    id: string,
    key: keyof DraftUsage,
    value: string | number,
  ) => {
    setDrafts((prev) =>
      prev.map((usage) =>
        usage.id === id
          ? {
              ...usage,
              [key]: value,
              ...(key === "priceInput"
                ? { price: Number.parseFloat(String(value) || "0") }
                : {}),
              ...(key === "quantity"
                ? { quantity: Number(value) }
                : {}),
              ...(key === "dateInput"
                ? { date: new Date(String(value)) }
                : {}),
            }
          : usage,
      ),
    );
  };

  const handleSave = async (usage: DraftUsage) => {
    await updateMutation.mutateAsync({
      usageId: usage.id,
      payload: {
        item: usage.item,
        quantity: usage.quantity,
        price: usage.priceInput,
        purpose: usage.purpose,
        category: usage.category,
        date: usage.dateInput,
        txHash: usage.txHash ?? undefined,
      },
    });

    addToast({ title: "Funds usage updated", variant: "success" });
  };

  const handleCreate = createForm.handleSubmit(async (values) => {
    await createMutation.mutateAsync({
      item: values.item,
      quantity: values.quantity,
      price: values.price,
      purpose: values.purpose,
      category: values.category,
      date: values.date,
      txHash: values.txHash ?? undefined,
    });

    addToast({ title: "Funds usage added", variant: "success" });
    createForm.reset();
  });

  if (fundsUsageQuery.isPending) {
    return <Loader label="Loading funds usage" />;
  }

  if (fundsUsageQuery.isError) {
    return (
      <ErrorState
        title="Unable to load funds usage"
        description={fundsUsageQuery.error?.message}
      />
    );
  }

  return (
    <Page>
      <PageSection
        title="Add Funds Usage"
        description="Record a new allocation of grant funds."
      >
        <form
          onSubmit={handleCreate}
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <FormField label="Item" error={createForm.formState.errors.item?.message}>
            <Input {...createForm.register("item")} />
          </FormField>
          <FormField label="Category" error={createForm.formState.errors.category?.message}>
            <Input {...createForm.register("category")} />
          </FormField>
          <FormField
            label="Quantity"
            error={createForm.formState.errors.quantity?.message}
          >
            <Input
              type="number"
              {...createForm.register("quantity", { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Price" error={createForm.formState.errors.price?.message}>
            <Input type="number" step="0.01" {...createForm.register("price")} />
          </FormField>
          <FormField label="Date" error={createForm.formState.errors.date?.message}>
            <Input type="date" {...createForm.register("date")} />
          </FormField>
          <FormField label="Purpose" error={createForm.formState.errors.purpose?.message}>
            <TextArea {...createForm.register("purpose")} />
          </FormField>
          <FormField label="Tx hash" optional error={createForm.formState.errors.txHash?.message}>
            <Input {...createForm.register("txHash")} />
          </FormField>
          <div style={{ alignSelf: "end" }}>
            <button
              type="submit"
              className="btn btnPrimary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Saving…" : "Add funds usage"}
            </button>
          </div>
        </form>
      </PageSection>

      <PageSection
        title="Existing Funds Usage"
        description="Update the recorded expenses for this grant."
      >
        {drafts.length === 0 ? (
          <EmptyState title="No expenses linked" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {drafts.map((usage) => (
              <div
                key={usage.id}
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
                    <strong>Recorded:</strong> {formatDate(usage.date)}
                  </div>
                  <div>
                    <strong>Total spent:</strong> {formatCurrency(usage.price * usage.quantity)}
                  </div>
                </div>
                <FormField label="Item">
                  <Input
                    value={usage.item}
                    onChange={(event) =>
                      handleDraftChange(usage.id, "item", event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Category">
                  <Input
                    value={usage.category}
                    onChange={(event) =>
                      handleDraftChange(usage.id, "category", event.target.value)
                    }
                  />
                </FormField>
                <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                  <FormField label="Quantity">
                    <Input
                      type="number"
                      value={usage.quantity}
                      onChange={(event) =>
                        handleDraftChange(
                          usage.id,
                          "quantity",
                          Number.parseInt(event.target.value || "0", 10),
                        )
                      }
                    />
                  </FormField>
                  <FormField label="Price">
                    <Input
                      type="number"
                      step="0.01"
                      value={usage.priceInput}
                      onChange={(event) =>
                        handleDraftChange(usage.id, "priceInput", event.target.value)
                      }
                    />
                  </FormField>
                  <FormField label="Date">
                    <Input
                      type="date"
                      value={usage.dateInput}
                      onChange={(event) =>
                        handleDraftChange(usage.id, "dateInput", event.target.value)
                      }
                    />
                  </FormField>
                </div>
                <FormField label="Purpose">
                  <TextArea
                    value={usage.purpose}
                    onChange={(event) =>
                      handleDraftChange(usage.id, "purpose", event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Tx hash" optional>
                  <Input
                    value={usage.txHash ?? ""}
                    onChange={(event) =>
                      handleDraftChange(usage.id, "txHash", event.target.value)
                    }
                  />
                </FormField>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    type="button"
                    className="btn btnPrimary"
                    disabled={updateMutation.isPending}
                    onClick={() => void handleSave(usage)}
                  >
                    {updateMutation.isPending ? "Saving…" : "Save changes"}
                  </button>
                  <code style={{ opacity: 0.7 }}>ID: {usage.id}</code>
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

export const Route = createFileRoute("/admin/grants/$grantId/funds-usage")({
  component: FundsUsageManagerPage,
});
