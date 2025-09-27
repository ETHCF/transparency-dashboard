/// <reference types="vite/client" />
/// <reference types="react/jsx-runtime" />

interface Window {
  __APP_CONFIG__?: Partial<import("./types/config").AppRuntimeConfig>;
}
