import { apiRequest } from "@/services/api-client";
import { useAuthStore } from "@/stores/auth";
import type { AuthChallengeDto, AuthLoginResponseDto } from "@/types/api";

export const fetchAuthChallenge = (address: string) =>
  apiRequest<AuthChallengeDto>(`auth/challenge/${address}`, { skipAuth: true });

export const submitAuthLogin = async (
  siweMessage: string,
  signature: string,
) => {
  const response = await apiRequest<AuthLoginResponseDto>("auth/login", {
    method: "POST",
    body: { siweMessage, signature },
    skipAuth: true,
  });

  useAuthStore.getState().setToken(response.token);

  return response.token;
};

export const logout = () => useAuthStore.getState().logout();
