'use client'

import { useMemo } from 'react'
import { CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'

import type { VehicleScenario, VehicleCalculationResult } from '@/types/vehicle'
import { useColorScheme } from '@/stores'
import { formatCurrency } from '@/lib/format'
import { getVesBandLabel, isElectric } from '@/lib/vehicle/formatting'

interface CostBreakdownTabProps {
  scenario: VehicleScenario
  result: VehicleCalculationResult
}

interface WaterfallColumn {
  label: string
  value: number
  shortValue: string
  color: string
  isNegative?: boolean
  isTotal?: boolean
}

function formatCompactValue(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1000) return `$${Math.round(abs / 1000)}K`
  return `$${abs}`
}

export function CostBreakdownTab({ scenario, result }: CostBreakdownTabProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const inputs = scenario.inputs

  const cardClasses = clsx(
    'rounded-sm border',
    isMonet ? 'bg-white border-[#E8E6E1]' : 'bg-[#1A1A1D] border-[#2D2D33]'
  )

  if (inputs.condition === 'used') {
    return (
      <div className={clsx('p-8', isMonet ? 'bg-[#F7F6F3]' : 'bg-[#121214]')}>
        <div className={clsx(cardClasses, 'p-8 text-center')}>
          <p className={clsx('text-sm', isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]')}>
            Cost breakdown is available for new vehicles only. Used vehicles are purchased at the listed price of{' '}
            <span className="font-mono font-medium tabular-nums">
              {formatCurrency(inputs.listPrice)}
            </span>.
          </p>
        </div>
      </div>
    )
  }

  const waterfallColumns = useMemo<WaterfallColumn[]>(() => {
    const cols: WaterfallColumn[] = [
      { label: 'OMV', value: inputs.omv, shortValue: formatCompactValue(inputs.omv), color: '#E8E6E1' },
      { label: 'Excise', value: result.exciseDuty, shortValue: formatCompactValue(result.exciseDuty), color: '#6B7280' },
      { label: 'GST', value: result.gst, shortValue: formatCompactValue(result.gst), color: '#9CA3AF' },
      { label: 'ARF', value: result.arf, shortValue: formatCompactValue(result.arf), color: '#C53D43' },
      { label: 'COE', value: inputs.coePrice, shortValue: formatCompactValue(inputs.coePrice), color: '#E8E6E1' },
    ]

    if (result.vesAmount !== 0) {
      cols.push({
        label: 'VES',
        value: result.vesAmount,
        shortValue: result.vesAmount < 0 ? `(${formatCompactValue(result.vesAmount)})` : formatCompactValue(result.vesAmount),
        color: '#22C55E',
        isNegative: result.vesAmount < 0,
      })
    }

    cols.push({ label: 'Reg Fee', value: result.registrationFee, shortValue: `$${result.registrationFee}`, color: '#9CA3AF' })
    cols.push({
      label: 'Total',
      value: result.totalRegistrationCost,
      shortValue: formatCompactValue(result.totalRegistrationCost),
      color: '#C53D43',
      isTotal: true,
    })

    return cols
  }, [inputs, result])

  const maxValue = Math.max(...waterfallColumns.filter((c) => !c.isTotal).map((c) => Math.abs(c.value)))
  const chartHeight = 200

  // Cost composition for donut chart
  const compositionItems = useMemo(() => {
    const items = [
      { label: 'COE Premium', value: inputs.coePrice, color: '#E8E6E1' },
      { label: 'ARF', value: result.arf, color: '#C53D43' },
      { label: 'OMV', value: inputs.omv, color: '#9CA3AF' },
      { label: 'Excise Duty', value: result.exciseDuty, color: '#6B7280' },
      { label: 'GST', value: result.gst, color: '#4B5563' },
    ].filter((i) => i.value > 0)

    const total = items.reduce((sum, i) => sum + i.value, 0)
    return items.map((i) => ({ ...i, percent: Math.round((i.value / total) * 100) }))
  }, [inputs, result])

  const totalPositive = compositionItems.reduce((sum, i) => sum + i.value, 0)

  return (
    <div className={clsx(
      'p-8 space-y-6',
      isMonet ? 'bg-[#F7F6F3]' : 'bg-[#121214]'
    )}>
      {/* Waterfall Chart */}
      <div className={clsx(cardClasses, 'p-6')}>
        <h3 className={clsx(
          'text-lg font-semibold mb-5',
          isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
        )}>
          Registration Cost Breakdown
        </h3>

        {/* Waterfall bars */}
        <div className="flex gap-1.5 px-2" style={{ height: chartHeight }}>
          {waterfallColumns.map((col) => {
            const barHeight = col.isTotal
              ? (col.value / (maxValue * 1.1)) * chartHeight
              : (Math.abs(col.value) / (maxValue * 1.1)) * chartHeight
            const topOffset = col.isTotal
              ? chartHeight - barHeight
              : col.isNegative
                ? 0
                : chartHeight - barHeight

            return (
              <div key={col.label} className="flex-1 relative">
                <div
                  className="absolute left-0 right-0 rounded-t-sm"
                  style={{
                    height: Math.max(barHeight, 2),
                    top: col.isNegative ? undefined : topOffset,
                    bottom: col.isNegative ? chartHeight - barHeight : undefined,
                    backgroundColor: col.color,
                    opacity: col.isTotal ? undefined : (col.isNegative ? 0.8 : 1),
                    background: col.isTotal
                      ? `linear-gradient(180deg, ${col.color}, ${col.color}80)`
                      : undefined,
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* Labels under bars */}
        <div className="flex gap-1.5 px-2 mt-2">
          {waterfallColumns.map((col) => (
            <div key={col.label} className="flex-1 text-center space-y-0.5">
              <div className={clsx(
                'text-[10px]',
                col.isTotal ? 'text-[#C53D43] font-semibold' : isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]'
              )}>
                {col.label}
              </div>
              <div className={clsx(
                'text-[10px] font-mono font-medium tabular-nums',
                col.isTotal
                  ? 'text-[#C53D43]'
                  : col.isNegative
                    ? 'text-[#22C55E]'
                    : isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
              )}>
                {col.shortValue}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VES + EEAI Callouts (side by side) */}
      <div className="flex gap-5">
        {/* VES Callout */}
        <div className={clsx(cardClasses, 'flex-1 p-5')}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-[18px] w-[18px] text-[#22C55E]" />
            <span className={clsx(
              'text-sm font-semibold',
              isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
            )}>
              VES Rebate — {getVesBandLabel(inputs.co2EmissionsGkm, inputs.fuelType, inputs.vesPeriod)}
            </span>
          </div>
          <p className={clsx('text-xs leading-relaxed mb-3', isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]')}>
            Your vehicle qualifies for a {result.vesAmount < 0 ? 'rebate' : 'surcharge'} based on CO₂ emissions of {inputs.co2EmissionsGkm ?? 0} g/km ({getVesBandLabel(inputs.co2EmissionsGkm, inputs.fuelType, inputs.vesPeriod)}, {inputs.co2EmissionsGkm !== null && inputs.co2EmissionsGkm <= 160 ? '≤160 g/km' : '>160 g/km'}).
          </p>
          <div className="flex items-center justify-between">
            <span className={clsx('text-xs', isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]')}>Rebate Amount</span>
            <span className={clsx(
              'font-mono text-sm font-medium tabular-nums',
              result.vesAmount < 0 ? 'text-[#22C55E]' : 'text-[#C53D43]'
            )}>
              {result.vesAmount < 0 ? `(${formatCurrency(Math.abs(result.vesAmount))})` : formatCurrency(result.vesAmount)}
            </span>
          </div>
        </div>

        {/* EEAI Callout */}
        <div className={clsx(cardClasses, 'flex-1 p-5')}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className={clsx('h-[18px] w-[18px]', isElectric(inputs.fuelType) && result.eeaiRebate !== 0 ? 'text-[#22C55E]' : 'text-[#6B7280]')} />
            <span className={clsx(
              'text-sm font-semibold',
              isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
            )}>
              EEAI — {isElectric(inputs.fuelType) && result.eeaiRebate !== 0 ? 'Applied' : 'Not Applicable'}
            </span>
          </div>
          <p className={clsx('text-xs leading-relaxed mb-3', isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]')}>
            The EV Early Adoption Incentive (45% of ARF, capped at $15,000) applies only to fully electric vehicles. {isElectric(inputs.fuelType) ? 'Switch to Electric Fuel type to see this rebate.' : 'Not applicable for non-EV vehicles.'}
          </p>
          <div className="flex items-center justify-between">
            <span className={clsx('text-xs', isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]')}>EEAI Rebate</span>
            <span className={clsx(
              'font-mono text-sm font-medium tabular-nums',
              result.eeaiRebate !== 0 ? 'text-[#22C55E]' : isMonet ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
            )}>
              {result.eeaiRebate !== 0 ? `(${formatCurrency(Math.abs(result.eeaiRebate))})` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Cost Composition + Comparison (side by side) */}
      <div className="flex gap-5">
        {/* Donut Chart Card */}
        <div className={clsx(cardClasses, 'flex-1 p-6')}>
          <h3 className={clsx(
            'text-base font-semibold mb-4',
            isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
          )}>
            Cost Composition
          </h3>

          <div className="flex items-center gap-6">
            {/* SVG Donut */}
            <div className="relative shrink-0">
              <svg width="120" height="120" viewBox="0 0 120 120">
                {(() => {
                  let cumulativePercent = 0
                  const radius = 48
                  const circumference = 2 * Math.PI * radius
                  return compositionItems.map((item) => {
                    const dashArray = (item.percent / 100) * circumference
                    const dashOffset = -(cumulativePercent / 100) * circumference
                    cumulativePercent += item.percent
                    return (
                      <circle
                        key={item.label}
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke={item.color}
                        strokeWidth="12"
                        strokeDasharray={`${dashArray} ${circumference - dashArray}`}
                        strokeDashoffset={dashOffset}
                        transform="rotate(-90 60 60)"
                      />
                    )
                  })
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={clsx(
                  'text-sm font-mono font-medium tabular-nums',
                  isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
                )}>
                  {formatCompactValue(totalPositive)}
                </span>
                <span className={clsx('text-[9px]', isMonet ? 'text-[#9CA3AF]' : 'text-[#6B7280]')}>Total</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2">
              {compositionItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-[11px]">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className={isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]'}>
                    {item.label} — {item.percent}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* vs Average Comparison Card */}
        <div className={clsx(cardClasses, 'flex-1 p-6')}>
          <h3 className={clsx(
            'text-base font-semibold mb-4',
            isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
          )}>
            vs Average {inputs.vehicleCategory === 'car_cat_a' ? 'Cat A' : inputs.vehicleCategory === 'car_cat_b' ? 'Cat B' : 'Cat D'}
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={clsx('text-xs', isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]')}>Your Vehicle</span>
              <span className={clsx(
                'font-mono text-xs font-medium tabular-nums',
                isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
              )}>
                {formatCurrency(result.totalRegistrationCost)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={clsx('text-xs', isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]')}>
                Avg {inputs.vehicleCategory === 'car_cat_a' ? 'Cat A' : inputs.vehicleCategory === 'car_cat_b' ? 'Cat B' : 'Cat D'} (2024)
              </span>
              <span className={clsx(
                'font-mono text-xs font-medium tabular-nums',
                isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
              )}>
                {formatCurrency(210000)}
              </span>
            </div>
            <div className={clsx('h-px', isMonet ? 'bg-[#E8E6E1]' : 'bg-[#2D2D33]')} />
            <div className="flex items-center justify-between">
              <span className={clsx('text-xs font-medium', isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]')}>
                Difference
              </span>
              <span className={clsx(
                'font-mono text-xs font-medium tabular-nums',
                result.totalRegistrationCost < 210000 ? 'text-[#22C55E]' : 'text-[#C53D43]'
              )}>
                {result.totalRegistrationCost < 210000
                  ? `(${formatCurrency(210000 - result.totalRegistrationCost)})`
                  : `+${formatCurrency(result.totalRegistrationCost - 210000)}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
