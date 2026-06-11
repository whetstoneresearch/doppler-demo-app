import { parseSolanaAmount } from '@/lib/solana/config'
import {
  SOLANA_API_LAUNCH_PATH,
  type SolanaApiErrorResponse,
  type SolanaApiLaunchRequest,
  type SolanaApiLaunchResponse,
} from '@/types/solana-api'
import { buildDopplerApiHeaders } from './doppler-api-helpers'

export interface SolanaCreateLaunchForm {
  tokenName: string
  tokenSymbol: string
  tokenURI: string
  totalSupply: string
  marketCapStartUsd: string
  marketCapEndUsd: string
  numerairePriceUsd: string
  swapFeeBps: string
  allowBuy: boolean
  allowSell: boolean
}

function parsePositiveNumber(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function buildSolanaLaunchPayload(
  form: SolanaCreateLaunchForm,
): SolanaApiLaunchRequest {
  const totalSupply = parseSolanaAmount(form.totalSupply).toString()

  return {
    network: 'devnet',
    tokenMetadata: {
      name: form.tokenName.trim(),
      symbol: form.tokenSymbol.trim(),
      tokenURI: form.tokenURI.trim() || undefined,
    },
    economics: {
      totalSupply,
    },
    pricing: {
      numerairePriceUsd: parsePositiveNumber(form.numerairePriceUsd, 150),
    },
    governance: false,
    migration: {
      type: 'none',
    },
    auction: {
      type: 'xyk',
      curveConfig: {
        type: 'range',
        marketCapStartUsd: parsePositiveNumber(form.marketCapStartUsd, 50_000),
        marketCapEndUsd: parsePositiveNumber(form.marketCapEndUsd, 5_000_000),
      },
      swapFeeBps: Math.max(0, Math.min(10_000, Number(form.swapFeeBps) || 30)),
      allowBuy: form.allowBuy,
      allowSell: form.allowSell,
    },
  }
}

export async function submitSolanaLaunch(
  payload: SolanaApiLaunchRequest,
): Promise<SolanaApiLaunchResponse> {
  const apiUrl = import.meta.env.VITE_DOPPLER_API_URL?.replace(/\/$/, '')
  const apiKey = import.meta.env.VITE_DOPPLER_API_KEY

  if (!apiUrl || !apiKey) {
    throw new Error(
      'API URL or API key is not configured. Set VITE_DOPPLER_API_URL and VITE_DOPPLER_API_KEY.',
    )
  }

  const response = await fetch(`${apiUrl}${SOLANA_API_LAUNCH_PATH}`, {
    method: 'POST',
    headers: buildDopplerApiHeaders(apiKey),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as SolanaApiErrorResponse | null
    throw new Error(
      errorBody?.error?.message ?? errorBody?.message ?? `Solana launch failed: ${response.status}`,
    )
  }

  return (await response.json()) as SolanaApiLaunchResponse
}

export async function fetchSolanaLaunchStatus(
  launchAddress: string,
): Promise<SolanaApiLaunchResponse> {
  const apiUrl = import.meta.env.VITE_DOPPLER_API_URL?.replace(/\/$/, '')
  const apiKey = import.meta.env.VITE_DOPPLER_API_KEY

  if (!apiUrl || !apiKey) {
    throw new Error('Doppler API is not configured')
  }

  const response = await fetch(`${apiUrl}${SOLANA_API_LAUNCH_PATH}/${launchAddress}`, {
    headers: {
      'x-api-key': apiKey,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Solana launch status: ${response.status}`)
  }

  return (await response.json()) as SolanaApiLaunchResponse
}
