import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/services/api-client";
import { queryKeys } from "@/services/query-keys";
import type { CategoryDto } from "@/types/api";

export const fetchCategories = async (): Promise<CategoryDto[]> => {
  const response = await apiRequest<CategoryDto[]>("categories");
  return response;
};

export const createCategory = async (
  payload: CategoryDto,
): Promise<CategoryDto> => {
  const response = await apiRequest<CategoryDto>("categories", {
    method: "POST",
    body: payload,
  });
  return response;
};

export const updateCategory = async (
  name: string,
  payload: CategoryDto,
): Promise<void> => {
  await apiRequest<void>(`categories/${encodeURIComponent(name)}`, {
    method: "PUT",
    body: payload,
  });
};

export const deleteCategory = async (name: string): Promise<void> => {
  await apiRequest<void>(`categories/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
};

export const useCategoriesQuery = () =>
  useQuery({
    queryKey: queryKeys.categories(),
    queryFn: fetchCategories,
  });

export const useCreateCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories() });
    },
  });
};

export const useUpdateCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, payload }: { name: string; payload: CategoryDto }) =>
      updateCategory(name, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories() });
    },
  });
};

export const useDeleteCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories() });
    },
  });
};
