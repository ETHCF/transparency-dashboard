import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/services/api-client";
import { queryKeys } from "@/services/query-keys";
import type { AdminDto, AdminCreatePayload } from "@/types/api";

export const fetchAdmins = () => apiRequest<AdminDto[]>("admins");

export const addAdmin = (payload: AdminCreatePayload) =>
  apiRequest<AdminDto>("admins", {
    method: "POST",
    body: payload,
  });

export const removeAdmin = (address: string) =>
  apiRequest<void>(`admins/${address}`, {
    method: "DELETE",
  });

export const useAdminsQuery = () =>
  useQuery({
    queryKey: queryKeys.admins(),
    queryFn: fetchAdmins,
  });

export const useAddAdminMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addAdmin,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admins() });
    },
  });
};

export const useRemoveAdminMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (address: string) => removeAdmin(address),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admins() });
    },
  });
};
