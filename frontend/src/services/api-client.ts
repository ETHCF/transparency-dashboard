import { resolveRuntimeConfig } from "@/config/runtime";
import type { AppRuntimeConfig } from "@/types/config";
import { getAuthToken } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  isFormData?: boolean;
  skipAuth?: boolean;
}

export interface ApiResponseErrorPayload {
  message: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
}

export class ApiError extends Error {
  status: number;
  payload?: ApiResponseErrorPayload;

  constructor(
    status: number,
    message: string,
    payload?: ApiResponseErrorPayload,
  ) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

const buildUrl = (
  config: AppRuntimeConfig,
  path: string,
  query?: ApiRequestOptions["query"],
) => {
  const joined = [
    config.apiBaseUrl.replace(/\/$/, ""),
    path.replace(/^\//, ""),
  ];
  const url = new URL(joined.join("/"), window.location.origin);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
};

const ensureHeaders = (init?: HeadersInit): Headers => {
  if (init instanceof Headers) {
    return init;
  }

  return new Headers(init);
};

const LOGIN_REQUIRED_TOAST_ID = "login-required";

const showLoginRequiredToast = () => {
  const uiState = useUiStore.getState();

  const alreadyVisible = uiState.toasts.some(
    (toast) => toast.id === LOGIN_REQUIRED_TOAST_ID,
  );

  if (alreadyVisible) {
    return;
  }

  uiState.addToast({
    id: LOGIN_REQUIRED_TOAST_ID,
    title: "Session expired",
    description: "Please log in to continue.",
    variant: "error",
    duration: 0,
    action: {
      label: "Log in",
      to: "/login",
    },
  });
};

export const apiRequest = async <TResponse>(
  path: string,
  options: ApiRequestOptions = {},
) => {
  const config = resolveRuntimeConfig();
  const url = buildUrl(config, path, options.query);
  const headers = ensureHeaders(options.headers);

  if (!options.isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (!options.skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body
      ? options.isFormData
        ? (options.body as FormData)
        : JSON.stringify(options.body)
      : undefined,
  });

  const isJson = response.headers
    .get("Content-Type")
    ?.includes("application/json");

  if (!response.ok) {
    if (response.status === 403) {
      showLoginRequiredToast();
    }

    let payload: ApiResponseErrorPayload | undefined;

    if (isJson) {
      payload = (await response.json()) as ApiResponseErrorPayload;
    }

    throw new ApiError(
      response.status,
      payload?.message ?? response.statusText,
      payload,
    );
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  if (!isJson) {
    return (await response.text()) as TResponse;
  }

  return (await response.json()) as TResponse;
};
