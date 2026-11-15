/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "mock" builds the in-memory demo API; any other value (or none) uses the live back-office. */
  readonly VITE_API_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
