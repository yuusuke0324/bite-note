/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_E2E_TEST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
