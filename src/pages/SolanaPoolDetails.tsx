import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useSolanaPool } from '@/hooks/useSolanaMarkets'
import {
  formatSolanaAmount,
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

export default function SolanaPoolDetails() {
  const { address } = useParams()
  const { data, isLoading, error } = useSolanaPool(address)

  if (isLoading) {
    return <div className="p-8 text-2xl font-semibold text-primary">Loading CPMM pool...</div>
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <h1 className="mb-4 text-4xl font-bold text-primary">Pool Not Found</h1>
        <div className="text-red-500">{(error as Error | undefined)?.message ?? 'Unknown error'}</div>
      </div>
    )
  }

  const pool = data.account

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-primary">Solana CPMM Pool</h1>
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
        <Detail label="Config" value={pool.config} />
        <Detail label="Token 0 Mint" value={pool.token0Mint} />
        <Detail label="Token 1 Mint" value={pool.token1Mint} />
        <Detail label="Vault 0" value={pool.vault0} />
        <Detail label="Vault 1" value={pool.vault1} />
        <Detail label="Authority" value={pool.authority} />
        <Detail label="Reserve 0" value={formatSolanaAmount(pool.reserve0)} />
        <Detail label="Reserve 1" value={formatSolanaAmount(pool.reserve1)} />
        <Detail label="Total Shares" value={formatSolanaAmount(pool.totalShares)} />
        <Detail label="Swap Fee" value={`${pool.swapFeeBps} bps`} />
        <Detail label="Fee Split" value={`${pool.feeSplitBps} bps`} />
        <Detail label="Hook Program" value={pool.hookProgram} />
      </div>
    </div>
  )
}
