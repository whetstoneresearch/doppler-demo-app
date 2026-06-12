import {
  address,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  type Address,
} from '@solana/kit'
import { deriveSolanaCpmmDeployment } from '@whetstone-research/doppler-sdk/solana'

export const SOLANA_CHAIN = 'solana:devnet'
export const SOLANA_NETWORK = 'devnet'
export const SOLANA_TOKEN_DECIMALS = 6
export const SOLANA_DEFAULT_SLIPPAGE_BPS = 50
export const WSOL_MINT = address('So11111111111111111111111111111111111111112')

export const SOLANA_RPC_URL =
  import.meta.env.VITE_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'

export const SOLANA_RPC_SUBSCRIPTIONS_URL = SOLANA_RPC_URL.replace(/^http/, 'ws')

export const SOLANA_INDEXER_URL = (
  import.meta.env.VITE_SOLANA_INDEXER_URL ?? ''
).replace(/\/$/, '')

export const solanaRpc = createSolanaRpc(SOLANA_RPC_URL)
export const solanaRpcSubscriptions = createSolanaRpcSubscriptions(
  SOLANA_RPC_SUBSCRIPTIONS_URL,
)

export const solanaDeploymentPromise = deriveSolanaCpmmDeployment()

export function parseSolanaAmount(value: string, decimals = SOLANA_TOKEN_DECIMALS): bigint {
  const trimmed = value.trim()
  if (!trimmed) return 0n
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('Amount must be a positive number')
  }

  const [whole, fraction = ''] = trimmed.split('.')
  if (fraction.length > decimals) {
    throw new Error(`Amount supports at most ${decimals} decimal places`)
  }

  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0'))
}

export function formatSolanaAmount(value: bigint, decimals = SOLANA_TOKEN_DECIMALS): string {
  const scale = 10n ** BigInt(decimals)
  const whole = value / scale
  const fraction = value % scale
  const fractionText = fraction.toString().padStart(decimals, '0').replace(/0+$/, '')

  return fractionText ? `${whole}.${fractionText}` : whole.toString()
}

export function shortSolanaAddress(value: string): string {
  return value.length > 12 ? `${value.slice(0, 4)}...${value.slice(-4)}` : value
}

export function toSolanaAddress(value: string): Address {
  try {
    return address(value)
  } catch {
    throw new Error('Invalid Solana address')
  }
}

export function solanaExplorerTx(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`
}

export function solanaExplorerAddress(value: string): string {
  return `https://explorer.solana.com/address/${value}?cluster=devnet`
}
