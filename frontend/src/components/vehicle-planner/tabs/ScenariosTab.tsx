'use client'

import { useMemo } from 'react'
import { Plus, Copy, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useTheme } from '@/lib/theme'
import { formatCurrency } from '@/lib/format'
import { numericStyles } from '@/lib/utils'
import {
  useVehicleScenarios,
  useActiveVehicleScenario,
  useVehicleOwnershipYears,
  useVehiclePlannerActions,
} from '@/stores/vehiclePlannerStore'
import { calculateVehicle } from '@/lib/vehicle/calculations'
import { formatVehicleCategoryShort, formatFuelType } from '@/lib/vehicle/formatting'

export function ScenariosTab() {
  const { theme, isMonet } = useTheme()
  const scenarios = useVehicleScenarios()
  const activeScenario = useActiveVehicleScenario()
  const ownershipYears = useVehicleOwnershipYears()
  const {
    addScenario,
    deleteScenario,
    duplicateScenario,
    setActiveScenario,
    toggleIncluded,
  } = useVehiclePlannerActions()

  const accentColor = isMonet ? '#D4A574' : '#fbbf24'

  // Calculate all scenarios
  const scenarioCalculations = useMemo(() => {
    return scenarios.map((scenario) => ({
      scenario,
      calculation: calculateVehicle(scenario.inputs, scenario.recurringCosts, ownershipYears),
    }))
  }, [scenarios, ownershipYears])


  return (
    <div className="p-8 space-y-6">
      {/* Scenario Cards */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
          Vehicle Scenarios ({scenarios.length})
        </h3>
        <button
          type="button"
          onClick={() => addScenario()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
          style={{
            background: accentColor,
            color: '#000',
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Scenario
        </button>
      </div>

      {/* Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarioCalculations.map(({ scenario, calculation }) => {
          const isActive = scenario.id === activeScenario?.id
          const tco = calculation.totalCostOfOwnership
          const isNew = scenario.inputs.condition === 'new'

          return (
            <div
              key={scenario.id}
              className="rounded-2xl p-5 transition-all duration-200 cursor-pointer"
              style={{
                background: isActive ? theme.activeBg : theme.cardBg,
                border: `1px solid ${isActive ? accentColor + '60' : theme.cardBorder}`,
              }}
              onClick={() => setActiveScenario(scenario.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
                    {scenario.name}
                  </h4>
                  <p className="text-[10px] mt-0.5" style={{ color: theme.textMuted }}>
                    {formatVehicleCategoryShort(scenario.inputs.vehicleCategory)} · {formatFuelType(scenario.inputs.fuelType)} · {isNew ? 'New' : 'Used'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); duplicateScenario(scenario.id) }}
                    className="p-1.5 rounded-md transition hover:scale-105"
                    style={{ color: theme.textMuted }}
                    title="Duplicate"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  {scenarios.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm(`Delete "${scenario.name}"?`)) {
                          deleteScenario(scenario.id)
                        }
                      }}
                      className="p-1.5 rounded-md transition hover:scale-105"
                      style={{ color: '#ef4444' }}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Key metrics */}
              <div className="space-y-1.5">
                <MetricRow label="Registration" value={isNew ? calculation.totalRegistrationCost : scenario.inputs.listPrice} theme={theme} />
                {scenario.inputs.useFinancing && (
                  <MetricRow label="Monthly Payment" value={calculation.monthlyInstallment} theme={theme} />
                )}
                <MetricRow label="Annual Road Tax" value={calculation.annualRoadTax} theme={theme} />
                <MetricRow label={`${ownershipYears}yr TCO`} value={tco.netTotalCost} theme={theme} accent={accentColor} />
                <MetricRow label="Cost / Month" value={tco.costPerMonth} theme={theme} />
              </div>

              {/* Include Toggle */}
              <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: `1px solid ${theme.surfaceBorder}` }}>
                <span className="text-[10px]" style={{ color: theme.textMuted }}>Include in planning</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleIncluded(scenario.id) }}
                  className="relative w-10 h-5 rounded-full transition-colors duration-200"
                  style={{
                    background: scenario.isIncluded ? (isMonet ? '#7FB285' : '#10b981') : theme.controlBg,
                    border: `1px solid ${scenario.isIncluded ? 'transparent' : theme.controlBorder}`,
                  }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                    style={{ left: scenario.isIncluded ? '20px' : '2px' }}
                  />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Side-by-Side Comparison Table */}
      {scenarioCalculations.length >= 2 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${theme.cardBorder}` }}
        >
          <div className="px-6 py-4" style={{ background: theme.cardBg }}>
            <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
              Side-by-Side Comparison
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: theme.surfaceBg }}>
                  <th className="px-4 py-2.5 text-left font-medium" style={{ color: theme.textMuted }}>Metric</th>
                  {scenarioCalculations.map(({ scenario }) => (
                    <th key={scenario.id} className="px-4 py-2.5 text-right font-medium" style={{ color: theme.textPrimary }}>
                      {scenario.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ComparisonRow
                  label="Registration Cost"
                  values={scenarioCalculations.map(({ scenario, calculation }) =>
                    scenario.inputs.condition === 'new' ? calculation.totalRegistrationCost : scenario.inputs.listPrice
                  )}
                  theme={theme}
                  isMonet={isMonet}
                />
                <ComparisonRow
                  label="Monthly Installment"
                  values={scenarioCalculations.map(({ calculation }) => calculation.monthlyInstallment)}
                  theme={theme}
                  isMonet={isMonet}
                />
                <ComparisonRow
                  label="Annual Road Tax"
                  values={scenarioCalculations.map(({ calculation }) => calculation.annualRoadTax)}
                  theme={theme}
                  isMonet={isMonet}
                />
                <ComparisonRow
                  label={`${ownershipYears}-Year TCO`}
                  values={scenarioCalculations.map(({ calculation }) => calculation.totalCostOfOwnership.netTotalCost)}
                  theme={theme}
                  isMonet={isMonet}
                  highlightLowest
                />
                <ComparisonRow
                  label="Cost / Month"
                  values={scenarioCalculations.map(({ calculation }) => calculation.totalCostOfOwnership.costPerMonth)}
                  theme={theme}
                  isMonet={isMonet}
                  highlightLowest
                />
                <ComparisonRow
                  label="Cost / Year"
                  values={scenarioCalculations.map(({ calculation }) => calculation.totalCostOfOwnership.costPerYear)}
                  theme={theme}
                  isMonet={isMonet}
                  highlightLowest
                />
                <ComparisonRow
                  label={`Residual Value (Yr ${ownershipYears})`}
                  values={scenarioCalculations.map(({ calculation }) => calculation.totalCostOfOwnership.residualValue)}
                  theme={theme}
                  isMonet={isMonet}
                  highlightHighest
                />
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helper Components ────────────────────────────────

function MetricRow({
  label,
  value,
  theme,
  accent,
}: {
  label: string
  value: number
  theme: ReturnType<typeof useTheme>['theme']
  accent?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px]" style={{ color: theme.textMuted }}>{label}</span>
      <span className={numericStyles.base} style={accent ? { color: accent } : undefined}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

function ComparisonRow({
  label,
  values,
  theme,
  highlightLowest,
  highlightHighest,
}: {
  label: string
  values: number[]
  theme: ReturnType<typeof useTheme>['theme']
  isMonet?: boolean
  highlightLowest?: boolean
  highlightHighest?: boolean
}) {
  const minValue = Math.min(...values.filter(v => v > 0))
  const maxValue = Math.max(...values)

  return (
    <tr style={{ borderBottom: `1px solid ${theme.surfaceBorder}` }}>
      <td className="px-4 py-2.5" style={{ color: theme.textSecondary }}>{label}</td>
      {values.map((value, index) => {
        const isMin = highlightLowest && value === minValue && value > 0
        const isMax = highlightHighest && value === maxValue && value > 0

        return (
          <td key={index} className={clsx('px-4 py-2.5 text-right', numericStyles.base)}>
            <span
              className={clsx(
                (isMin || isMax) && 'px-1.5 py-0.5 rounded-md'
              )}
              style={{
                color: (isMin || isMax) ? '#10b981' : undefined,
                background: (isMin || isMax) ? 'rgba(16, 185, 129, 0.1)' : undefined,
              }}
            >
              {formatCurrency(value)}
            </span>
          </td>
        )
      })}
    </tr>
  )
}
