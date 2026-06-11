import { SOLANA_INDEXER_URL } from '@/lib/solana/config'

export interface SolanaIndexerPool {
  address?: string
  poolAddress?: string
  baseMint?: string
  quoteMint?: string
  token0Mint?: string
  token1Mint?: string
  volumeUsd24h?: number
  liquidityUsd?: number
  createdAt?: string
}

type IndexerListResponse = SolanaIndexerPool[] | { data?: SolanaIndexerPool[]; items?: SolanaIndexerPool[] }

function unwrapIndexerList(response: IndexerListResponse): SolanaIndexerPool[] {
  if (Array.isArray(response)) return response
  return response.data ?? response.items ?? []
}

export async function fetchSolanaIndexerPools(): Promise<SolanaIndexerPool[]> {
  if (!SOLANA_INDEXER_URL) return []

  const response = await fetch(`${SOLANA_INDEXER_URL}/v1/pools/new?limit=25&type=cpmm`)
  if (!response.ok) {
    throw new Error(`Failed to fetch Solana indexer pools: ${response.status}`)
  }

  return unwrapIndexerList((await response.json()) as IndexerListResponse)
}
