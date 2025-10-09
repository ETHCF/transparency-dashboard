import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { TextArea } from "@/components/forms/TextArea";
import { Page, PageSection } from "@/components/layout/Page";
import { DataTable } from "@/components/table/DataTable";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from "@/services/categories";
import { useUiStore } from "@/stores/ui";
import type { CategoryDto } from "@/types/api";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(2, "Description must be at least 2 characters"),
});

type FormValues = z.infer<typeof schema>;

const CategoriesAdminPage = () => {
  const categoriesQuery = useCategoriesQuery();
  const createMutation = useCreateCategoryMutation();
  const updateMutation = useUpdateCategoryMutation();
  const deleteMutation = useDeleteCategoryMutation();
  const addToast = useUiStore((state) => state.addToast);

  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const categories = categoriesQuery.data ?? [];

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({
          name: editingCategory.name,
          payload: values,
        });
        addToast({ title: "Category updated", variant: "success" });
        setEditingCategory(null);
      } else {
        await createMutation.mutateAsync(values);
        addToast({ title: "Category created", variant: "success" });
      }
      form.reset();
    } catch (error) {
      addToast({
        title: editingCategory ? "Failed to update category" : "Failed to create category",
        variant: "error",
      });
    }
  });

  const handleEdit = (category: CategoryDto) => {
    setEditingCategory(category);
    form.setValue("name", category.name);
    form.setValue("description", category.description);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    form.reset();
  };

  const handleDelete = async (name: string) => {
    try {
      await deleteMutation.mutateAsync(name);
      addToast({ title: "Category deleted", variant: "success" });
    } catch (error) {
      addToast({ title: "Failed to delete category", variant: "error" });
    }
  };

  if (categoriesQuery.isPending) {
    return <Loader label="Loading categories" />;
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
      <PageSection title={editingCategory ? "Edit Category" : "Add Category"}>
        <form onSubmit={onSubmit} style={{ maxWidth: "600px" }}>
          <FormField label="Name" error={form.formState.errors.name?.message}>
            <Input
              {...form.register("name")}
              placeholder="e.g., Hardware, Software, Travel"
              disabled={!!editingCategory}
            />
          </FormField>
          <FormField
            label="Description"
            error={form.formState.errors.description?.message}
          >
            <TextArea
              {...form.register("description")}
              placeholder="Brief description of this category"
              rows={3}
            />
          </FormField>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              type="submit"
              className="btn btnPrimary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingCategory ? "Update Category" : "Add Category"}
            </button>
            {editingCategory && (
              <button
                type="button"
                className="btn btnGhost"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </PageSection>

      <PageSection title="Categories" description="Manage expense categories">
        <DataTable
          columns={[
            { key: "name", header: "Name" },
            { key: "description", header: "Description" },
            {
              key: "actions",
              header: "Actions",
              render: (category) => (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className="btn btnSmall btnGhost"
                    onClick={() => handleEdit(category)}
                  >
                    Edit
                  </button>
                  <ConfirmDialog
                    title="Delete Category"
                    description={`Are you sure you want to delete the category "${category.name}"? This action cannot be undone.`}
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    variant="danger"
                    onConfirm={() => {
                      void handleDelete(category.name);
                    }}
                    trigger={
                      <button
                        className="btn btnSmall btnDanger"
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
          data={categories}
          getRowId={(category) => category.name}
          emptyState={
            <EmptyState
              title="No categories"
              description="Create your first category to organize expenses."
            />
          }
        />
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/admin/categories")({
  component: CategoriesAdminPage,
});
