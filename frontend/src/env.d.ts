/// <reference types="vite/client" />

interface Window {
  __APP_CONFIG__?: Partial<import("./types/config").AppRuntimeConfig>;
}
