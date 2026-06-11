import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  buildSolanaLaunchPayload,
  submitSolanaLaunch,
  type SolanaCreateLaunchForm,
} from '@/utils/solana-api'
import type { SolanaApiLaunchResponse } from '@/types/solana-api'
import { solanaExplorerTx } from '@/lib/solana/config'

const defaultForm: SolanaCreateLaunchForm = {
  tokenName: '',
  tokenSymbol: '',
  tokenURI: '',
  totalSupply: '1000000000',
  marketCapStartUsd: '50000',
  marketCapEndUsd: '5000000',
  numerairePriceUsd: '150',
  swapFeeBps: '30',
  allowBuy: true,
  allowSell: true,
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export default function CreateSolanaLaunch() {
  const [form, setForm] = useState<SolanaCreateLaunchForm>(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SolanaApiLaunchResponse | null>(null)

  const updateForm = <Key extends keyof SolanaCreateLaunchForm>(
    key: Key,
    value: SolanaCreateLaunchForm[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setResult(null)

    try {
      if (!form.tokenName.trim() || !form.tokenSymbol.trim()) {
        throw new Error('Token name and symbol are required')
      }
      const payload = buildSolanaLaunchPayload(form)
      const response = await submitSolanaLaunch(payload)
      setResult(response)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to create Solana launch')
    } finally {
      setSubmitting(false)
    }
  }

  const launchAddress = result?.launchAddress ?? result?.launchId

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary">Create Solana Launch</h1>
        <p className="mt-2 text-muted-foreground">Creates a devnet XYK launch through the Doppler API.</p>
      </div>

      {(!import.meta.env.VITE_DOPPLER_API_URL || !import.meta.env.VITE_DOPPLER_API_KEY) && (
        <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm">
          Set <code>VITE_DOPPLER_API_URL</code> and <code>VITE_DOPPLER_API_KEY</code> to submit launches.
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 rounded-lg border bg-card/50 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Token Name" value={form.tokenName} onChange={(value) => updateForm('tokenName', value)} />
          <Field label="Token Symbol" value={form.tokenSymbol} onChange={(value) => updateForm('tokenSymbol', value.toUpperCase())} />
          <Field label="Token URI" value={form.tokenURI} onChange={(value) => updateForm('tokenURI', value)} placeholder="https://..." />
          <Field label="Total Supply" value={form.totalSupply} onChange={(value) => updateForm('totalSupply', value)} type="number" />
          <Field label="SOL Price USD" value={form.numerairePriceUsd} onChange={(value) => updateForm('numerairePriceUsd', value)} type="number" />
          <Field label="Swap Fee Bps" value={form.swapFeeBps} onChange={(value) => updateForm('swapFeeBps', value)} type="number" />
          <Field label="Start Market Cap USD" value={form.marketCapStartUsd} onChange={(value) => updateForm('marketCapStartUsd', value)} type="number" />
          <Field label="End Market Cap USD" value={form.marketCapEndUsd} onChange={(value) => updateForm('marketCapEndUsd', value)} type="number" />
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.allowBuy}
              onChange={(event) => updateForm('allowBuy', event.target.checked)}
            />
            Allow buys
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.allowSell}
              onChange={(event) => updateForm('allowSell', event.target.checked)}
            />
            Allow sells
          </label>
        </div>

        {error && <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</div>}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Launch'}
        </Button>
      </form>

      {result && (
        <div className="mt-6 rounded-lg border bg-card/50 p-6">
          <h2 className="mb-3 text-2xl font-semibold">Launch Submitted</h2>
          <div className="grid gap-2 text-sm">
            {launchAddress && (
              <p>
                Launch: <span className="break-all font-mono">{launchAddress}</span>
              </p>
            )}
            {result.baseMint && (
              <p>
                Base mint: <span className="break-all font-mono">{result.baseMint}</span>
              </p>
            )}
            {result.txHash && (
              <a className="text-primary underline" href={solanaExplorerTx(result.txHash)} target="_blank" rel="noreferrer">
                View transaction
              </a>
            )}
          </div>
          {launchAddress && (
            <Button asChild className="mt-4" variant="secondary">
              <Link to={`/solana/launch/${launchAddress}`}>Open Launch</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
