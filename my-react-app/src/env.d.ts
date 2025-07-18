/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PINATA_API_KEY: string
  readonly VITE_PINATA_API_SECRET: string
  readonly VITE_API_URL: string
  readonly VITE_IPFS_GATEWAY: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_ENV: string
  readonly VITE_BACKENED_API: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

