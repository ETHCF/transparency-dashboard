import { Link, createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { SelectField } from "@/components/forms/Select";
import { TextArea } from "@/components/forms/TextArea";
import { Page, PageSection } from "@/components/layout/Page";
import { DataTable } from "@/components/table/DataTable";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { useCategoriesQuery } from "@/services/categories";
import {
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
  useExpensesQuery,
} from "@/services/expenses";
import { useUiStore } from "@/stores/ui";
import { formatCurrency, formatDate } from "@/utils/format";

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

const ExpensesAdminPage = () => {
  const expensesQuery = useExpensesQuery({ limit: 50 });
  const categoriesQuery = useCategoriesQuery();
  const createMutation = useCreateExpenseMutation();
  const deleteMutation = useDeleteExpenseMutation();
  const addToast = useUiStore((state) => state.addToast);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const expenses = expensesQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      ...values,
      date: new Date(values.date).toISOString(),
      price: values.price.toString(),
    };

    await createMutation.mutateAsync(payload);
    form.reset();
    addToast({ title: "Expense created", variant: "success" });
  });

  const handleDelete = async (id: string) => {
    if (deleteMutation.isPending) {
      return;
    }
    await deleteMutation.mutateAsync(id);
    addToast({ title: "Expense deleted", variant: "success" });
  };

  if (expensesQuery.isPending || categoriesQuery.isPending) {
    return <Loader label="Loading expenses" />;
  }

  if (expensesQuery.isError) {
    return (
      <ErrorState
        title="Unable to load expenses"
        description={expensesQuery.error?.message}
      />
    );
  }

  if (categoriesQuery.isError) {
    return (
      <ErrorState
        title="Unable to load categories"
        description={categoriesQuery.error?.message}
      />
    );
  }

  return (
    <Page>
      <PageSection title="Add Expense">
        <form onSubmit={onSubmit}>
          <FormField label="Item" error={form.formState.errors.item?.message}>
            <Input {...form.register("item")} />
          </FormField>
          <FormField
            label="Category"
            error={form.formState.errors.category?.message}
          >
            <Controller
              name="category"
              control={form.control}
              render={({ field }) => (
                <SelectField
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select a category"
                  options={categories.map((cat) => ({
                    value: cat.name,
                    label: cat.name,
                  }))}
                />
              )}
            />
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
          <div style={{ marginTop: "1rem" }}>
            <button
              type="submit"
              className="btn btnPrimary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Saving…" : "Create Expense"}
            </button>
          </div>
        </form>
      </PageSection>

      <PageSection title="Expenses">
        {expenses.length === 0 ? (
          <EmptyState title="No expenses recorded" />
        ) : (
          <DataTable
            columns={[
              { key: "item", header: "Item" },
              { key: "category", header: "Category" },
              {
                key: "date",
                header: "Date",
                render: (expense) => formatDate(expense.date),
              },
              {
                key: "price",
                header: "Total",
                render: (expense) =>
                  formatCurrency(expense.price * expense.quantity),
                align: "right",
              },
              {
                key: "actions",
                header: "Actions",
                render: (expense) => (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Link
                      to="/admin/expenses/$expenseId"
                      params={{ expenseId: expense.id }}
                      className="btn btnPrimary"
                    >
                      Edit
                    </Link>
                    <ConfirmDialog
                      title="Delete expense?"
                      description="This action cannot be undone."
                      confirmLabel="Delete"
                      cancelLabel="Cancel"
                      variant="danger"
                      onConfirm={() => {
                        void handleDelete(expense.id);
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
                  </div>
                ),
              },
            ]}
            data={expenses}
            getRowId={(expense) => expense.id}
          />
        )}
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/admin/expenses/")({
  component: ExpensesAdminPage,
});
