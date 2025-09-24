import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/services/api-client";
import { mapTransfer } from "@/services/mappers";
import { queryKeys } from "@/services/query-keys";
import type {
  TransferDto,
  TransferPartyDto,
  TransferPartyPayload,
  TransferPartyUpdatePayload,
} from "@/types/api";
import type { TransferRecord } from "@/types/domain";

export interface TransferQuery {
  limit?: number;
  offset?: number;
}

type TransferListResponse = TransferDto[] | { data?: TransferDto[] | null };

const extractTransfers = (response: TransferListResponse): TransferDto[] => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return [];
};

export const fetchTransfers = async (
  params: TransferQuery = {},
): Promise<TransferRecord[]> => {
  const response = await apiRequest<TransferListResponse>("transfers", {
    query: params,
  });

  return extractTransfers(response).map(mapTransfer);
};

export const fetchTransferById = async (
  id: string,
): Promise<TransferRecord> => {
  const response = await apiRequest<TransferDto>(`transfers/${id}`);
  return mapTransfer(response);
};

export const useTransfersQuery = (params: TransferQuery = {}) =>
  useQuery({
    queryKey: queryKeys.transfers(params),
    queryFn: () => fetchTransfers(params),
  });

export const useTransferQuery = (id: string) =>
  useQuery({
    queryKey: queryKeys.transferById(id),
    queryFn: () => fetchTransferById(id),
    enabled: Boolean(id),
  });

export const fetchTransferParties = async (params: TransferQuery = {}) =>
  apiRequest<TransferPartyDto[]>("transfer-parties", { query: params });

export const useTransferPartiesQuery = (params: TransferQuery = {}) =>
  useQuery({
    queryKey: queryKeys.transferParties(params),
    queryFn: () => fetchTransferParties(params),
  });

export const createTransferParty = async (payload: TransferPartyPayload) =>
  apiRequest<TransferPartyDto>("transfer-parties", {
    method: "POST",
    body: payload,
  });

export const updateTransferParty = async (
  address: string,
  payload: TransferPartyUpdatePayload,
) =>
  apiRequest<TransferPartyDto>(`transfer-parties/${address}`, {
    method: "PUT",
    body: payload,
  });

export const useUpdateTransferPartyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      address,
      payload,
    }: {
      address: string;
      payload: TransferPartyUpdatePayload;
    }) => updateTransferParty(address, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.transferParties(),
      });
    },
  });
};

export const useCreateTransferPartyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransferParty,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.transferParties(),
      });
    },
  });
};
