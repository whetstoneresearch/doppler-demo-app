/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DOPPLER_API_URL: string
  readonly VITE_DOPPLER_API_KEY: string
  readonly VITE_SOLANA_RPC_URL?: string
  readonly VITE_SOLANA_INDEXER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
