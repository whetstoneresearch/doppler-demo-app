// Endpoint constant — single source of truth
export const DOPPLER_API_LAUNCH_PATH = '/v1/launches'

export interface DopplerApiTokenMetadata {
  name: string
  symbol: string
  tokenURI?: string
}

export interface DopplerApiEconomics {
  totalSupply: string // bigint as decimal string (wei)
  tokensForSale?: string
}

export interface DopplerApiMigration {
  type: 'noOp' | 'uniswapV2' | 'uniswapV4'
}

// Auction configs — union by type
export interface DopplerApiAuctionMulticurve {
  type: 'multicurve'
  curveConfig: {
    type: 'preset'
    presets: ('low' | 'medium' | 'high')[]
  }
  initializer?: {
    type: 'standard' | 'scheduled' | 'decay' | 'rehype'
    startTime?: number
  }
}

export interface DopplerApiAuctionStatic {
  type: 'static'
  curveConfig:
    | { type: 'preset'; preset: 'low' | 'medium' | 'high' }
    | { type: 'range'; marketCapStartUsd: number; marketCapEndUsd: number }
}

export interface DopplerApiAuctionDynamic {
  type: 'dynamic'
  curveConfig: {
    type: 'range'
    marketCapStartUsd: number
    marketCapMinUsd: number
    minProceeds: string
    maxProceeds: string
    durationSeconds?: number
  }
}

export type DopplerApiAuction =
  | DopplerApiAuctionMulticurve
  | DopplerApiAuctionStatic
  | DopplerApiAuctionDynamic

export interface DopplerApiRequestBody {
  chainId: number
  userAddress: string
  integrationAddress?: string
  tokenMetadata: DopplerApiTokenMetadata
  economics: DopplerApiEconomics
  migration: DopplerApiMigration
  auction: DopplerApiAuction
  governance?: {
    enabled: boolean
    mode?: 'noOp'
  }
  pricing?: {
    numerairePriceUsd?: number
  }
}

// Success response
export interface DopplerApiLaunchResponse {
  launchId: string
  chainId: number
  txHash: string
  statusUrl: string
  predicted?: {
    tokenAddress?: string
    poolId?: string
    gasEstimate?: string
  }
  effectiveConfig?: Record<string, unknown>
}

// Error response
export interface DopplerApiErrorResponse {
  error: {
    code: string
    message: string
    details?: unknown
  }
}
