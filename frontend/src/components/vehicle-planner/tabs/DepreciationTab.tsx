'use client'

import { useMemo } from 'react'
import { Star } from 'lucide-react'
import clsx from 'clsx'
import { useTheme } from '@/lib/theme'
import { formatCurrency } from '@/lib/format'
import { numericStyles } from '@/lib/utils'
import {
  useActiveVehicleScenario,
} from '@/stores/vehiclePlannerStore'
import { calculateVehicle } from '@/lib/vehicle/calculations'

export function DepreciationTab() {
  const { theme, isMonet } = useTheme()
  const scenario = useActiveVehicleScenario()

  const calculation = useMemo(() => {
    if (!scenario) return null
    return calculateVehicle(scenario.inputs, scenario.recurringCosts)
  }, [scenario])

  if (!scenario || !calculation) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: theme.textMuted }}>No scenario selected.</p>
      </div>
    )
  }

  const { depreciationSchedule } = calculation
  const startingValue = scenario.inputs.condition === 'used'
    ? scenario.inputs.listPrice
    : calculation.totalRegistrationCost

  // Find optimal deregistration year (smallest gap between market value and scrap value)
  const optimalYear = depreciationSchedule.reduce((best, entry) => {
    const gap = entry.marketValue - entry.scrapValue
    const bestGap = best.marketValue - best.scrapValue
    return gap < bestGap && entry.scrapValue > 0 ? entry : best
  }, depreciationSchedule[0])

  // Max value for chart scaling
  const maxChartValue = startingValue

  return (
    <div className="p-8 space-y-6">
      {/* Dual-line chart (bar approximation) */}
      <div
        className="rounded-2xl p-6"
        style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
            Market Value vs Scrap Value
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm" style={{ background: isMonet ? '#7BA3C9' : '#3b82f6' }} />
              <span className="text-[10px]" style={{ color: theme.textMuted }}>Market Value</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm" style={{ background: isMonet ? '#7FB285' : '#10b981' }} />
              <span className="text-[10px]" style={{ color: theme.textMuted }}>Scrap Value</span>
            </div>
          </div>
        </div>

        <div className="flex items-end gap-2 h-48">
          {/* Year 0 */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-0.5 items-end" style={{ height: '100%' }}>
              <div
                className="flex-1 rounded-t-md transition-all duration-500"
                style={{
                  height: '100%',
                  background: isMonet ? '#7BA3C9' : '#3b82f6',
                  opacity: 0.7,
                }}
              />
            </div>
            <span className="text-[10px]" style={{ color: theme.textMuted }}>0</span>
          </div>

          {depreciationSchedule.map((entry) => {
            const marketHeight = (entry.marketValue / maxChartValue) * 100
            const scrapHeight = (entry.scrapValue / maxChartValue) * 100
            const isOptimal = entry.year === optimalYear.year

            return (
              <div
                key={entry.year}
                className={clsx('flex-1 flex flex-col items-center gap-1', isOptimal && 'relative')}
              >
                {isOptimal && (
                  <Star className="absolute -top-5 h-3.5 w-3.5" style={{ color: isMonet ? '#D4A574' : '#fbbf24' }} />
                )}
                <div className="w-full flex gap-0.5 items-end" style={{ height: '100%' }}>
                  <div
                    className="flex-1 rounded-t-md transition-all duration-500"
                    style={{
                      height: `${marketHeight}%`,
                      background: isMonet ? '#7BA3C9' : '#3b82f6',
                      opacity: 0.7,
                    }}
                  />
                  <div
                    className="flex-1 rounded-t-md transition-all duration-500"
                    style={{
                      height: `${scrapHeight}%`,
                      background: isMonet ? '#7FB285' : '#10b981',
                      opacity: 0.7,
                    }}
                  />
                </div>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isOptimal ? (isMonet ? '#D4A574' : '#fbbf24') : theme.textMuted }}
                >
                  {entry.year}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Optimal Deregistration Callout */}
      <div
        className="rounded-2xl p-5 flex items-start gap-3"
        style={{
          background: isMonet ? 'rgba(212, 165, 116, 0.08)' : 'rgba(251, 191, 36, 0.08)',
          border: `1px solid ${isMonet ? 'rgba(212, 165, 116, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`,
        }}
      >
        <Star className="h-4 w-4 mt-0.5 shrink-0" style={{ color: isMonet ? '#D4A574' : '#fbbf24' }} />
        <div>
          <p className="text-sm font-medium" style={{ color: theme.textPrimary }}>
            Optimal Deregistration: Year {optimalYear.year}
          </p>
          <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
            Market value {formatCurrency(optimalYear.marketValue)} vs scrap value {formatCurrency(optimalYear.scrapValue)}.
            The gap is smallest at year {optimalYear.year}, making it the most cost-efficient time to deregister.
          </p>
        </div>
      </div>

      {/* Year-by-Year Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: `1px solid ${theme.cardBorder}` }}
      >
        <div className="px-6 py-4" style={{ background: theme.cardBg }}>
          <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
            Depreciation Schedule
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: theme.surfaceBg }}>
                <th className="px-4 py-2.5 text-left font-medium" style={{ color: theme.textMuted }}>Year</th>
                <th className="px-4 py-2.5 text-right font-medium" style={{ color: theme.textMuted }}>Market Value</th>
                <th className="px-4 py-2.5 text-right font-medium" style={{ color: theme.textMuted }}>PARF Rebate</th>
                <th className="px-4 py-2.5 text-right font-medium" style={{ color: theme.textMuted }}>COE Rebate</th>
                <th className="px-4 py-2.5 text-right font-medium" style={{ color: theme.textMuted }}>Scrap Value</th>
                <th className="px-4 py-2.5 text-right font-medium" style={{ color: theme.textMuted }}>Annual Dep.</th>
                <th className="px-4 py-2.5 text-right font-medium" style={{ color: theme.textMuted }}>Cumulative Dep.</th>
              </tr>
            </thead>
            <tbody>
              {/* Year 0 row */}
              <tr style={{ borderBottom: `1px solid ${theme.surfaceBorder}` }}>
                <td className="px-4 py-2.5 font-medium" style={{ color: theme.textPrimary }}>0</td>
                <td className={clsx('px-4 py-2.5 text-right', numericStyles.base)}>{formatCurrency(startingValue)}</td>
                <td className="px-4 py-2.5 text-right" style={{ color: theme.textMuted }}>—</td>
                <td className="px-4 py-2.5 text-right" style={{ color: theme.textMuted }}>—</td>
                <td className="px-4 py-2.5 text-right" style={{ color: theme.textMuted }}>—</td>
                <td className="px-4 py-2.5 text-right" style={{ color: theme.textMuted }}>—</td>
                <td className="px-4 py-2.5 text-right" style={{ color: theme.textMuted }}>—</td>
              </tr>
              {depreciationSchedule.map((entry) => {
                const isOptimal = entry.year === optimalYear.year
                return (
                  <tr
                    key={entry.year}
                    style={{
                      borderBottom: `1px solid ${theme.surfaceBorder}`,
                      background: isOptimal ? (isMonet ? 'rgba(212, 165, 116, 0.05)' : 'rgba(251, 191, 36, 0.05)') : undefined,
                    }}
                  >
                    <td className="px-4 py-2.5 font-medium" style={{ color: isOptimal ? (isMonet ? '#D4A574' : '#fbbf24') : theme.textPrimary }}>
                      {entry.year} {isOptimal && '★'}
                    </td>
                    <td className={clsx('px-4 py-2.5 text-right', numericStyles.base)}>{formatCurrency(entry.marketValue)}</td>
                    <td className={clsx('px-4 py-2.5 text-right', numericStyles.base)}>
                      {entry.parfRebate > 0 ? formatCurrency(entry.parfRebate) : <span style={{ color: theme.textMuted }}>—</span>}
                    </td>
                    <td className={clsx('px-4 py-2.5 text-right', numericStyles.base)}>
                      {entry.coeRebate > 0 ? formatCurrency(entry.coeRebate) : <span style={{ color: theme.textMuted }}>—</span>}
                    </td>
                    <td className={clsx('px-4 py-2.5 text-right', numericStyles.base)} style={{ color: isMonet ? '#7FB285' : '#10b981' }}>
                      {formatCurrency(entry.scrapValue)}
                    </td>
                    <td className={clsx('px-4 py-2.5 text-right', numericStyles.base)} style={{ color: '#ef4444' }}>
                      ({formatCurrency(entry.annualDepreciation)})
                    </td>
                    <td className={clsx('px-4 py-2.5 text-right', numericStyles.base)} style={{ color: theme.textMuted }}>
                      ({formatCurrency(entry.cumulativeDepreciation)})
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
