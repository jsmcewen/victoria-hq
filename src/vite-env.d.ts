/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_ENABLED?: string;
  readonly VITE_SELF_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
