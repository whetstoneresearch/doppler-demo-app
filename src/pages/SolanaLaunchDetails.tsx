import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useSolanaLaunch } from '@/hooks/useSolanaMarkets'
import {
  formatSolanaAmount,
  shortSolanaAddress,
  solanaExplorerAddress,
} from '@/lib/solana/config'

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 break-all font-mono text-sm">{value}</p>
    </div>
  )
}

export default function SolanaLaunchDetails() {
  const { address } = useParams()
  const { data, isLoading, error } = useSolanaLaunch(address)

  if (isLoading) {
    return <div className="p-8 text-2xl font-semibold text-primary">Loading Solana launch...</div>
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <h1 className="mb-4 text-4xl font-bold text-primary">Launch Not Found</h1>
        <div className="text-red-500">{(error as Error | undefined)?.message ?? 'Unknown error'}</div>
      </div>
    )
  }

  const launch = data.account

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-primary">Solana Launch</h1>
          <p className="mt-2 break-all text-muted-foreground">{data.address}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link to="/solana">Back to Markets</Link>
          </Button>
          <Button asChild variant="outline">
            <a href={solanaExplorerAddress(data.address)} target="_blank" rel="noreferrer">
              Explorer
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Detail label="Phase" value={launch.phase.toString()} />
        <Detail label="Authority" value={shortSolanaAddress(launch.authority)} />
        <Detail label="Base Mint" value={launch.baseMint} />
        <Detail label="Quote Mint" value={launch.quoteMint} />
        <Detail label="Base Vault" value={launch.baseVault} />
        <Detail label="Quote Vault" value={launch.quoteVault} />
        <Detail label="Base Total Supply" value={formatSolanaAmount(launch.baseTotalSupply)} />
        <Detail label="Base For Curve" value={formatSolanaAmount(launch.baseForCurve)} />
        <Detail label="Quote Deposited" value={formatSolanaAmount(launch.quoteDeposited)} />
        <Detail label="Virtual Base" value={formatSolanaAmount(launch.curveVirtualBase)} />
        <Detail label="Virtual Quote" value={formatSolanaAmount(launch.curveVirtualQuote)} />
        <Detail label="Swap Fee" value={`${launch.swapFeeBps} bps`} />
        <Detail label="Allow Buy" value={launch.allowBuy ? 'yes' : 'no'} />
        <Detail label="Allow Sell" value={launch.allowSell ? 'yes' : 'no'} />
        <Detail label="Hook Program" value={launch.hookProgram} />
      </div>
    </div>
  )
}
