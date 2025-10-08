import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/services/api-client";
import { queryKeys } from "@/services/query-keys";
import type {
  MonthlyBudgetAllocationDto,
  MonthlyBudgetAllocationCreatePayload,
  MonthlyBudgetAllocationUpdatePayload,
} from "@/types/api";

export const fetchBudgetAllocations = () =>
  apiRequest<MonthlyBudgetAllocationDto[]>("budgets/allocations");

export const createBudgetAllocation = (
  payload: MonthlyBudgetAllocationCreatePayload
) =>
  apiRequest<{ id: string }>("budgets/allocations", {
    method: "POST",
    body: payload,
  });

export const updateBudgetAllocation = (
  id: string,
  payload: MonthlyBudgetAllocationUpdatePayload
) =>
  apiRequest<MonthlyBudgetAllocationDto>(`budgets/allocations/${id}`, {
    method: "PUT",
    body: payload,
  });

export const deleteBudgetAllocation = (id: string) =>
  apiRequest<{ message: string }>(`budgets/allocations/${id}`, {
    method: "DELETE",
  });

export const useBudgetAllocationsQuery = () =>
  useQuery({
    queryKey: queryKeys.budgetAllocations(),
    queryFn: fetchBudgetAllocations,
  });

export const useCreateBudgetAllocationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBudgetAllocation,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.budgetAllocations(),
      });
    },
  });
};

export const useUpdateBudgetAllocationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MonthlyBudgetAllocationUpdatePayload }) =>
      updateBudgetAllocation(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.budgetAllocations(),
      });
    },
  });
};

export const useDeleteBudgetAllocationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBudgetAllocation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.budgetAllocations(),
      });
    },
  });
};
