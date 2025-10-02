import { Button } from "@/components/ui/button"
import { useMemo, useEffect } from "react"

const isValidTickSpacing = (spacing: number) => Number.isFinite(spacing) && spacing > 0

const snapTickToSpacing = (tick: number, spacing: number) => {
  if (!Number.isFinite(tick) || !isValidTickSpacing(spacing)) return tick
  return Math.round(tick / spacing) * spacing
}

const alignTickInput = (input: string, spacing: number) => {
  const trimmed = input.trim()
  if (!isValidTickSpacing(spacing) || trimmed.length === 0) return input
  const numeric = Number(trimmed)
  if (!Number.isFinite(numeric)) return input
  const snapped = snapTickToSpacing(numeric, spacing)
  return snapped.toString()
}

type CurveInput = {
  tickLower: string
  tickUpper: string
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

export const defaultMulticurveState: MulticurveFormState = {
  fee: "10000",
  tickSpacing: "100",
  curves: [
    {
      tickLower: "5100",     // $5k market cap end
      tickUpper: "19100",    // ~30k market cap start
      numPositions: "11",
      shares: "0.1",         // 10% (50000 tokens as tokensToBeSold = 50%)
    },
    {
      tickLower: "17100",    // ~$25k market cap start
      tickUpper: "28000",    // ~$75k market cap end
      numPositions: "8",
      shares: "0.25",        // 25% (125,000 tokens)
    },
    {
      tickLower: "23000",    // ~$45k market cap start
      tickUpper: "28000",    // ~$75k market cap end
      numPositions: "8",
      shares: "0.40",        // 40% (200,000 tokens)
    },
    {
      tickLower: "28000",    // $75k rounded
      tickUpper: "887200",   // max_tick market cap end
      numPositions: "1",
      shares: "0.25",        // 25% (125,000 tokens)
    },
  ],
  enableLock: false,
  beneficiaries: [],
}

// Preset 2: Single curve with positive ticks
const preset2PositiveTicks: MulticurveFormState = {
  fee: "0",
  tickSpacing: "100",
  curves: [
    {
      tickLower: "188000",
      tickUpper: "202000",
      numPositions: "11",
      shares: "1.0",
    },
  ],
  enableLock: false,
  beneficiaries: [],
}

// Preset 3: Single curve with negative ticks
const preset3NegativeTicks: MulticurveFormState = {
  fee: "0",
  tickSpacing: "100",
  curves: [
    {
      tickLower: "-202000",
      tickUpper: "-188000",
      numPositions: "11",
      shares: "1.0",
    },
  ],
  enableLock: false,
  beneficiaries: [],
}

export const MULTICURVE_PRESETS = [
  { name: "Default Multi-Curve", config: defaultMulticurveState },
  { name: "Single Curve (Positive Ticks)", config: preset2PositiveTicks },
  { name: "Single Curve (Negative Ticks)", config: preset3NegativeTicks },
] as const

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

  const updateCurve = (
    index: number,
    key: keyof CurveInput,
    fieldValue: string,
    { snapToSpacing = false }: { snapToSpacing?: boolean } = {},
  ) => {
    let nextValue = fieldValue
    if (snapToSpacing && (key === "tickLower" || key === "tickUpper")) {
      const spacing = Number(value.tickSpacing)
      if (isValidTickSpacing(spacing)) {
        nextValue = alignTickInput(fieldValue, spacing)
      }
    }

    const curves = value.curves.map((curve, i) => (i === index ? { ...curve, [key]: nextValue } : curve))
    onChange({ ...value, curves })
  }

  const addCurve = () => {
    const spacing = Number(value.tickSpacing)
    const last = value.curves[value.curves.length - 1]
    const resolvedSpacing = isValidTickSpacing(spacing) ? spacing : 8
    const lastLower = Number.parseInt(last?.tickLower ?? String(160_000 - resolvedSpacing), 10)
    const nextLower = Number.isFinite(lastLower) ? lastLower + resolvedSpacing : 160_000

    const next: CurveInput = {
      tickLower: String(nextLower),
      tickUpper: last?.tickUpper ?? "240000",
      numPositions: last?.numPositions ?? "10",
      shares: last?.shares ?? "0.1",
    }

    if (isValidTickSpacing(spacing)) {
      next.tickLower = alignTickInput(next.tickLower, spacing)
      next.tickUpper = alignTickInput(next.tickUpper, spacing)
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
    onChange(preset.config)
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
        <label className="text-sm font-medium">Configuration Presets</label>
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
          Load a predefined configuration to quickly get started.
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
            onChange={(event) => {
              const inputValue = event.target.value
              const spacing = Number(inputValue)
              const shouldSnap = isValidTickSpacing(spacing)
              const alignedCurves = shouldSnap
                ? value.curves.map((curve) => ({
                    ...curve,
                    tickLower: alignTickInput(curve.tickLower, spacing),
                    tickUpper: alignTickInput(curve.tickUpper, spacing),
                  }))
                : value.curves

              onChange({
                ...value,
                tickSpacing: inputValue,
                curves: alignedCurves,
              })
            }}
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
          Each curve defines a price band and share weighting for the initializer. Shares should sum to ~1.0 across curves.
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
                  <label className="text-xs font-medium uppercase tracking-wide">Tick Lower</label>
                  <input
                    type="number"
                    value={curve.tickLower}
                    onChange={(event) => updateCurve(index, "tickLower", event.target.value)}
                    onBlur={(event) => updateCurve(index, "tickLower", event.target.value, { snapToSpacing: true })}
                    className="w-full px-3 py-2 rounded-md bg-background/50 border border-input focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g., -120000"
                    step={1}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wide">Tick Upper</label>
                  <input
                    type="number"
                    value={curve.tickUpper}
                    onChange={(event) => updateCurve(index, "tickUpper", event.target.value)}
                    onBlur={(event) => updateCurve(index, "tickUpper", event.target.value, { snapToSpacing: true })}
                    className="w-full px-3 py-2 rounded-md bg-background/50 border border-input focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g., -90000"
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
          Curve share total: <span className="font-semibold text-primary">{shareLabel(totalCurveShare)}</span> (target ≈ 1.0)
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
