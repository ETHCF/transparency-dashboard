import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/services/api-client";
import { mapTreasuryResponse, mapTreasuryWallets } from "@/services/mappers";
import { queryKeys } from "@/services/query-keys";
import type {
  TreasuryResponseDto,
  TreasuryWalletDto,
  TreasuryWalletPayload,
  TreasuryAssetPayload,
} from "@/types/api";
import type { TreasuryOverview, TreasuryWallet } from "@/types/domain";

export const fetchTreasury = async (): Promise<TreasuryOverview> => {
  const response = await apiRequest<TreasuryResponseDto>("treasury");
  return mapTreasuryResponse(response);
};

type TreasuryWalletResponse =
  | TreasuryWalletDto[]
  | {
      data?: TreasuryWalletDto[] | null;
    };

export const fetchTreasuryWallets = async (): Promise<TreasuryWallet[]> => {
  const response = await apiRequest<TreasuryWalletResponse>("treasury/wallets");

  if (Array.isArray(response)) {
    return mapTreasuryWallets(response);
  }

  return mapTreasuryWallets(response.data);
};

export const addTreasuryWallet = async (
  payload: TreasuryWalletPayload,
): Promise<TreasuryWallet> => {
  const response = await apiRequest<TreasuryWalletDto>("treasury/wallets", {
    method: "POST",
    body: payload,
  });

  return mapTreasuryWallets([response])[0];
};

export const deleteTreasuryWallet = async (address: string) =>
  apiRequest<void>(`treasury/wallets/${address}`, {
    method: "DELETE",
  });

export const addTreasuryAsset = (payload: TreasuryAssetPayload) =>
  apiRequest<void>("treasury/assets", {
    method: "POST",
    body: payload,
  });

export const useTreasuryQuery = () =>
  useQuery({
    queryKey: queryKeys.treasury(),
    queryFn: fetchTreasury,
    staleTime: 60_000,
  });

export const useTreasuryWalletsQuery = () =>
  useQuery({
    queryKey: queryKeys.treasuryWallets(),
    queryFn: fetchTreasuryWallets,
  });

export const useAddTreasuryWalletMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addTreasuryWallet,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.treasury() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.treasuryWallets() });
    },
  });
};

export const useDeleteTreasuryWalletMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTreasuryWallet,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.treasury() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.treasuryWallets() });
    },
  });
};

export const useAddTreasuryAssetMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addTreasuryAsset,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.treasury() });
    },
  });
};
