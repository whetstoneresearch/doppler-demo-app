import { Button } from "@/components/ui/button"
import { useAccount, useBalance, useConnect, useDisconnect } from 'wagmi'
import { Link, useLocation, useSearchParams } from "react-router-dom"
import { useSolanaWallet } from "@/lib/solana/wallet-context"
import { shortSolanaAddress } from "@/lib/solana/config"

export function Navbar() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const solanaWallet = useSolanaWallet()
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
              Create EVM
            </Link>
            <Link to="/solana/create" className="text-sm text-muted-foreground hover:text-foreground">
              Create Solana
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3">
          {isConnected && address ? (
            <div className="flex items-center gap-3">
              <div className="flex h-9 items-center justify-center rounded-md border bg-muted/50 px-4 text-sm text-muted-foreground">
                <span className="text-primary">
                  {balance?.formatted ? Number(balance.formatted).toFixed(4) : '0.0000'} ETH
                </span>
              </div>
              <div className="flex h-9 items-center justify-center rounded-md border bg-muted/50 px-4 text-sm text-muted-foreground">
                {truncateAddress(address)}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => disconnect()}
                className="h-9"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button 
              onClick={() => {
                // Prefer the injected connector from wagmi's list
                const injectedConnector = connectors.find(c => c.id === 'injected') ?? connectors[0]
                if (targetChainId) {
                  connect({ connector: injectedConnector, chainId: targetChainId })
                } else {
                  connect({ connector: injectedConnector })
                }
              }}
              variant="outline"
              className="relative overflow-hidden group"
            >
              <span className="relative z-10">Connect Wallet</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-purple-500/20 group-hover:opacity-100 opacity-0 transition-opacity duration-300" />
            </Button>
          )}
          {solanaWallet.connected && solanaWallet.account ? (
            <div className="flex items-center gap-3">
              <div className="flex h-9 items-center justify-center rounded-md border bg-muted/50 px-4 text-sm text-muted-foreground">
                SOL {shortSolanaAddress(solanaWallet.account.address)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void solanaWallet.disconnect()}
                className="h-9"
              >
                Disconnect SOL
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => void solanaWallet.connect()}
              disabled={solanaWallet.connecting}
            >
              {solanaWallet.connecting ? 'Connecting SOL...' : 'Connect SOL'}
            </Button>
          )}
          </div>
        </div>
      </div>
    </nav>
  )
}
