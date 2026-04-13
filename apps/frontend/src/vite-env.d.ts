/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CENTRALIZED_CONSOLE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
