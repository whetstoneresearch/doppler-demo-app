import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAccount, useBalance, useConnect, useDisconnect } from 'wagmi'
import { Link, useLocation, useSearchParams } from "react-router-dom"
import { useSolanaWallet } from "@/lib/solana/wallet-context"
import { shortSolanaAddress } from "@/lib/solana/config"

export function Navbar() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const solanaWallet = useSolanaWallet()
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const chainIdParam = searchParams.get('chainId')
  const isPoolPage = location.pathname.startsWith('/pool/')
  const targetChainId = chainIdParam ? Number(chainIdParam) : (isPoolPage ? 84532 : undefined)
  const { data: balance } = useBalance({
    address: address,
  })

  const truncateAddress = (addr: string) => {
    return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''
  }

  const connectEvmWallet = () => {
    const injectedConnector = connectors.find(c => c.id === 'injected') ?? connectors[0]
    if (!injectedConnector) return

    if (targetChainId) {
      connect({ connector: injectedConnector, chainId: targetChainId })
    } else {
      connect({ connector: injectedConnector })
    }
  }

  const walletButtonLabel = isConnected || solanaWallet.connected
    ? 'Wallets'
    : 'Connect Wallet'

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container py-3 px-4 mx-auto">
        <div className="flex flex-col gap-3 max-w-7xl mx-auto lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-lg font-bold bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 bg-clip-text text-transparent">
                Doppler Pools
              </span>
            </Link>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              EVM
            </Link>
            <Link to="/solana" className="text-sm text-muted-foreground hover:text-foreground">
              Solana
            </Link>
            <Link to="/create" className="text-sm text-muted-foreground hover:text-foreground">
              Create
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isConnected && address && (
              <div className="hidden h-9 items-center justify-center rounded-md border bg-muted/50 px-4 text-sm text-muted-foreground sm:flex">
                <span className="text-primary">
                  {balance?.formatted ? Number(balance.formatted).toFixed(4) : '0.0000'} ETH
                </span>
              </div>
            )}
            {solanaWallet.connected && solanaWallet.account && (
              <div className="hidden h-9 items-center justify-center rounded-md border bg-muted/50 px-4 text-sm text-muted-foreground sm:flex">
                SOL {shortSolanaAddress(solanaWallet.account.address)}
              </div>
            )}
            <Button
              onClick={() => setWalletModalOpen(true)}
              variant="outline"
              className="relative overflow-hidden group"
            >
              <span className="relative z-10">{walletButtonLabel}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-purple-500/20 group-hover:opacity-100 opacity-0 transition-opacity duration-300" />
            </Button>
          </div>
        </div>
      </div>

      {walletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-20 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Wallets</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage EVM and Solana wallet connections.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setWalletModalOpen(false)}>
                Close
              </Button>
            </div>

            <Tabs defaultValue="evm">
              <TabsList className="mb-5 grid w-full grid-cols-2">
                <TabsTrigger value="evm">EVM</TabsTrigger>
                <TabsTrigger value="solana">Solana</TabsTrigger>
              </TabsList>
              <TabsContent value="evm" className="space-y-4">
                {isConnected && address ? (
                  <>
                    <div className="rounded-md border bg-muted/30 p-4">
                      <p className="text-sm text-muted-foreground">Connected account</p>
                      <p className="mt-1 font-mono text-sm">{truncateAddress(address)}</p>
                      <p className="mt-2 text-sm text-primary">
                        {balance?.formatted ? Number(balance.formatted).toFixed(4) : '0.0000'} ETH
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => disconnect()}>
                      Disconnect EVM
                    </Button>
                  </>
                ) : (
                  <Button onClick={connectEvmWallet}>Connect EVM Wallet</Button>
                )}
              </TabsContent>
              <TabsContent value="solana" className="space-y-4">
                {solanaWallet.connected && solanaWallet.account ? (
                  <>
                    <div className="rounded-md border bg-muted/30 p-4">
                      <p className="text-sm text-muted-foreground">Connected account</p>
                      <p className="mt-1 break-all font-mono text-sm">{solanaWallet.account.address}</p>
                    </div>
                    <Button variant="outline" onClick={() => void solanaWallet.disconnect()}>
                      Disconnect Solana
                    </Button>
                  </>
                ) : (
                  <>
                    {solanaWallet.wallets.length === 0 && (
                      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                        No Wallet Standard Solana wallet was detected.
                      </div>
                    )}
                    <Button
                      onClick={() => void solanaWallet.connect()}
                      disabled={solanaWallet.connecting || solanaWallet.wallets.length === 0}
                    >
                      {solanaWallet.connecting ? 'Connecting...' : 'Connect Solana Wallet'}
                    </Button>
                  </>
                )}
                {solanaWallet.error && (
                  <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
                    {solanaWallet.error.message}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </nav>
  )
}
