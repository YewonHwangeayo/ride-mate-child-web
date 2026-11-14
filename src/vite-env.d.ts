/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_KAKAO_MAP_APP_KEY: string;
  readonly VITE_CHILD_LOGIN_PREVIEW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
