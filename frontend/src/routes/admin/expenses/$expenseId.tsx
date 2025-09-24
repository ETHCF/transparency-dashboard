import { Link, createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { TextArea } from "@/components/forms/TextArea";
import { Page, PageSection } from "@/components/layout/Page";
import {
  useExpenseQuery,
  useUpdateExpenseMutation,
} from "@/services/expenses";
import { useUiStore } from "@/stores/ui";

const schema = z.object({
  item: z.string().min(2, "Required"),
  category: z.string().min(2, "Required"),
  quantity: z.coerce.number().min(1, "Invalid"),
  price: z.coerce.number().min(0, "Invalid"),
  purpose: z.string().min(4, "Required"),
  date: z.string().min(4, "Required"),
  txHash: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

const ExpenseEditPage = () => {
  const { expenseId } = Route.useParams();
  const expenseQuery = useExpenseQuery(expenseId);
  const updateMutation = useUpdateExpenseMutation(expenseId);
  const addToast = useUiStore((state) => state.addToast);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!expenseQuery.data) {
      return;
    }

    const expense = expenseQuery.data;
    form.reset({
      item: expense.item,
      category: expense.category,
      quantity: expense.quantity,
      price: expense.price,
      purpose: expense.purpose,
      date: expense.date.toISOString().slice(0, 10),
      txHash: expense.txHash ?? "",
    });
  }, [expenseQuery.data, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    await updateMutation.mutateAsync({
      item: values.item,
      category: values.category,
      quantity: values.quantity,
      price: values.price.toString(),
      purpose: values.purpose,
      date: new Date(values.date).toISOString(),
      txHash: values.txHash?.trim() ? values.txHash : null,
    });

    addToast({ title: "Expense updated", variant: "success" });
  });

  if (expenseQuery.isPending) {
    return <Loader label="Loading expense" />;
  }

  if (expenseQuery.isError || !expenseQuery.data) {
    return (
      <ErrorState
        title="Unable to load expense"
        description={expenseQuery.error?.message}
      />
    );
  }

  return (
    <Page>
      <PageSection
        title="Edit Expense"
        description="Update the expense details and save your changes."
      >
        <form onSubmit={onSubmit}>
          <FormField label="Item" error={form.formState.errors.item?.message}>
            <Input {...form.register("item")} />
          </FormField>

          <FormField
            label="Category"
            error={form.formState.errors.category?.message}
          >
            <Input {...form.register("category")} />
          </FormField>

          <FormField
            label="Quantity"
            error={form.formState.errors.quantity?.message}
          >
            <Input
              type="number"
              {...form.register("quantity", { valueAsNumber: true })}
            />
          </FormField>

          <FormField label="Price" error={form.formState.errors.price?.message}>
            <Input
              type="number"
              step="0.01"
              {...form.register("price", { valueAsNumber: true })}
            />
          </FormField>

          <FormField
            label="Purpose"
            error={form.formState.errors.purpose?.message}
          >
            <TextArea {...form.register("purpose")} />
          </FormField>

          <FormField label="Date" error={form.formState.errors.date?.message}>
            <Input type="date" {...form.register("date")} />
          </FormField>

          <FormField label="Tx Hash" optional>
            <Input {...form.register("txHash")} />
          </FormField>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              type="submit"
              className="btn btnPrimary"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </button>
            <Link to="/admin/expenses" className="btn btnGhost">
              Cancel
            </Link>
          </div>
        </form>
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/admin/expenses/$expenseId")({
  component: ExpenseEditPage,
});
