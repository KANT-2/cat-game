/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_CAT_GAME_API_BASE_URL?: string;
  readonly VITE_CAT_GAME_USER_PUBLIC_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
