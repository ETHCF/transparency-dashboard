import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/services/api-client";
import {
  mapGrant,
  mapGrantDisbursements,
  mapGrantMilestonesResponse,
  mapExpense,
} from "@/services/mappers";
import { queryKeys } from "@/services/query-keys";
import type {
  GrantDisbursementCreatePayload,
  GrantDisbursementDto,
  GrantDisbursementUpdatePayload,
  GrantDto,
  GrantMilestoneDto,
  GrantMilestoneUpdatePayload,
  GrantMilestonesResponse,
  GrantPayload,
  ExpenseDto,
  GrantFundsUsagePayload,
  GrantFundsUsageUpdatePayload,
} from "@/types/api";
import type {
  Grant,
  GrantDisbursement,
  GrantMilestone,
  Expense,
} from "@/types/domain";

export interface GrantQueryParams {
  status?: "active" | "previous";
  search?: string;
  limit?: number;
  offset?: number;
}

type GrantListResponse = GrantDto[] | { data?: GrantDto[] | null };

const extractGrants = (response: GrantListResponse): GrantDto[] => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return [];
};

export const fetchGrants = async (
  params: GrantQueryParams = {},
): Promise<Grant[]> => {
  const response = await apiRequest<GrantListResponse>("grants", {
    query: params,
  });

  return extractGrants(response).map(mapGrant);
};

export const fetchGrantById = async (id: string): Promise<Grant> => {
  const response = await apiRequest<GrantDto>(`grants/${id}`);
  return mapGrant(response);
};

export const fetchGrantMilestones = async (
  id: string,
): Promise<GrantMilestone[]> => {
  const response = await apiRequest<GrantMilestonesResponse | GrantMilestoneDto[]>(
    `grants/${id}/milestones`,
  );

  return mapGrantMilestonesResponse(response);
};

export const fetchGrantDisbursements = async (
  id: string,
): Promise<GrantDisbursement[]> => {
  const response = await apiRequest<GrantDisbursementDto[] | { data?: GrantDisbursementDto[] }>(
    `grants/${id}/disbursements`,
  );

  if (Array.isArray(response)) {
    return mapGrantDisbursements(response);
  }

  return mapGrantDisbursements(response.data);
};

export const fetchGrantFundsUsage = async (id: string): Promise<Expense[]> => {
  const response = await apiRequest<ExpenseDto[] | { data?: ExpenseDto[] }>(
    `grants/${id}/funds-usage`,
  );

  if (Array.isArray(response)) {
    return response.map(mapExpense);
  }

  return (response.data ?? []).map(mapExpense);
};

export const createGrantDisbursement = async (
  id: string,
  payload: GrantDisbursementCreatePayload,
) =>
  apiRequest<void>(`grants/${id}/disbursements`, {
    method: "POST",
    body: payload,
  });

export const updateGrantDisbursement = async (
  id: string,
  disbursementId: string,
  payload: GrantDisbursementUpdatePayload,
) =>
  apiRequest<void>(`grants/${id}/disbursements/${disbursementId}`, {
    method: "PUT",
    body: payload,
  });

export const createGrantFundsUsage = async (
  id: string,
  payload: GrantFundsUsagePayload,
) =>
  apiRequest<void>(`grants/${id}/funds-usage`, {
    method: "POST",
    body: payload,
  });

export const updateGrantFundsUsage = async (
  id: string,
  usageId: string,
  payload: GrantFundsUsageUpdatePayload,
) =>
  apiRequest<void>(`grants/${id}/funds-usage/${usageId}`, {
    method: "PUT",
    body: payload,
  });

export const createGrant = async (payload: GrantPayload): Promise<Grant> => {
  const response = await apiRequest<GrantDto>("grants", {
    method: "POST",
    body: payload,
  });

  return mapGrant(response);
};

export const updateGrant = async (
  id: string,
  payload: GrantPayload,
): Promise<Grant> => {
  const response = await apiRequest<GrantDto>(`grants/${id}`, {
    method: "PUT",
    body: payload,
  });

  return mapGrant(response);
};

export const updateGrantMilestones = async (
  id: string,
  payload: GrantMilestoneUpdatePayload,
): Promise<Grant> => {
  const response = await apiRequest<GrantDto>(`grants/${id}/milestones`, {
    method: "PUT",
    body: payload,
  });

  return mapGrant(response);
};

export const useGrantsQuery = (params: GrantQueryParams = {}) =>
  useQuery({
    queryKey: queryKeys.grants(params),
    queryFn: () => fetchGrants(params),
  });

export const useGrantQuery = (id: string) =>
  useQuery({
    queryKey: queryKeys.grantById(id),
    queryFn: () => fetchGrantById(id),
    enabled: Boolean(id),
  });

export const useGrantMilestonesQuery = (id: string) =>
  useQuery({
    queryKey: queryKeys.grantMilestones(id),
    queryFn: () => fetchGrantMilestones(id),
    enabled: Boolean(id),
  });

export const useGrantDisbursementsQuery = (id: string) =>
  useQuery({
    queryKey: queryKeys.grantDisbursements(id),
    queryFn: () => fetchGrantDisbursements(id),
    enabled: Boolean(id),
  });

export const useGrantFundsUsageQuery = (id: string) =>
  useQuery({
    queryKey: queryKeys.grantFundsUsage(id),
    queryFn: () => fetchGrantFundsUsage(id),
    enabled: Boolean(id),
  });

export const useCreateGrantMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGrant,
    onSuccess: (grant) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.grants() });
      void queryClient.setQueryData(queryKeys.grantById(grant.id), grant);
    },
  });
};

export const useUpdateGrantMutation = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: GrantPayload) => updateGrant(id, payload),
    onSuccess: (grant) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.grantById(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.grants() });
      void queryClient.setQueryData(queryKeys.grantById(grant.id), grant);
    },
  });
};

export const useUpdateGrantMilestonesMutation = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: GrantMilestoneUpdatePayload) =>
      updateGrantMilestones(id, payload),
    onSuccess: (grant) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.grantById(id) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.grantMilestones(id),
      });
      void queryClient.setQueryData(queryKeys.grantById(grant.id), grant);
    },
  });
};

export const useCreateGrantDisbursementMutation = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: GrantDisbursementCreatePayload) =>
      createGrantDisbursement(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.grantById(id) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.grantDisbursements(id),
      });
    },
  });
};

export const useUpdateGrantDisbursementMutation = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      disbursementId,
      payload,
    }: {
      disbursementId: string;
      payload: GrantDisbursementUpdatePayload;
    }) => updateGrantDisbursement(id, disbursementId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.grantById(id) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.grantDisbursements(id),
      });
    },
  });
};

export const useCreateGrantFundsUsageMutation = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: GrantFundsUsagePayload) =>
      createGrantFundsUsage(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.grantById(id) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.grantFundsUsage(id),
      });
    },
  });
};

export const useUpdateGrantFundsUsageMutation = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      usageId,
      payload,
    }: {
      usageId: string;
      payload: GrantFundsUsageUpdatePayload;
    }) => updateGrantFundsUsage(id, usageId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.grantById(id) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.grantFundsUsage(id),
      });
    },
  });
};
