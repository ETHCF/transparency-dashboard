import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { SelectField } from "@/components/forms/Select";
import { Page, PageSection } from "@/components/layout/Page";
import { DataTable } from "@/components/table/DataTable";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import {
  useBudgetAllocationsQuery,
  useCreateBudgetAllocationMutation,
  useUpdateBudgetAllocationMutation,
  useDeleteBudgetAllocationMutation,
} from "@/services/budgets";
import { useCategoriesQuery } from "@/services/categories";
import { useUiStore } from "@/stores/ui";
import { formatCurrency } from "@/utils/format";
import type { MonthlyBudgetAllocationDto } from "@/types/api";

const schema = z.object({
  category: z.string().min(2, "Required"),
  amount: z.string().min(1, "Required"),
  manager: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

const BudgetsAdminPage = () => {
  const budgetsQuery = useBudgetAllocationsQuery();
  const categoriesQuery = useCategoriesQuery();
  const createMutation = useCreateBudgetAllocationMutation();
  const updateMutation = useUpdateBudgetAllocationMutation();
  const deleteMutation = useDeleteBudgetAllocationMutation();
  const addToast = useUiStore((state) => state.addToast);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const [editingId, setEditingId] = useState<string | null>(null);

  const categories = categoriesQuery.data ?? [];

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      category: values.category,
      amount: values.amount,
      manager: values.manager || null,
    };

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, payload });
      setEditingId(null);
      addToast({ title: "Budget allocation updated", variant: "success" });
    } else {
      await createMutation.mutateAsync(payload);
      addToast({ title: "Budget allocation created", variant: "success" });
    }
    form.reset();
  });

  const handleEdit = (allocation: MonthlyBudgetAllocationDto) => {
    setEditingId(allocation.id);
    form.reset({
      category: allocation.category,
      amount: allocation.amount,
      manager: allocation.manager || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    form.reset();
  };

  const handleDelete = async (id: string) => {
    if (deleteMutation.isPending) {
      return;
    }
    await deleteMutation.mutateAsync(id);
    addToast({ title: "Budget allocation deleted", variant: "success" });
  };

  if (budgetsQuery.isPending || categoriesQuery.isPending) {
    return <Loader label="Loading budget allocations" />;
  }

  if (budgetsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load budget allocations"
        description={budgetsQuery.error?.message}
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

  const budgets = budgetsQuery.data ?? [];

  return (
    <Page>
      <PageSection title={editingId ? "Edit Budget Allocation" : "Add Budget Allocation"}>
        <form onSubmit={onSubmit}>
          <FormField
            label="Category"
            error={form.formState.errors.category?.message}
          >
            <Controller
              name="category"
              control={form.control}
              render={({ field }) => (
                <SelectField
                  {...field}
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
            label="Monthly Amount"
            error={form.formState.errors.amount?.message}
          >
            <Input
              {...form.register("amount")}
              placeholder="e.g., 50000"
            />
          </FormField>
          <FormField
            label="Manager Address"
            error={form.formState.errors.manager?.message}
            optional
          >
            <Input
              {...form.register("manager")}
              placeholder="0x..."
            />
          </FormField>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
            <button
              type="submit"
              className="btn btnPrimary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving…"
                : editingId
                ? "Update Budget Allocation"
                : "Create Budget Allocation"}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </PageSection>

      <PageSection title="Budget Allocations">
        {budgets.length === 0 ? (
          <EmptyState title="No budget allocations configured" />
        ) : (
          <DataTable
            columns={[
              { key: "category", header: "Category" },
              {
                key: "amount",
                header: "Monthly Amount",
                render: (budget) => formatCurrency(parseFloat(budget.amount)),
                align: "right",
              },
              {
                key: "manager",
                header: "Manager",
                render: (budget) => budget.manager || "—",
              },
              {
                key: "actions",
                header: "Actions",
                render: (budget) => (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="btn btnPrimary"
                      onClick={() => handleEdit(budget)}
                    >
                      Edit
                    </button>
                    <ConfirmDialog
                      title="Delete budget allocation?"
                      description="This action cannot be undone."
                      confirmLabel="Delete"
                      cancelLabel="Cancel"
                      variant="danger"
                      onConfirm={() => {
                        void handleDelete(budget.id);
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
            data={budgets}
            getRowId={(budget) => budget.id}
          />
        )}
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/admin/budgets")({
  component: BudgetsAdminPage,
});
