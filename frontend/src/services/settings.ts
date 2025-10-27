import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/services/api-client";
import { queryKeys } from "@/services/query-keys";

export const updateOrganizationName = (name: string) =>
  apiRequest<{ name: string }>("settings/name", {
    method: "POST",
    body: { name },
  });

export const updateTotalFundsRaised = (amount: number) =>
  apiRequest<{ amount: number }>("settings/total-funds-raised", {
    method: "POST",
    body: { amount },
  });

export const updateTotalFundsRaisedUnit = (unit: string) =>
  apiRequest<{ unit: string }>("settings/total-funds-raised-unit", {
    method: "POST",
    body: { unit },
  });

export const useUpdateOrganizationNameMutation = () =>
  useMutation({
    mutationFn: ({ name }: { name: string }) => updateOrganizationName(name),
  });

export const useUpdateTotalFundsRaisedMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ amount }: { amount: number }) => updateTotalFundsRaised(amount),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.treasury() });
    },
  });
};

export const useUpdateTotalFundsRaisedUnitMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ unit }: { unit: string }) => updateTotalFundsRaisedUnit(unit),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.treasury() });
    },
  });
};
