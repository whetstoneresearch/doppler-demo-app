import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSolanaMarkets, type SolanaLaunchListItem, type SolanaPoolListItem } from '@/hooks/useSolanaMarkets'
import {
  formatSolanaAmount,
  shortSolanaAddress,
  solanaExplorerAddress,
} from '@/lib/solana/config'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-medium">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function LaunchCard({ launch }: { launch: SolanaLaunchListItem }) {
  const account = launch.account

  return (
    <div className="rounded-lg border border-primary/20 bg-card/50 p-6 backdrop-blur transition-all hover:border-primary/40">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Launch {shortSolanaAddress(launch.address)}</h2>
          <p className="break-all text-sm text-muted-foreground">{launch.address}</p>
        </div>
        <div className="rounded-md border bg-muted/50 px-3 py-1 text-sm">
          Phase {account.phase}
        </div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Stat label="Base mint" value={shortSolanaAddress(account.baseMint)} />
        <Stat label="Quote mint" value={shortSolanaAddress(account.quoteMint)} />
        <Stat label="Swap fee" value={`${account.swapFeeBps} bps`} />
        <Stat label="Base for curve" value={formatSolanaAmount(account.baseForCurve)} />
        <Stat label="Quote deposited" value={formatSolanaAmount(account.quoteDeposited)} />
        <Stat label="Buy / sell" value={`${account.allowBuy ? 'Buy' : '-'} / ${account.allowSell ? 'Sell' : '-'}`} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <Link to={`/solana/launch/${launch.address}`}>View Launch</Link>
        </Button>
        <Button asChild variant="outline">
          <a href={solanaExplorerAddress(launch.address)} target="_blank" rel="noreferrer">
            Explorer
          </a>
        </Button>
      </div>
    </div>
  )
}

function PoolCard({ pool }: { pool: SolanaPoolListItem }) {
  const account = pool.account

  return (
    <div className="rounded-lg border border-primary/20 bg-card/50 p-6 backdrop-blur transition-all hover:border-primary/40">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Pool {shortSolanaAddress(pool.address)}</h2>
          <p className="break-all text-sm text-muted-foreground">{pool.address}</p>
        </div>
        <div className="rounded-md border bg-muted/50 px-3 py-1 text-sm">
          {account.swapFeeBps} bps
        </div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Stat label="Token 0" value={shortSolanaAddress(account.token0Mint)} />
        <Stat label="Token 1" value={shortSolanaAddress(account.token1Mint)} />
        <Stat label="LP shares" value={formatSolanaAmount(account.totalShares)} />
        <Stat label="Reserve 0" value={formatSolanaAmount(account.reserve0)} />
        <Stat label="Reserve 1" value={formatSolanaAmount(account.reserve1)} />
        <Stat label="Fee split" value={`${account.feeSplitBps} bps`} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <Link to={`/solana/pool/${pool.address}`}>View Pool</Link>
        </Button>
        <Button asChild variant="outline">
          <a href={solanaExplorerAddress(pool.address)} target="_blank" rel="noreferrer">
            Explorer
          </a>
        </Button>
      </div>
    </div>
  )
}

export default function SolanaMarkets() {
  const { data, isLoading, error } = useSolanaMarkets()

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="mb-8 text-4xl font-bold text-primary">Loading Solana Markets...</h1>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="mb-8 text-4xl font-bold text-primary">Error Loading Solana Markets</h1>
        <div className="text-red-500">{(error as Error).message}</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-primary">Solana Markets</h1>
          <p className="mt-2 text-muted-foreground">Devnet launches and CPMM pools from Doppler Solana programs.</p>
        </div>
        <Button asChild>
          <Link to="/solana/create">Create Solana Launch</Link>
        </Button>
      </div>

      <Tabs defaultValue="launches">
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="launches">Launches</TabsTrigger>
          <TabsTrigger value="pools">CPMM Pools</TabsTrigger>
        </TabsList>
        <TabsContent value="launches" className="grid gap-6">
          {data?.launches.length ? (
            data.launches.map((launch) => <LaunchCard key={launch.address} launch={launch} />)
          ) : (
            <div className="rounded-lg border p-6 text-muted-foreground">No Solana launches found.</div>
          )}
        </TabsContent>
        <TabsContent value="pools" className="grid gap-6">
          {data?.pools.length ? (
            data.pools.map((pool) => <PoolCard key={pool.address} pool={pool} />)
          ) : (
            <div className="rounded-lg border p-6 text-muted-foreground">No CPMM pools found.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
