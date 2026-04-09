'use client'

import { useMemo } from 'react'
import { Info, TrendingDown, TrendingUp } from 'lucide-react'
import clsx from 'clsx'
import { useTheme } from '@/lib/theme'
import { formatCurrency } from '@/lib/format'
import { numericStyles } from '@/lib/utils'
import {
  useActiveVehicleScenario,
} from '@/stores/vehiclePlannerStore'
import { calculateVehicle } from '@/lib/vehicle/calculations'
import { getVesBandLabel, formatFuelType } from '@/lib/vehicle/formatting'

export function CostBreakdownTab() {
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

  const { inputs } = scenario
  const isUsed = inputs.condition === 'used'

  if (isUsed) {
    return (
      <div className="p-8 space-y-6">
        <div
          className="rounded-2xl p-6"
          style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4" style={{ color: theme.textMuted }} />
            <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
              Used Vehicle
            </h3>
          </div>
          <p className="text-sm" style={{ color: theme.textSecondary }}>
            For used vehicles, the registration cost breakdown is not applicable — the purchase price
            is the all-in cost. Check the Depreciation and Total Cost tabs for ownership analysis.
          </p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm" style={{ color: theme.textSecondary }}>Purchase Price</span>
            <span className={numericStyles.medium} style={{ color: isMonet ? '#D4A574' : '#fbbf24' }}>
              {formatCurrency(inputs.listPrice)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Build waterfall data
  const waterfallItems = [
    { label: 'OMV', value: inputs.omv, color: isMonet ? '#7BA3C9' : '#3b82f6' },
    { label: 'Excise Duty', value: calculation.exciseDuty, color: isMonet ? '#7BA3C9' : '#60a5fa' },
    { label: 'GST', value: calculation.gst, color: isMonet ? '#9B8BB4' : '#8b5cf6' },
    { label: 'ARF', value: calculation.arf, color: isMonet ? '#E8A898' : '#f43f5e' },
    { label: 'COE', value: inputs.coePrice, color: isMonet ? '#D4A574' : '#f59e0b' },
    ...(calculation.vesAmount !== 0
      ? [{ label: `VES ${calculation.vesAmount < 0 ? 'Rebate' : 'Surcharge'}`, value: calculation.vesAmount, color: calculation.vesAmount < 0 ? '#10b981' : '#ef4444' }]
      : []),
    ...(calculation.eeaiRebate !== 0
      ? [{ label: 'EEAI Rebate', value: calculation.eeaiRebate, color: '#10b981' }]
      : []),
    { label: 'Reg Fee', value: calculation.registrationFee, color: isMonet ? '#9B9B9B' : '#64748b' },
  ]

  const maxValue = calculation.totalRegistrationCost
  const positiveTotal = waterfallItems.filter(i => i.value > 0).reduce((sum, i) => sum + i.value, 0)

  // Calculate percentages for the pie-chart-style breakdown
  const pieItems = waterfallItems
    .filter(i => i.value > 0)
    .map(i => ({
      ...i,
      percentage: (i.value / positiveTotal) * 100,
    }))

  const vesBandLabel = getVesBandLabel(inputs.co2EmissionsGkm, inputs.fuelType, inputs.vesPeriod)

  return (
    <div className="p-8 space-y-6">
      {/* Horizontal Bar Breakdown */}
      <div
        className="rounded-2xl p-6"
        style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: theme.textPrimary }}>
          Registration Cost Waterfall
        </h3>

        <div className="space-y-3">
          {waterfallItems.map((item) => {
            const barWidth = Math.max(2, Math.abs(item.value) / maxValue * 100)
            const isNegative = item.value < 0

            return (
              <div key={item.label} className="flex items-center gap-3">
                <span className="w-24 text-xs text-right shrink-0" style={{ color: theme.textSecondary }}>
                  {item.label}
                </span>
                <div className="flex-1 h-7 rounded-md overflow-hidden" style={{ background: theme.surfaceBg }}>
                  <div
                    className="h-full rounded-md flex items-center px-2 transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      background: item.color,
                      opacity: isNegative ? 0.7 : 0.85,
                    }}
                  >
                    {barWidth > 15 && (
                      <span className="text-[10px] font-medium text-white whitespace-nowrap">
                        {isNegative ? `(${formatCurrency(Math.abs(item.value))})` : formatCurrency(item.value)}
                      </span>
                    )}
                  </div>
                </div>
                {barWidth <= 15 && (
                  <span className={clsx(numericStyles.base, 'shrink-0')} style={isNegative ? { color: '#10b981' } : undefined}>
                    {isNegative ? `(${formatCurrency(Math.abs(item.value))})` : formatCurrency(item.value)}
                  </span>
                )}
              </div>
            )
          })}

          {/* Total bar */}
          <div className="flex items-center gap-3 pt-2" style={{ borderTop: `1px solid ${theme.surfaceBorder}` }}>
            <span className="w-24 text-xs text-right shrink-0 font-semibold" style={{ color: theme.textPrimary }}>
              Total
            </span>
            <div className="flex-1">
              <span className={numericStyles.medium} style={{ color: isMonet ? '#D4A574' : '#fbbf24', fontSize: '16px' }}>
                {formatCurrency(calculation.totalRegistrationCost)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Composition Strip */}
      <div
        className="rounded-2xl p-6"
        style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: theme.textPrimary }}>
          Cost Composition
        </h3>
        <div className="flex rounded-lg overflow-hidden h-8">
          {pieItems.map((item) => (
            <div
              key={item.label}
              className="h-full transition-all duration-500"
              style={{ width: `${item.percentage}%`, background: item.color, opacity: 0.85 }}
              title={`${item.label}: ${formatCurrency(item.value)} (${item.percentage.toFixed(1)}%)`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {pieItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color, opacity: 0.85 }} />
              <span className="text-[10px]" style={{ color: theme.textSecondary }}>
                {item.label} ({item.percentage.toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* VES + EEAI Callouts */}
      <div className="grid grid-cols-2 gap-4">
        {/* VES Card */}
        <div
          className="rounded-2xl p-5"
          style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            {calculation.vesAmount <= 0
              ? <TrendingDown className="h-4 w-4 text-emerald-500" />
              : <TrendingUp className="h-4 w-4 text-rose-500" />
            }
            <h4 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
              VES ({vesBandLabel})
            </h4>
          </div>
          <p className="text-2xl font-semibold font-mono tabular-nums" style={{
            color: calculation.vesAmount === 0 ? theme.textMuted :
              calculation.vesAmount < 0 ? '#10b981' : '#ef4444'
          }}>
            {calculation.vesAmount === 0
              ? 'Neutral'
              : calculation.vesAmount < 0
                ? `(${formatCurrency(Math.abs(calculation.vesAmount))}) rebate`
                : `${formatCurrency(calculation.vesAmount)} surcharge`
            }
          </p>
          <p className="text-[11px] mt-2" style={{ color: theme.textMuted }}>
            CO₂: {inputs.co2EmissionsGkm ?? 0} g/km · {formatFuelType(inputs.fuelType)}
          </p>
        </div>

        {/* EEAI Card */}
        <div
          className="rounded-2xl p-5"
          style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4" style={{ color: theme.textMuted }} />
            <h4 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
              EEAI (EV Incentive)
            </h4>
          </div>
          {calculation.eeaiRebate !== 0 ? (
            <>
              <p className="text-2xl font-semibold font-mono tabular-nums text-emerald-500">
                ({formatCurrency(Math.abs(calculation.eeaiRebate))}) rebate
              </p>
              <p className="text-[11px] mt-2" style={{ color: theme.textMuted }}>
                45% of ARF, capped per VES period
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: theme.textMuted }}>
              {inputs.fuelType === 'electric' ? 'Not available for this VES period' : 'EV only incentive'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
