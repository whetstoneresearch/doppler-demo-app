import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  address,
  getTransactionDecoder,
  getTransactionEncoder,
  type TransactionSigner,
} from '@solana/kit'
import type { Wallet, WalletAccount } from '@wallet-standard/base'
import { getWallets } from '@wallet-standard/app'
import { SolanaSignTransaction } from '@solana/wallet-standard-features'
import { SOLANA_CHAIN } from './config'
import {
  SolanaWalletContext,
  type SolanaStandardWallet,
  type SolanaWalletContextValue,
} from './wallet-context'

function supportsSolanaChain(chains: readonly string[]): boolean {
  return chains.some((chain) => chain.startsWith('solana:'))
}

function isSolanaWallet(wallet: Wallet): wallet is SolanaStandardWallet {
  return (
    supportsSolanaChain(wallet.chains) &&
    'standard:connect' in wallet.features &&
    SolanaSignTransaction in wallet.features
  )
}

function getSolanaWallets(): SolanaStandardWallet[] {
  if (typeof window === 'undefined') return []
  return getWallets().get().filter(isSolanaWallet)
}

function createTransactionSigner(
  wallet: SolanaStandardWallet,
  account: WalletAccount,
): TransactionSigner {
  const signingChain = account.chains.includes(SOLANA_CHAIN)
    ? SOLANA_CHAIN
    : account.chains.find((chain) => chain.startsWith('solana:'))

  return {
    address: address(account.address),
    signTransactions: async (transactions) => {
      const encoder = getTransactionEncoder()
      const decoder = getTransactionDecoder()

      return Promise.all(
        transactions.map(async (transaction) => {
          const [signed] = await wallet.features[SolanaSignTransaction].signTransaction({
            account,
            chain: signingChain,
            transaction: new Uint8Array(encoder.encode(transaction)),
          })
          if (!signed) {
            throw new Error('Wallet did not return a signed transaction')
          }

          const decoded = decoder.decode(signed.signedTransaction)
          const signature = decoded.signatures[address(account.address)]
          if (!signature) {
            throw new Error('Wallet did not sign with the connected account')
          }

          return { [account.address]: signature }
        }),
      )
    },
  }
}

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<readonly SolanaStandardWallet[]>([])
  const [wallet, setWallet] = useState<SolanaStandardWallet | null>(null)
  const [account, setAccount] = useState<WalletAccount | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setWallets(getSolanaWallets())

    const walletsApi = getWallets()
    const refreshWallets = () => setWallets(getSolanaWallets())
    const offRegister = walletsApi.on('register', refreshWallets)
    const offUnregister = walletsApi.on('unregister', refreshWallets)

    return () => {
      offRegister()
      offUnregister()
    }
  }, [])

  const connect = useCallback(
    async (nextWallet?: SolanaStandardWallet) => {
      const selectedWallet = nextWallet ?? wallet ?? (wallets.length > 0 ? wallets[0] : null)
      if (!selectedWallet) {
        setError(new Error('No Solana wallet found'))
        return
      }

      setConnecting(true)
      setError(null)
      try {
        const result = await selectedWallet.features['standard:connect'].connect()
        const connectedAccount = result.accounts.find((candidate) =>
          supportsSolanaChain(candidate.chains),
        )

        if (!connectedAccount) {
          throw new Error('Connected wallet does not expose a Solana account')
        }

        setWallet(selectedWallet)
        setAccount(connectedAccount)
      } catch (caught) {
        const nextError =
          caught instanceof Error ? caught : new Error('Failed to connect Solana wallet')
        setError(nextError)
      } finally {
        setConnecting(false)
      }
    },
    [wallet, wallets],
  )

  const disconnect = useCallback(async () => {
    const disconnectFeature = wallet?.features['standard:disconnect']
    if (disconnectFeature) {
      await disconnectFeature.disconnect()
    }
    setWallet(null)
    setAccount(null)
  }, [wallet])

  const signer = useMemo(() => {
    if (!wallet || !account) return null
    return createTransactionSigner(wallet, account)
  }, [wallet, account])

  const value = useMemo<SolanaWalletContextValue>(
    () => ({
      wallet,
      account,
      wallets,
      connected: Boolean(wallet && account),
      connecting,
      error,
      connect,
      disconnect,
      signer,
    }),
    [account, connect, connecting, disconnect, error, signer, wallet, wallets],
  )

  return (
    <SolanaWalletContext.Provider value={value}>{children}</SolanaWalletContext.Provider>
  )
}
