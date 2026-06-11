export const SOLANA_API_LAUNCH_PATH = '/v1/solana/launches'

export interface SolanaApiLaunchRequest {
  network: 'devnet'
  tokenMetadata: {
    name: string
    symbol: string
    tokenURI?: string
  }
  economics: {
    totalSupply: string
  }
  pairing?: {
    numeraireAddress?: string
  }
  pricing?: {
    numerairePriceUsd?: number
  }
  governance: false
  migration: {
    type: 'none'
  }
  auction: {
    type: 'xyk'
    curveConfig: {
      type: 'range'
      marketCapStartUsd: number
      marketCapEndUsd: number
    }
    swapFeeBps: number
    allowBuy: boolean
    allowSell: boolean
  }
}

export interface SolanaApiLaunchResponse {
  launchId?: string
  launchAddress?: string
  baseMint?: string
  quoteMint?: string
  txHash?: string
  statusUrl?: string
  status?: string
  effectiveConfig?: Record<string, unknown>
}

export interface SolanaApiErrorResponse {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
  message?: string
}
