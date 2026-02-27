import type { DopplerApiRequestBody } from '../types/doppler-api'

/**
 * Build HTTP headers for a Doppler API request.
 * Generates a fresh Idempotency-Key per call to prevent duplicate submissions.
 */
export function buildDopplerApiHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'Idempotency-Key': crypto.randomUUID(),
  }
}

// Argument types for the payload mapper
export interface DopplerApiPayloadArgs {
  userAddress: string
  chainId: number
  tokenName: string
  tokenSymbol: string
  tokenURI?: string
  totalSupply: string // bigint wei string, e.g. "1000000000000000000000000"
  auctionType: 'static' | 'dynamic' | 'multicurve'
}

/**
 * Map CreatePool form state to a Doppler API request body.
 * Fields not yet captured in the UI use safe documented defaults.
 */
export function buildDopplerApiPayload(args: DopplerApiPayloadArgs): DopplerApiRequestBody {
  const {
    userAddress,
    chainId,
    tokenName,
    tokenSymbol,
    tokenURI,
    totalSupply,
    auctionType,
  } = args

  const base: Omit<DopplerApiRequestBody, 'auction'> = {
    chainId,
    userAddress,
    tokenMetadata: {
      name: tokenName,
      symbol: tokenSymbol,
      tokenURI: tokenURI || undefined,
    },
    economics: {
      totalSupply, // already in wei string form from parseEther
    },
    migration: {
      // Static and multicurve use noOp; dynamic needs migration type but we default noOp
      // (dynamic with noOp will be rejected by API — surface error to user)
      type: auctionType === 'dynamic' ? 'uniswapV2' : 'noOp',
    },
    governance: {
      enabled: false,
      mode: 'noOp',
    },
  }

  let auction: DopplerApiRequestBody['auction']

  if (auctionType === 'multicurve') {
    auction = {
      type: 'multicurve',
      curveConfig: {
        type: 'preset',
        presets: ['low', 'medium', 'high'],
      },
      initializer: {
        type: 'standard',
      },
    }
  } else if (auctionType === 'static') {
    auction = {
      type: 'static',
      curveConfig: {
        type: 'preset',
        preset: 'medium',
      },
    }
  } else {
    // dynamic
    auction = {
      type: 'dynamic',
      curveConfig: {
        type: 'range',
        marketCapStartUsd: 100,
        marketCapMinUsd: 50,
        minProceeds: '0.01',
        maxProceeds: '0.1',
        durationSeconds: 86400,
      },
    }
  }

  return { ...base, auction }
}
