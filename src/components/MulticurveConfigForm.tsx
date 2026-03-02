import { Button } from "@/components/ui/button"
import { useMemo, useEffect } from "react"

type CurveInput = {
  marketCapStart: string
  marketCapEnd: string
  numPositions: string
  shares: string
}

type BeneficiaryInput = {
  beneficiary: string
  shares: string
}

export interface MulticurveFormState {
  fee: string
  tickSpacing: string
  curves: CurveInput[]
  enableLock: boolean
  beneficiaries: BeneficiaryInput[]
}

type MarketCapTierIndex = 0 | 1 | 2

const PRESET_FEE = "10000"
const PRESET_TICK_SPACING = "100"

const PRESET_MARKET_CAP_CONFIGS: { marketCapStart: number; marketCapEnd: number; numPositions: number; shares: string }[] = [
  { marketCapStart: 7500, marketCapEnd: 30000, numPositions: 10, shares: "1" },      // low
  { marketCapStart: 50000, marketCapEnd: 150000, numPositions: 10, shares: "1" },    // medium
  { marketCapStart: 250000, marketCapEnd: 750000, numPositions: 10, shares: "1" },   // high
]

const buildPresetConfig = (tier: MarketCapTierIndex): MulticurveFormState => ({
  fee: PRESET_FEE,
  tickSpacing: PRESET_TICK_SPACING,
  curves: [
    {
      marketCapStart: String(PRESET_MARKET_CAP_CONFIGS[tier].marketCapStart),
      marketCapEnd: String(PRESET_MARKET_CAP_CONFIGS[tier].marketCapEnd),
      numPositions: String(PRESET_MARKET_CAP_CONFIGS[tier].numPositions),
      shares: PRESET_MARKET_CAP_CONFIGS[tier].shares,
    },
  ],
  enableLock: false,
  beneficiaries: [],
})

const cloneFormState = (state: MulticurveFormState): MulticurveFormState => ({
  ...state,
  curves: state.curves.map((curve) => ({ ...curve })),
  beneficiaries: state.beneficiaries.map((beneficiary) => ({ ...beneficiary })),
})

const MARKET_CAP_PRESETS = [
  { key: "low", name: "Low Cap (~$7.5k-$30k)", tier: 0 as MarketCapTierIndex },
  { key: "medium", name: "Medium Cap (~$50k-$150k)", tier: 1 as MarketCapTierIndex },
  { key: "high", name: "High Cap (~$250k-$750k)", tier: 2 as MarketCapTierIndex },
] as const

export const MULTICURVE_PRESETS = MARKET_CAP_PRESETS.map((preset) => ({
  key: preset.key,
  name: preset.name,
  config: buildPresetConfig(preset.tier),
}))

const DEFAULT_PRESET_KEY: (typeof MARKET_CAP_PRESETS)[number]["key"] = "medium"
const fallbackPreset =
  MULTICURVE_PRESETS.find((preset) => preset.key === DEFAULT_PRESET_KEY) ?? MULTICURVE_PRESETS[0]

export const defaultMulticurveState: MulticurveFormState = cloneFormState(fallbackPreset.config)

interface MulticurveConfigFormProps {
  value: MulticurveFormState
  onChange: (state: MulticurveFormState) => void
  disabled?: boolean
  airlockOwner: string
}

export const AIRLOCK_OWNER_SHARE = "0.05"
const DEFAULT_USER_SHARE = "0.95"

const ensureBeneficiaryStructure = (
  beneficiaries: BeneficiaryInput[],
  airlockOwner: string
): BeneficiaryInput[] => {
  const editableBeneficiaries = beneficiaries.filter((_, index) => index !== 0)

  if (editableBeneficiaries.length === 0) {
    editableBeneficiaries.push({ beneficiary: "", shares: DEFAULT_USER_SHARE })
  } else {
    const firstEditable = { ...editableBeneficiaries[0] }
    if (!firstEditable.shares || firstEditable.shares.trim().length === 0) {
      firstEditable.shares = DEFAULT_USER_SHARE
    }
    editableBeneficiaries[0] = firstEditable
  }

  return [
    { beneficiary: airlockOwner, shares: AIRLOCK_OWNER_SHARE },
    ...editableBeneficiaries,
  ]
}

export function MulticurveConfigForm({ value, onChange, disabled, airlockOwner }: MulticurveConfigFormProps) {
  const totalCurveShare = useMemo(() => {
    return value.curves.reduce((acc, curve) => acc + (Number.parseFloat(curve.shares || "0") || 0), 0)
  }, [value.curves])

  const totalBeneficiaryShare = useMemo(() => {
    return value.beneficiaries.reduce((acc, beneficiary) => acc + (Number.parseFloat(beneficiary.shares || "0") || 0), 0)
  }, [value.beneficiaries])

  const setField = <K extends keyof MulticurveFormState>(key: K, fieldValue: MulticurveFormState[K]) => {
    onChange({ ...value, [key]: fieldValue })
  }

  useEffect(() => {
    if (!value.enableLock) return
    if (!airlockOwner) return
    const currentOwner = value.beneficiaries[0]?.beneficiary
    if (currentOwner === airlockOwner) return

    setField("beneficiaries", ensureBeneficiaryStructure(value.beneficiaries, airlockOwner))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airlockOwner, value.enableLock, value.beneficiaries])

  const updateCurve = (index: number, key: keyof CurveInput, fieldValue: string) => {
    const curves = value.curves.map((curve, i) => (i === index ? { ...curve, [key]: fieldValue } : curve))
    onChange({ ...value, curves })
  }

  const addCurve = () => {
    const last = value.curves[value.curves.length - 1]
    const lastEnd = Number(last?.marketCapEnd || '0')
    const nextStart = lastEnd > 0 ? lastEnd : 100000
    const nextEnd = nextStart * 5

    const next: CurveInput = {
      marketCapStart: String(nextStart),
      marketCapEnd: String(nextEnd),
      numPositions: last?.numPositions ?? "10",
      shares: last?.shares ?? "0.1",
    }

    setField("curves", [...value.curves, next])
  }

  const removeCurve = (index: number) => {
    if (value.curves.length <= 1) return
    const curves = value.curves.filter((_, i) => i !== index)
    setField("curves", curves)
  }

  const addBeneficiary = () => {
    setField("beneficiaries", [...value.beneficiaries, { beneficiary: "", shares: "0" }])
  }

  const updateBeneficiary = (index: number, key: keyof BeneficiaryInput, fieldValue: string) => {
    if (index === 0) return
    const beneficiaries = value.beneficiaries.map((beneficiary, i) =>
      i === index ? { ...beneficiary, [key]: fieldValue } : beneficiary,
    )
    setField("beneficiaries", beneficiaries)
  }

  const removeBeneficiary = (index: number) => {
    if (index === 0) return
    const beneficiaries = value.beneficiaries.filter((_, i) => i !== index)
    setField("beneficiaries", beneficiaries)
  }

  const shareLabel = (share: number) => {
    if (!Number.isFinite(share)) return "0.0000"
    return share.toFixed(4)
  }

  const loadPreset = (presetIndex: number) => {
    const preset = MULTICURVE_PRESETS[presetIndex]
    if (!preset) return
    onChange(cloneFormState(preset.config))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Multicurve Parameters</h3>
        <p className="text-xs text-muted-foreground">
          Configure the Uniswap V4 multicurve initializer. Shares are expressed as decimals (1.0 = 100%).
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Market Cap Presets</label>
        <div className="flex flex-wrap gap-2">
          {MULTICURVE_PRESETS.map((preset, index) => (
            <Button
              key={index}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => loadPreset(index)}
              disabled={disabled}
            >
              {preset.name}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Select a preset tuned for a target launch market cap to start from recommended ranges and weights.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Fee Tier</label>
          <input
            type="number"
            value={value.fee}
            onChange={(event) => setField("fee", event.target.value)}
            className="w-full px-4 py-2 rounded-md bg-background/50 border border-input focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="e.g., 0 or 3000"
            min={0}
            step={1}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">Expressed in Uniswap fee units (100 = 0.01%, 3000 = 0.3%).</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Tick Spacing</label>
          <input
            type="number"
            value={value.tickSpacing}
            onChange={(event) => setField("tickSpacing", event.target.value)}
            className="w-full px-4 py-2 rounded-md bg-background/50 border border-input focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="e.g., 8 or 60"
            min={1}
            step={1}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">Must match the deployed pool&apos;s allowed spacing for the chosen fee tier.</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-primary/80">Curves</h4>
          <Button type="button" size="sm" variant="outline" onClick={addCurve} disabled={disabled}>
            Add Curve
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Each curve defines a market cap range (in USD) and share weighting for the initializer. Shares should sum to ~1.0 across curves.
        </p>

        <div className="space-y-4">
          {value.curves.map((curve, index) => (
            <div key={index} className="rounded-lg border border-primary/20 bg-background/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary">Curve {index + 1}</span>
                {value.curves.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCurve(index)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                    disabled={disabled}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wide">Market Cap Start ($)</label>
                  <input
                    type="number"
                    value={curve.marketCapStart}
                    onChange={(event) => updateCurve(index, "marketCapStart", event.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-background/50 border border-input focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g., 50000"
                    min={0}
                    step={1}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wide">Market Cap End ($)</label>
                  <input
                    type="number"
                    value={curve.marketCapEnd}
                    onChange={(event) => updateCurve(index, "marketCapEnd", event.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-background/50 border border-input focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g., 500000"
                    min={0}
                    step={1}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wide">Num Positions</label>
                  <input
                    type="number"
                    value={curve.numPositions}
                    onChange={(event) => updateCurve(index, "numPositions", event.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-background/50 border border-input focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g., 8"
                    min={1}
                    step={1}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wide">Shares</label>
                  <input
                    type="number"
                    value={curve.shares}
                    onChange={(event) => updateCurve(index, "shares", event.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-background/50 border border-input focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g., 0.25"
                    min={0}
                    step="0.0001"
                    disabled={disabled}
                  />
                  <p className="text-[10px] text-muted-foreground">Fraction of total deposits allocated to this range.</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Curve share total: <span className="font-semibold text-primary">{shareLabel(totalCurveShare)}</span> (must be &lt;= 1.0)
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enableLock"
            checked={value.enableLock}
            onChange={(event) => {
              const enabled = event.target.checked
              if (!enabled) {
                onChange({ ...value, enableLock: false, beneficiaries: [] })
                return
              }

              onChange({
                ...value,
                enableLock: true,
                beneficiaries: ensureBeneficiaryStructure(value.beneficiaries, airlockOwner),
              })
            }}
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
            disabled={disabled}
          />
          <label htmlFor="enableLock" className="text-sm font-medium cursor-pointer">
            Lock fee revenue to beneficiaries at initialization
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Optional: configure WAD-based shares for addresses that should receive fees before the pool migrates.
        </p>
      </div>

      {value.enableLock && (
        <div className="space-y-4 rounded-md border border-primary/20 bg-background/30 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-primary/80">Beneficiaries</h4>
            <Button type="button" size="sm" variant="outline" onClick={addBeneficiary} disabled={disabled}>
              Add Beneficiary
            </Button>
          </div>
          <div className="space-y-3">
            {value.beneficiaries.map((beneficiary, index) => {
              const isProtocolEntry = index === 0
              const displayedAddress = isProtocolEntry
                ? beneficiary.beneficiary || airlockOwner
                : beneficiary.beneficiary
              return (
                <div key={index} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-wide">Beneficiary Address</label>
                    <input
                      type="text"
                      value={displayedAddress}
                      onChange={(event) => updateBeneficiary(index, "beneficiary", event.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-background/50 border border-input focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="0x..."
                      disabled={disabled || isProtocolEntry}
                      readOnly={isProtocolEntry}
                    />
                    {isProtocolEntry && (
                      <p className="text-[10px] text-muted-foreground">
                        Protocol owner receives 5% automatically.
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-wide">Shares</label>
                    <input
                      type="number"
                      value={beneficiary.shares}
                      onChange={(event) => updateBeneficiary(index, "shares", event.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-background/50 border border-input focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="e.g., 0.05"
                      min={0}
                      step="0.0001"
                      disabled={disabled || isProtocolEntry}
                      readOnly={isProtocolEntry}
                    />
                  </div>
                  <div className="flex items-end">
                    {!isProtocolEntry && (
                      <button
                        type="button"
                        onClick={() => removeBeneficiary(index)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                        disabled={disabled}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Beneficiary share total: <span className="font-semibold text-primary">{shareLabel(totalBeneficiaryShare)}</span> (includes required 5% protocol share)
          </p>
        </div>
      )}
    </div>
  )
}
