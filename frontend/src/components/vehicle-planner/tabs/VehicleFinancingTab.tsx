'use client'

import { useMemo } from 'react'
import { Car, Bike, Zap, Fuel, Info } from 'lucide-react'
import clsx from 'clsx'
import { useTheme } from '@/lib/theme'
import { formatCurrency } from '@/lib/format'
import { numericStyles } from '@/lib/utils'
import {
  useActiveVehicleScenario,
  useVehiclePlannerActions,
  useVehiclePlannerStore,
} from '@/stores/vehiclePlannerStore'
import { calculateVehicle } from '@/lib/vehicle/calculations'
import { formatVehicleCategoryShort, formatFuelType, isElectric, isCar } from '@/lib/vehicle/formatting'
import { DEFAULT_RECURRING_COSTS } from '@/lib/vehicle/constants'
import type { VehicleCategory, FuelType, VehicleCondition, VesPeriod, VehicleInputs } from '@/types/vehicle'

export function VehicleFinancingTab() {
  const { theme, isMonet } = useTheme()
  const scenario = useActiveVehicleScenario()
  const { updateScenarioInputs, updateScenarioName } = useVehiclePlannerActions()

  const inputs = scenario?.inputs
  const recurringCosts = scenario?.recurringCosts

  const calculation = useMemo(() => {
    if (!inputs || !recurringCosts) return null
    return calculateVehicle(inputs, recurringCosts)
  }, [inputs, recurringCosts])

  if (!scenario || !inputs || !recurringCosts) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: theme.textMuted }}>No scenario selected.</p>
      </div>
    )
  }

  const updateInput = (updates: Partial<VehicleInputs>) => {
    updateScenarioInputs(scenario.id, updates)
  }

  const handleCategoryChange = (category: VehicleCategory) => {
    const isMotorcycle = category === 'motorcycle_cat_d'
    const defaults = isMotorcycle ? DEFAULT_RECURRING_COSTS.motorcycle : DEFAULT_RECURRING_COSTS.car
    updateInput({
      vehicleCategory: category,
      engineCapacityCc: isMotorcycle ? 150 : category === 'car_cat_a' ? 1600 : 2000,
      powerKw: null,
    })
    // Also update recurring cost defaults when switching vehicle type
    if (isMotorcycle !== (scenario.inputs.vehicleCategory === 'motorcycle_cat_d')) {
      useVehiclePlannerStore.getState().updateScenarioRecurringCosts(scenario.id, defaults)
    }
  }

  const categories: { value: VehicleCategory; label: string; sublabel: string; icon: typeof Car }[] = [
    { value: 'car_cat_a', label: 'Cat A', sublabel: '≤1,600cc / ≤97kW', icon: Car },
    { value: 'car_cat_b', label: 'Cat B', sublabel: '>1,600cc / >97kW', icon: Car },
    { value: 'motorcycle_cat_d', label: 'Cat D', sublabel: 'Motorcycles', icon: Bike },
  ]

  const fuelTypes: { value: FuelType; label: string }[] = [
    { value: 'petrol', label: 'Petrol' },
    { value: 'diesel', label: 'Diesel' },
    { value: 'electric', label: 'Electric' },
    { value: 'hybrid_petrol', label: 'Hybrid' },
  ]

  const vesPeriods: { value: VesPeriod; label: string }[] = [
    { value: '2024_2025', label: '2024–25' },
    { value: '2026', label: '2026' },
    { value: '2027', label: '2027' },
  ]

  const isEv = isElectric(inputs.fuelType)
  const isCarType = isCar(inputs.vehicleCategory)

  return (
    <div className="flex gap-6 p-8">
      {/* ─── Left Panel: Input Form ───────────────────── */}
      <div className="flex-1 space-y-6">
        {/* Scenario Name */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textMuted }}>
            Scenario Name
          </label>
          <input
            type="text"
            value={scenario.name}
            onChange={(e) => updateScenarioName(scenario.id, e.target.value)}
            className="w-full rounded-xl py-2.5 px-3 text-sm focus:outline-none transition"
            style={{
              background: theme.inputBg,
              border: `1px solid ${theme.inputBorder}`,
              color: theme.inputText,
            }}
          />
        </div>

        {/* Vehicle Category Selector */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: theme.textMuted }}>
            Vehicle Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {categories.map((cat) => {
              const isActive = inputs.vehicleCategory === cat.value
              const Icon = cat.icon
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => handleCategoryChange(cat.value)}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-4 text-center transition-all duration-200"
                  style={{
                    background: isActive ? theme.activeBg : theme.controlBg,
                    border: `1px solid ${isActive ? (isMonet ? '#D4A574' : '#fbbf24') + '60' : theme.controlBorder}`,
                    color: isActive ? theme.textPrimary : theme.textSecondary,
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: isActive ? (isMonet ? '#D4A574' : '#fbbf24') : theme.textMuted }} />
                  <span className="text-sm font-medium">{cat.label}</span>
                  <span className="text-[10px]" style={{ color: theme.textMuted }}>{cat.sublabel}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Fuel Type Toggle */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: theme.textMuted }}>
            Fuel Type
          </label>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: theme.controlBg, border: `1px solid ${theme.controlBorder}` }}>
            {fuelTypes.map((ft) => {
              const isActive = inputs.fuelType === ft.value
              return (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => updateInput({ fuelType: ft.value, co2EmissionsGkm: ft.value === 'electric' ? 0 : inputs.co2EmissionsGkm })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all duration-200"
                  style={{
                    background: isActive ? theme.activeBg : 'transparent',
                    color: isActive ? theme.textPrimary : theme.textMuted,
                  }}
                >
                  {ft.value === 'electric' && <Zap className="h-3 w-3" />}
                  {(ft.value === 'petrol' || ft.value === 'diesel') && <Fuel className="h-3 w-3" />}
                  {ft.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Condition Toggle */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: theme.textMuted }}>
            Condition
          </label>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: theme.controlBg, border: `1px solid ${theme.controlBorder}` }}>
            {(['new', 'used'] as VehicleCondition[]).map((cond) => {
              const isActive = inputs.condition === cond
              return (
                <button
                  key={cond}
                  type="button"
                  onClick={() => updateInput({
                    condition: cond,
                    vehicleAge: cond === 'new' ? 0 : inputs.vehicleAge || 3,
                    remainingCoeMonths: cond === 'new' ? 120 : inputs.remainingCoeMonths || 84,
                    isPafrEligible: cond === 'new' ? true : inputs.isPafrEligible,
                  })}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200"
                  style={{
                    background: isActive ? theme.activeBg : 'transparent',
                    color: isActive ? theme.textPrimary : theme.textMuted,
                  }}
                >
                  {cond === 'new' ? 'Brand New' : 'Used / Pre-owned'}
                </button>
              )
            })}
          </div>
        </div>

        {/* Used Vehicle Fields */}
        {inputs.condition === 'used' && (
          <div className="grid grid-cols-2 gap-4">
            <NumberInput label="Vehicle Age (years)" value={inputs.vehicleAge} onChange={(v) => updateInput({ vehicleAge: v })} theme={theme} min={0} max={20} />
            <NumberInput label="Remaining COE (months)" value={inputs.remainingCoeMonths} onChange={(v) => updateInput({ remainingCoeMonths: v })} theme={theme} min={0} max={120} />
          </div>
        )}

        {/* Pricing Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Pricing</h3>
          <div className="grid grid-cols-2 gap-4">
            <NumberInput label="Open Market Value (OMV)" value={inputs.omv} onChange={(v) => updateInput({ omv: v })} theme={theme} prefix="$" step={1000} />
            <NumberInput label="COE Price" value={inputs.coePrice} onChange={(v) => updateInput({ coePrice: v })} theme={theme} prefix="$" step={1000} />
          </div>
          {inputs.condition === 'used' && (
            <NumberInput label="Purchase / Asking Price" value={inputs.listPrice} onChange={(v) => updateInput({ listPrice: v })} theme={theme} prefix="$" step={1000} />
          )}
          {inputs.condition === 'new' && (
            <NumberInput label="Dealer List Price (reference)" value={inputs.listPrice} onChange={(v) => updateInput({ listPrice: v })} theme={theme} prefix="$" step={1000} />
          )}
        </div>

        {/* Engine / Emissions */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Vehicle Specs</h3>
          <div className="grid grid-cols-2 gap-4">
            {!isEv && (
              <NumberInput label="Engine Capacity (cc)" value={inputs.engineCapacityCc ?? 0} onChange={(v) => updateInput({ engineCapacityCc: v })} theme={theme} step={100} />
            )}
            {(isEv || isCarType) && (
              <NumberInput label="Power (kW)" value={inputs.powerKw ?? 0} onChange={(v) => updateInput({ powerKw: v || null })} theme={theme} step={10} />
            )}
            <NumberInput label="CO₂ Emissions (g/km)" value={inputs.co2EmissionsGkm ?? 0} onChange={(v) => updateInput({ co2EmissionsGkm: v })} theme={theme} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: theme.textMuted }}>
              VES Period
            </label>
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: theme.controlBg, border: `1px solid ${theme.controlBorder}` }}>
              {vesPeriods.map((vp) => {
                const isActive = inputs.vesPeriod === vp.value
                return (
                  <button
                    key={vp.value}
                    type="button"
                    onClick={() => updateInput({ vesPeriod: vp.value })}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200"
                    style={{
                      background: isActive ? theme.activeBg : 'transparent',
                      color: isActive ? theme.textPrimary : theme.textMuted,
                    }}
                  >
                    {vp.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Financing Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Financing</h3>
            <button
              type="button"
              onClick={() => updateInput({ useFinancing: !inputs.useFinancing })}
              className="relative w-10 h-5 rounded-full transition-colors duration-200"
              style={{
                background: inputs.useFinancing ? (isMonet ? '#D4A574' : '#fbbf24') : theme.controlBg,
                border: `1px solid ${inputs.useFinancing ? 'transparent' : theme.controlBorder}`,
              }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                style={{ left: inputs.useFinancing ? '20px' : '2px' }}
              />
            </button>
          </div>

          {inputs.useFinancing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <NumberInput
                    label="Loan Amount"
                    value={inputs.loanAmount}
                    onChange={(v) => updateInput({ loanAmount: v })}
                    theme={theme}
                    prefix="$"
                    step={1000}
                  />
                  {calculation && (
                    <p className="mt-1 text-[10px]" style={{ color: theme.textMuted }}>
                      Max LTV: {Math.round(calculation.maxLtvPercent * 100)}% ({formatCurrency(calculation.maxLoanAllowed)})
                    </p>
                  )}
                </div>
                <NumberInput label="Flat Interest Rate (%)" value={inputs.interestRateFlat} onChange={(v) => updateInput({ interestRateFlat: v })} theme={theme} step={0.01} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: theme.textMuted }}>
                  Loan Tenure: {inputs.loanTenureYears} years
                </label>
                <input
                  type="range"
                  min={1}
                  max={isCarType ? 7 : 10}
                  step={1}
                  value={inputs.loanTenureYears}
                  onChange={(e) => updateInput({ loanTenureYears: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Right Panel: Live Summary ────────────────── */}
      <div className="w-80 shrink-0">
        <div
          className="sticky top-8 rounded-2xl p-6 space-y-5"
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
          }}
        >
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4" style={{ color: isMonet ? '#D4A574' : '#fbbf24' }} />
            <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
              Cost Summary
            </h3>
            <span
              className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: isMonet ? 'rgba(212, 165, 116, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                color: isMonet ? '#D4A574' : '#fbbf24',
              }}
            >
              {formatVehicleCategoryShort(inputs.vehicleCategory)} · {formatFuelType(inputs.fuelType)}
            </span>
          </div>

          {calculation && inputs.condition === 'new' && (
            <>
              {/* Registration Cost Breakdown */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-medium uppercase tracking-wider" style={{ color: theme.textMuted }}>
                  Registration Cost
                </h4>
                <CostLine label="OMV" value={inputs.omv} theme={theme} />
                <CostLine label="Excise Duty (20%)" value={calculation.exciseDuty} theme={theme} />
                <CostLine label="GST (9%)" value={calculation.gst} theme={theme} />
                <CostLine label="ARF" value={calculation.arf} theme={theme} />
                <CostLine label="COE" value={inputs.coePrice} theme={theme} />
                {calculation.vesAmount !== 0 && (
                  <CostLine
                    label={`VES ${calculation.vesAmount < 0 ? 'Rebate' : 'Surcharge'}`}
                    value={calculation.vesAmount}
                    theme={theme}
                    highlight={calculation.vesAmount < 0 ? 'green' : 'red'}
                  />
                )}
                {calculation.eeaiRebate !== 0 && (
                  <CostLine label="EEAI Rebate" value={calculation.eeaiRebate} theme={theme} highlight="green" />
                )}
                <CostLine label="Reg Fee" value={calculation.registrationFee} theme={theme} />
                <div className="pt-2 mt-2" style={{ borderTop: `1px solid ${theme.surfaceBorder}` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Total</span>
                    <span className={clsx(numericStyles.medium, 'text-base')} style={{ color: isMonet ? '#D4A574' : '#fbbf24' }}>
                      {formatCurrency(calculation.totalRegistrationCost)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {calculation && inputs.condition === 'used' && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-medium uppercase tracking-wider" style={{ color: theme.textMuted }}>
                Purchase Price
              </h4>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Total</span>
                <span className={clsx(numericStyles.medium, 'text-base')} style={{ color: isMonet ? '#D4A574' : '#fbbf24' }}>
                  {formatCurrency(inputs.listPrice)}
                </span>
              </div>
            </div>
          )}

          {/* Financing Summary */}
          {calculation && inputs.useFinancing && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-medium uppercase tracking-wider" style={{ color: theme.textMuted }}>
                Financing
              </h4>
              <CostLine label="Downpayment" value={calculation.downpayment} theme={theme} />
              <CostLine label="Monthly Payment" value={calculation.monthlyInstallment} theme={theme} />
              <CostLine label="Total Interest" value={calculation.totalInterestPaid} theme={theme} />
              <div className="flex items-center gap-1 mt-1">
                <Info className="h-3 w-3" style={{ color: theme.textMuted }} />
                <span className="text-[10px]" style={{ color: theme.textMuted }}>
                  EIR: {(calculation.effectiveInterestRate * 100).toFixed(2)}% (flat: {inputs.interestRateFlat}%)
                </span>
              </div>
            </div>
          )}

          {/* Road Tax */}
          {calculation && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-medium uppercase tracking-wider" style={{ color: theme.textMuted }}>
                Road Tax
              </h4>
              <CostLine label="6-Monthly" value={calculation.sixMonthlyRoadTax} theme={theme} />
              <CostLine label="Annual" value={calculation.annualRoadTax} theme={theme} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Helper Components ────────────────────────────────

interface NumberInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  theme: ReturnType<typeof useTheme>['theme']
  prefix?: string
  step?: number
  min?: number
  max?: number
}

function NumberInput({ label, value, onChange, theme, prefix, step = 1, min, max }: NumberInputProps) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textMuted }}>
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.textMuted }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const numericValue = Number(e.target.value)
            if (min !== undefined && numericValue < min) return
            if (max !== undefined && numericValue > max) return
            onChange(numericValue)
          }}
          step={step}
          className={clsx('w-full rounded-xl py-2.5 text-sm focus:outline-none transition font-mono tabular-nums', prefix ? 'pl-7 pr-3' : 'px-3')}
          style={{
            background: theme.inputBg,
            border: `1px solid ${theme.inputBorder}`,
            color: theme.inputText,
          }}
        />
      </div>
    </div>
  )
}

interface CostLineProps {
  label: string
  value: number
  theme: ReturnType<typeof useTheme>['theme']
  highlight?: 'green' | 'red'
}

function CostLine({ label, value, theme, highlight }: CostLineProps) {
  const displayColor = highlight === 'green'
    ? '#10b981'
    : highlight === 'red'
      ? '#ef4444'
      : undefined

  return (
    <div className="flex items-center justify-between text-xs">
      <span style={{ color: theme.textSecondary }}>{label}</span>
      <span className={numericStyles.base} style={displayColor ? { color: displayColor } : undefined}>
        {value < 0 ? `(${formatCurrency(Math.abs(value))})` : formatCurrency(value)}
      </span>
    </div>
  )
}
