import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/services/api-client";
import { mapExpense } from "@/services/mappers";
import { queryKeys } from "@/services/query-keys";
import type { ExpenseDto, ExpensePayload } from "@/types/api";
import type { Expense } from "@/types/domain";

export interface ExpenseQueryParams {
  category?: string;
  limit?: number;
  offset?: number;
}

type ExpenseListResponse = ExpenseDto[] | { data?: ExpenseDto[] | null };

const extractExpenses = (response: ExpenseListResponse): ExpenseDto[] => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return [];
};

export const fetchExpenses = async (
  params: ExpenseQueryParams = {},
): Promise<Expense[]> => {
  const response = await apiRequest<ExpenseListResponse>("expenses", {
    query: params,
  });

  return extractExpenses(response).map(mapExpense);
};

export const fetchExpenseById = async (id: string): Promise<Expense> => {
  const response = await apiRequest<ExpenseDto>(`expenses/${id}`);
  return mapExpense(response);
};

export const createExpense = async (
  payload: ExpensePayload,
): Promise<Expense> => {
  const response = await apiRequest<ExpenseDto>("expenses", {
    method: "POST",
    body: payload,
  });

  return mapExpense(response);
};

export const updateExpense = async (
  id: string,
  payload: ExpensePayload,
): Promise<Expense> => {
  const response = await apiRequest<ExpenseDto>(`expenses/${id}`, {
    method: "PUT",
    body: payload,
  });

  return mapExpense(response);
};

export const deleteExpense = (id: string) =>
  apiRequest<void>(`expenses/${id}`, {
    method: "DELETE",
  });

export const uploadExpenseReceipt = (id: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest(`expenses/${id}/receipts`, {
    method: "POST",
    body: formData,
    isFormData: true,
  });
};

export const deleteExpenseReceipt = (expenseId: string, receiptId: string) =>
  apiRequest<void>(`expenses/${expenseId}/receipts/${receiptId}`, {
    method: "DELETE",
  });

export const useExpensesQuery = (params: ExpenseQueryParams = {}) =>
  useQuery({
    queryKey: queryKeys.expenses(params),
    queryFn: () => fetchExpenses(params),
  });

export const useExpenseQuery = (id: string) =>
  useQuery({
    queryKey: queryKeys.expenseById(id),
    queryFn: () => fetchExpenseById(id),
    enabled: Boolean(id),
  });

export const useCreateExpenseMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createExpense,
    onSuccess: (expense) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses() });
      void queryClient.setQueryData(queryKeys.expenseById(expense.id), expense);
    },
  });
};

export const useUpdateExpenseMutation = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ExpensePayload) => updateExpense(id, payload),
    onSuccess: (expense) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.expenseById(id),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses() });
      void queryClient.setQueryData(queryKeys.expenseById(expense.id), expense);
    },
  });
};

export const useDeleteExpenseMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses() });
      queryClient.removeQueries({ queryKey: queryKeys.expenseById(id) });
    },
  });
};
