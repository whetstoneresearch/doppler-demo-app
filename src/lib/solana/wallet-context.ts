import { createContext, useContext } from 'react'
import type { Wallet, WalletAccount } from '@wallet-standard/base'
import type {
  StandardConnectFeature,
  StandardDisconnectFeature,
} from '@wallet-standard/features'
import type {
  SolanaSignTransactionFeature,
} from '@solana/wallet-standard-features'
import type { TransactionSigner } from '@solana/kit'

export type SolanaStandardWallet = Wallet & {
  features: StandardConnectFeature &
    Partial<StandardDisconnectFeature> &
    SolanaSignTransactionFeature
}

export type SolanaWalletContextValue = {
  wallet: SolanaStandardWallet | null
  account: WalletAccount | null
  wallets: readonly SolanaStandardWallet[]
  connected: boolean
  connecting: boolean
  error: Error | null
  connect: (wallet?: SolanaStandardWallet) => Promise<void>
  disconnect: () => Promise<void>
  signer: TransactionSigner | null
}

export const SolanaWalletContext = createContext<SolanaWalletContextValue | null>(null)

export function useSolanaWallet(): SolanaWalletContextValue {
  const context = useContext(SolanaWalletContext)
  if (!context) {
    throw new Error('useSolanaWallet must be used within SolanaWalletProvider')
  }
  return context
}
