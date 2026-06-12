import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  createSolanaLaunchWithSdk,
  formatBpsAsPercent,
  getSolanaSwapFeeBounds,
  type SolanaSwapFeeBounds,
  type SolanaCreateLaunchForm,
  type SolanaSdkLaunchResult,
} from '@/lib/solana/createLaunch'
import { solanaExplorerTx, WSOL_MINT } from '@/lib/solana/config'
import { useSolanaWallet } from '@/lib/solana/wallet-context'

const defaultForm: SolanaCreateLaunchForm = {
  quoteMint: WSOL_MINT,
  migrateToCpmm: true,
  minimumQuoteRaise: '50',
  tokenName: '',
  tokenSymbol: '',
  tokenURI: '',
  totalSupply: '1000000000',
  baseForDistribution: '0',
  baseForLiquidity: '0',
  marketCapStartUsd: '50000',
  marketCapEndUsd: '5000000',
  numerairePriceUsd: '150',
  swapFeeBps: '0.3',
  allocationRecipients: [],
  feeBeneficiaries: [],
}

const inputClassName =
  'w-full px-4 py-2 rounded-md bg-background/50 border border-input focus:border-primary focus:ring-1 focus:ring-primary'

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  maxLength,
  min,
  max,
  step,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  maxLength?: number
  min?: number
  max?: number
  step?: number | string
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
        maxLength={maxLength}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      />
    </div>
  )
}

interface CreateSolanaLaunchProps {
  embedded?: boolean
}

export default function CreateSolanaLaunch({ embedded = false }: CreateSolanaLaunchProps) {
  const { connected, connecting, connect, signer } = useSolanaWallet()
  const [form, setForm] = useState<SolanaCreateLaunchForm>(defaultForm)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SolanaSdkLaunchResult | null>(null)
  const [swapFeeBounds, setSwapFeeBounds] = useState<SolanaSwapFeeBounds | null>(null)
  const [swapFeeBoundsError, setSwapFeeBoundsError] = useState<string | null>(null)

  useEffect(() => {
    let shouldUpdate = true

    getSolanaSwapFeeBounds()
      .then((bounds) => {
        if (!shouldUpdate) return
        setSwapFeeBounds(bounds)
        setSwapFeeBoundsError(null)
      })
      .catch((caught) => {
        if (!shouldUpdate) return
        setSwapFeeBounds(null)
        setSwapFeeBoundsError(
          caught instanceof Error ? caught.message : 'Unable to load swap fee limits',
        )
      })

    return () => {
      shouldUpdate = false
    }
  }, [])

  const updateForm = <Key extends keyof SolanaCreateLaunchForm>(
    key: Key,
    value: SolanaCreateLaunchForm[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const updateFeeBeneficiary = (
    index: number,
    key: 'address' | 'sharePercent',
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      feeBeneficiaries: current.feeBeneficiaries.map((beneficiary, beneficiaryIndex) =>
        beneficiaryIndex === index ? { ...beneficiary, [key]: value } : beneficiary,
      ),
    }))
  }

  const updateAllocationRecipient = (
    index: number,
    key: 'address' | 'amount',
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      allocationRecipients: current.allocationRecipients.map((recipient, recipientIndex) =>
        recipientIndex === index ? { ...recipient, [key]: value } : recipient,
      ),
    }))
  }

  const addAllocationRecipient = () => {
    setForm((current) => ({
      ...current,
      allocationRecipients:
        current.allocationRecipients.length >= 2
          ? current.allocationRecipients
          : [...current.allocationRecipients, { address: '', amount: '' }],
    }))
  }

  const removeAllocationRecipient = (index: number) => {
    setForm((current) => ({
      ...current,
      allocationRecipients: current.allocationRecipients.filter(
        (_, recipientIndex) => recipientIndex !== index,
      ),
    }))
  }

  const addFeeBeneficiary = () => {
    setForm((current) => ({
      ...current,
      feeBeneficiaries: [...current.feeBeneficiaries, { address: '', sharePercent: '' }],
    }))
  }

  const removeFeeBeneficiary = (index: number) => {
    setForm((current) => ({
      ...current,
      feeBeneficiaries: current.feeBeneficiaries.filter(
        (_, beneficiaryIndex) => beneficiaryIndex !== index,
      ),
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setResult(null)

    try {
      if (!signer) {
        throw new Error('Connect a Solana wallet before creating a launch')
      }
      if (!form.tokenName.trim() || !form.tokenSymbol.trim()) {
        throw new Error('Token name and symbol are required')
      }
      const response = await createSolanaLaunchWithSdk(form, signer)
      setResult(response)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to create Solana launch')
    } finally {
      setSubmitting(false)
    }
  }

  const launchAddress = result?.launchAddress
  const minSwapFeePercent = swapFeeBounds
    ? Number(formatBpsAsPercent(swapFeeBounds.minSwapFeeBps))
    : undefined
  const maxSwapFeePercent = swapFeeBounds
    ? Number(formatBpsAsPercent(swapFeeBounds.maxSwapFeeBps))
    : undefined

  return (
    <div className={embedded ? '' : 'p-8'}>
      <div className="max-w-2xl mx-auto">
        {!embedded && (
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary">Create Solana Launch</h1>
            <p className="mt-2 text-muted-foreground">Creates a devnet XYK launch with the Doppler Solana SDK.</p>
          </div>
        )}

        <div className="border border-primary/20 rounded-lg p-6 bg-card/50 backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Creation Type</label>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                <button
                  type="button"
                  className="flex-1 px-4 py-2 rounded-md transition-colors bg-primary text-primary-foreground"
                >
                  Wallet
                </button>
                <button
                  type="button"
                  disabled
                  className="flex-1 px-4 py-2 rounded-md border border-input bg-background/30 text-muted-foreground opacity-60 cursor-not-allowed"
                >
                  API
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Wallet mode uses the Doppler Solana SDK. API mode is disabled in the demo app while the Solana API path is being updated.
              </p>
            </div>

            {!connected && (
              <div className="flex flex-col gap-3 rounded-md bg-yellow-500/10 border border-yellow-500/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Connect a Solana wallet to create launches with the SDK.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void connect()}
                  disabled={connecting}
                >
                  {connecting ? 'Connecting...' : 'Connect Solana'}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Quote Token</label>
              <select
                value={form.quoteMint}
                onChange={(event) => updateForm('quoteMint', event.target.value)}
                className={inputClassName}
              >
                <option value={WSOL_MINT}>SOL</option>
              </select>
              <p className="text-xs text-muted-foreground">
                The selected quote token is also used as the numeraire address.
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-md border border-input bg-background/30 px-4 py-3">
              <input
                type="checkbox"
                checked={form.migrateToCpmm}
                onChange={(event) => updateForm('migrateToCpmm', event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-medium">Support CPMM Migration</span>
                <span className="block text-xs text-muted-foreground">
                  Uses the CPMM hook and migrator. When off, the launch uses the system program for hook and migrator.
                </span>
              </span>
            </label>

            <div className="space-y-2">
              <Field
                label="Minimum Quote Raise (SOL)"
                value={form.minimumQuoteRaise}
                onChange={(value) => updateForm('minimumQuoteRaise', value)}
                type="number"
                placeholder="e.g., 50"
                min={0}
                step="any"
                disabled={!form.migrateToCpmm}
              />
              <p className="text-xs text-muted-foreground">
                Minimum quote amount raised before the launch can migrate to the CPMM.
              </p>
            </div>

            <div className="space-y-2">
              <Field
                label="SOL Price (USD)"
                value={form.numerairePriceUsd}
                onChange={(value) => updateForm('numerairePriceUsd', value)}
                type="number"
                placeholder="e.g., 150"
                min={0}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Current SOL price in USD. Used to convert market cap targets to on-chain curve parameters.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Market Cap Start ($)"
                  value={form.marketCapStartUsd}
                  onChange={(value) => updateForm('marketCapStartUsd', value)}
                  type="number"
                  placeholder="e.g., 50000"
                  min={0}
                  step={1}
                />
                <Field
                  label="Market Cap End ($)"
                  value={form.marketCapEndUsd}
                  onChange={(value) => updateForm('marketCapEndUsd', value)}
                  type="number"
                  placeholder="e.g., 5000000"
                  min={0}
                  step={1}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Define the starting and ending market cap (in USD) for the bonding curve price range.
              </p>
            </div>

            <div className="space-y-2">
              <Field
                label="Swap Fee (%)"
                value={form.swapFeeBps}
                onChange={(value) => updateForm('swapFeeBps', value)}
                type="number"
                placeholder="e.g., 0.3"
                min={minSwapFeePercent ?? 0}
                max={maxSwapFeePercent}
                step="0.01"
              />
              <p className="text-xs text-muted-foreground">
                {swapFeeBounds
                  ? `Allowed range: ${formatBpsAsPercent(
                      swapFeeBounds.minSwapFeeBps,
                    )}% to ${formatBpsAsPercent(swapFeeBounds.maxSwapFeeBps)}%.`
                  : swapFeeBoundsError
                    ? 'Swap fee limits are unavailable; creation will retry validation before submitting.'
                    : 'Loading allowed swap fee range from the initializer config...'}
              </p>
              {swapFeeBoundsError && (
                <p className="text-xs text-destructive">
                  Could not load swap fee limits: {swapFeeBoundsError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Field
                label="Token Name"
                value={form.tokenName}
                onChange={(value) => updateForm('tokenName', value)}
                placeholder="e.g., My Awesome Token"
              />
            </div>

            <div className="space-y-2">
              <Field
                label="Token Symbol"
                value={form.tokenSymbol}
                onChange={(value) => updateForm('tokenSymbol', value.toUpperCase())}
                placeholder="e.g., MAT"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">Maximum 10 characters, automatically converted to uppercase</p>
            </div>

            <div className="space-y-2">
              <Field
                label="Metadata URL"
                value={form.tokenURI}
                onChange={(value) => updateForm('tokenURI', value)}
                placeholder="e.g., ipfs://CID or https://example.com/token.json"
              />
              <p className="text-xs text-muted-foreground">
                We pass this URL directly to the token factory. No uploads or validation performed.
              </p>
            </div>

            <Field
              label="Total Token Supply"
              value={form.totalSupply}
              onChange={(value) => updateForm('totalSupply', value)}
              type="number"
              placeholder="e.g., 1000000000"
              min={0}
              step="any"
            />

            <div className="space-y-4">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 py-2 text-left transition-colors hover:text-primary"
                aria-expanded={isAdvancedOpen}
                onClick={() => setIsAdvancedOpen((current) => !current)}
              >
                <span>
                  <h3 className="text-sm font-medium">Advanced</h3>
                  <p className="text-xs text-muted-foreground">
                    Optional allocations and custom fee beneficiary splits.
                  </p>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    isAdvancedOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isAdvancedOpen && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium">Allocations</h4>
                      <p className="text-xs text-muted-foreground">
                        Optional token amounts reserved for recipient distribution and initial liquidity.
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Base for Distribution"
                        value={form.baseForDistribution}
                        onChange={(value) => updateForm('baseForDistribution', value)}
                        type="number"
                        placeholder="e.g., 100000000"
                        min={0}
                        step="any"
                        disabled={!form.migrateToCpmm}
                      />
                      <Field
                        label="Base for Liquidity"
                        value={form.baseForLiquidity}
                        onChange={(value) => updateForm('baseForLiquidity', value)}
                        type="number"
                        placeholder="e.g., 200000000"
                        min={0}
                        step="any"
                        disabled={!form.migrateToCpmm}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-medium">Distribution Recipients</h4>
                          <p className="text-xs text-muted-foreground">
                            Up to 2 wallets. Amounts must equal Base for Distribution.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addAllocationRecipient}
                          disabled={!form.migrateToCpmm || form.allocationRecipients.length >= 2}
                        >
                          Add Recipient
                        </Button>
                      </div>

                      {form.allocationRecipients.length > 0 && (
                        <div className="space-y-3">
                          {form.allocationRecipients.map((recipient, index) => (
                            <div key={index} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                              <Field
                                label="Recipient Address"
                                value={recipient.address}
                                onChange={(value) =>
                                  updateAllocationRecipient(index, 'address', value)
                                }
                                placeholder="e.g., 9xQeWvG816bUx9EP..."
                                disabled={!form.migrateToCpmm}
                              />
                              <Field
                                label="Amount"
                                value={recipient.amount}
                                onChange={(value) =>
                                  updateAllocationRecipient(index, 'amount', value)
                                }
                                type="number"
                                placeholder="e.g., 50000000"
                                min={0}
                                step="any"
                                disabled={!form.migrateToCpmm}
                              />
                              <div className="flex items-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => removeAllocationRecipient(index)}
                                  disabled={!form.migrateToCpmm}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-medium">Fee Beneficiaries</h4>
                        <p className="text-xs text-muted-foreground">
                          Optional recipients for launch fees. Shares must total 100%.
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={addFeeBeneficiary}>
                        Add Beneficiary
                      </Button>
                    </div>

                    {form.feeBeneficiaries.length > 0 && (
                      <div className="space-y-3">
                        {form.feeBeneficiaries.map((beneficiary, index) => (
                          <div key={index} className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
                            <Field
                              label="Beneficiary Address"
                              value={beneficiary.address}
                              onChange={(value) => updateFeeBeneficiary(index, 'address', value)}
                              placeholder="e.g., 9xQeWvG816bUx9EP..."
                            />
                            <Field
                              label="Share (%)"
                              value={beneficiary.sharePercent}
                              onChange={(value) =>
                                updateFeeBeneficiary(index, 'sharePercent', value)
                              }
                              type="number"
                              placeholder="e.g., 100"
                              min={0.01}
                              step="0.01"
                            />
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => removeFeeBeneficiary(index)}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3">
                <p className="text-sm text-destructive">
                  <strong>Error:</strong> {error}
                </p>
              </div>
            )}

            <div className="space-y-4 pt-4">
              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="flex-1 bg-primary/90 hover:bg-primary/80"
                  disabled={submitting || !signer}
                >
                  {submitting ? 'Creating launch...' : 'Create with SDK'}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {result && (
          <div className="mt-6 border border-primary/20 rounded-lg p-6 bg-card/50 backdrop-blur">
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
              {result.lookupTableTxHash && (
                <a className="text-primary underline" href={solanaExplorerTx(result.lookupTableTxHash)} target="_blank" rel="noreferrer">
                  View lookup table setup
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
    </div>
  )
}
