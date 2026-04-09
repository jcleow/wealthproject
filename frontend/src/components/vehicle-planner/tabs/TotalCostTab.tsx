'use client'

import { useMemo } from 'react'
import { Calculator } from 'lucide-react'
import clsx from 'clsx'
import { useTheme } from '@/lib/theme'
import { formatCurrency } from '@/lib/format'
import { numericStyles } from '@/lib/utils'
import {
  useActiveVehicleScenario,
  useVehicleOwnershipYears,
  useVehiclePlannerActions,
} from '@/stores/vehiclePlannerStore'
import { calculateVehicle } from '@/lib/vehicle/calculations'

export function TotalCostTab() {
  const { theme, isMonet } = useTheme()
  const scenario = useActiveVehicleScenario()
  const ownershipYears = useVehicleOwnershipYears()
  const { setOwnershipYears, updateScenarioRecurringCosts } = useVehiclePlannerActions()

  const calculation = useMemo(() => {
    if (!scenario) return null
    return calculateVehicle(scenario.inputs, scenario.recurringCosts, ownershipYears)
  }, [scenario, ownershipYears])

  if (!scenario || !calculation) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: theme.textMuted }}>No scenario selected.</p>
      </div>
    )
  }

  const { totalCostOfOwnership: tco } = calculation
  const accentColor = isMonet ? '#D4A574' : '#fbbf24'

  // Cost categories for the breakdown
  const costCategories = [
    { label: 'Upfront / Purchase', value: tco.upfrontCosts, color: isMonet ? '#7BA3C9' : '#3b82f6' },
    { label: 'Loan Interest', value: tco.totalLoanInterest, color: isMonet ? '#E8A898' : '#f43f5e' },
    { label: 'Road Tax', value: tco.totalRoadTax, color: isMonet ? '#D4A574' : '#f59e0b' },
    { label: 'Insurance', value: tco.totalInsurance, color: isMonet ? '#9B8BB4' : '#8b5cf6' },
    { label: 'Fuel / Electricity', value: tco.totalFuel, color: isMonet ? '#7FB285' : '#10b981' },
    { label: 'Maintenance', value: tco.totalMaintenance, color: isMonet ? '#D4C5A9' : '#fbbf24' },
    { label: 'Parking', value: tco.totalParking, color: isMonet ? '#A887B3' : '#a78bfa' },
    { label: 'ERP / Tolls', value: tco.totalErp, color: isMonet ? '#7BA3C9' : '#06b6d4' },
    { label: 'Other', value: tco.totalOther, color: isMonet ? '#9B9B9B' : '#64748b' },
  ].filter(c => c.value > 0)

  const totalCosts = costCategories.reduce((sum, c) => sum + c.value, 0)

  return (
    <div className="p-8 space-y-6">
      {/* Ownership Period Selector */}
      <div
        className="rounded-2xl p-6"
        style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
            Ownership Period
          </h3>
          <span className="text-sm font-medium" style={{ color: accentColor }}>
            {ownershipYears} {ownershipYears === 1 ? 'year' : 'years'}
          </span>
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: theme.controlBg, border: `1px solid ${theme.controlBorder}` }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => setOwnershipYears(year)}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200"
              style={{
                background: ownershipYears === year ? theme.activeBg : 'transparent',
                color: ownershipYears === year ? theme.textPrimary : theme.textMuted,
              }}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* TCO Summary Card */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: isMonet ? 'rgba(212, 165, 116, 0.06)' : 'rgba(251, 191, 36, 0.06)',
          border: `1px solid ${isMonet ? 'rgba(212, 165, 116, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`,
        }}
      >
        <div className="flex items-center gap-2 mb-5">
          <Calculator className="h-4 w-4" style={{ color: accentColor }} />
          <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
            Total Cost of Ownership — {ownershipYears} {ownershipYears === 1 ? 'Year' : 'Years'}
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wider" style={{ color: theme.textMuted }}>Net Total Cost</p>
            <p className="text-2xl font-semibold font-mono tabular-nums" style={{ color: accentColor }}>
              {formatCurrency(tco.netTotalCost)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wider" style={{ color: theme.textMuted }}>Per Month</p>
            <p className="text-2xl font-semibold font-mono tabular-nums" style={{ color: theme.textPrimary }}>
              {formatCurrency(tco.costPerMonth)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wider" style={{ color: theme.textMuted }}>Per Year</p>
            <p className="text-2xl font-semibold font-mono tabular-nums" style={{ color: theme.textPrimary }}>
              {formatCurrency(tco.costPerYear)}
            </p>
          </div>
        </div>

        {/* Residual value note */}
        <p className="mt-4 text-[11px]" style={{ color: theme.textMuted }}>
          After deducting residual (scrap) value of {formatCurrency(tco.residualValue)} at year {ownershipYears}
        </p>
      </div>

      {/* Cost Breakdown Bars */}
      <div
        className="rounded-2xl p-6"
        style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: theme.textPrimary }}>
          Cost Breakdown
        </h3>

        <div className="space-y-3">
          {costCategories.map((category) => {
            const barWidth = Math.max(3, (category.value / totalCosts) * 100)
            return (
              <div key={category.label} className="flex items-center gap-3">
                <span className="w-28 text-xs text-right shrink-0" style={{ color: theme.textSecondary }}>
                  {category.label}
                </span>
                <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: theme.surfaceBg }}>
                  <div
                    className="h-full rounded-md flex items-center px-2 transition-all duration-500"
                    style={{ width: `${barWidth}%`, background: category.color, opacity: 0.8 }}
                  >
                    {barWidth > 20 && (
                      <span className="text-[10px] font-medium text-white whitespace-nowrap">
                        {formatCurrency(category.value)}
                      </span>
                    )}
                  </div>
                </div>
                {barWidth <= 20 && (
                  <span className={clsx(numericStyles.base, 'shrink-0')}>{formatCurrency(category.value)}</span>
                )}
              </div>
            )
          })}

          {/* Residual value (negative) */}
          {tco.residualValue > 0 && (
            <div className="flex items-center gap-3 pt-2" style={{ borderTop: `1px solid ${theme.surfaceBorder}` }}>
              <span className="w-28 text-xs text-right shrink-0" style={{ color: '#10b981' }}>
                Residual Value
              </span>
              <span className={numericStyles.base} style={{ color: '#10b981' }}>
                ({formatCurrency(tco.residualValue)})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Recurring Costs Editor */}
      <div
        className="rounded-2xl p-6"
        style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: theme.textPrimary }}>
          Recurring Costs (Editable)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <RecurringCostInput
            label="Insurance (Annual)"
            value={scenario.recurringCosts.insuranceAnnual}
            onChange={(v) => updateScenarioRecurringCosts(scenario.id, { insuranceAnnual: v })}
            theme={theme}
          />
          <RecurringCostInput
            label="Fuel / Electricity (Monthly)"
            value={scenario.recurringCosts.fuelMonthly}
            onChange={(v) => updateScenarioRecurringCosts(scenario.id, { fuelMonthly: v })}
            theme={theme}
          />
          <RecurringCostInput
            label="Maintenance (Annual)"
            value={scenario.recurringCosts.maintenanceAnnual}
            onChange={(v) => updateScenarioRecurringCosts(scenario.id, { maintenanceAnnual: v })}
            theme={theme}
          />
          <RecurringCostInput
            label="Parking (Monthly)"
            value={scenario.recurringCosts.parkingMonthly}
            onChange={(v) => updateScenarioRecurringCosts(scenario.id, { parkingMonthly: v })}
            theme={theme}
          />
          <RecurringCostInput
            label="ERP / Tolls (Monthly)"
            value={scenario.recurringCosts.erpMonthly}
            onChange={(v) => updateScenarioRecurringCosts(scenario.id, { erpMonthly: v })}
            theme={theme}
          />
          <RecurringCostInput
            label="Other (Monthly)"
            value={scenario.recurringCosts.otherMonthly}
            onChange={(v) => updateScenarioRecurringCosts(scenario.id, { otherMonthly: v })}
            theme={theme}
          />
        </div>
      </div>
    </div>
  )
}

function RecurringCostInput({
  label,
  value,
  onChange,
  theme,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textMuted }}>
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.textMuted }}>$</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          className="w-full rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none transition font-mono tabular-nums"
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
