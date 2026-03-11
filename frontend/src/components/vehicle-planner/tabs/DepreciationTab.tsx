'use client'

import { useMemo } from 'react'
import { Target } from 'lucide-react'
import clsx from 'clsx'

import type { VehicleScenario, VehicleCalculationResult } from '@/types/vehicle'
import { useColorScheme } from '@/stores'
import { formatCurrency } from '@/lib/format'

interface DepreciationTabProps {
  scenario: VehicleScenario
  result: VehicleCalculationResult
}

export function DepreciationTab({ scenario, result }: DepreciationTabProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const schedule = result.depreciationSchedule

  const registrationCost = scenario.inputs.condition === 'used'
    ? scenario.inputs.listPrice
    : result.totalRegistrationCost

  // Find optimal deregistration year
  const optimalYear = useMemo(() => {
    let bestYear = 1
    let smallestGap = Infinity
    for (const entry of schedule) {
      const gap = entry.marketValue - entry.scrapValue
      if (gap < smallestGap && entry.scrapValue > 0) {
        smallestGap = gap
        bestYear = entry.year
      }
    }
    return bestYear
  }, [schedule])

  const optimalEntry = schedule.find((e) => e.year === optimalYear)

  const cardClasses = clsx(
    'rounded-sm border',
    isMonet ? 'bg-white border-[#E8E6E1]' : 'bg-[#1A1A1D] border-[#2D2D33]'
  )

  // SVG line chart data
  const chartWidth = 800
  const chartHeight = 220
  const padding = { top: 20, right: 40, bottom: 30, left: 60 }
  const plotWidth = chartWidth - padding.left - padding.right
  const plotHeight = chartHeight - padding.top - padding.bottom

  const maxY = registrationCost
  const yearPoints = [{ year: 0, marketValue: registrationCost, scrapValue: registrationCost }, ...schedule]

  const getX = (year: number) => padding.left + (year / 10) * plotWidth
  const getY = (value: number) => padding.top + plotHeight - (value / maxY) * plotHeight

  const marketLine = yearPoints.map((p) => `${getX(p.year)},${getY(p.marketValue)}`).join(' ')
  const scrapLine = yearPoints.map((p) => `${getX(p.year)},${getY(p.scrapValue)}`).join(' ')

  // Y-axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    value: Math.round(maxY * pct),
    y: getY(maxY * pct),
  }))

  return (
    <div className={clsx(
      'p-8 space-y-6',
      isMonet ? 'bg-[#F7F6F3]' : 'bg-[#121214]'
    )}>
      {/* Line Chart Card */}
      <div className={cardClasses}>
        <div className="p-6">
          {/* Chart header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className={clsx(
              'text-base font-semibold',
              isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
            )}>
              Market Value vs Scrap Value
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-[10px]">
                <div className="h-0.5 w-4 bg-[#E8E6E1]" />
                <span className={isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]'}>Market Value</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <div className="h-0.5 w-4 bg-[#C53D43]" />
                <span className={isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]'}>Scrap Value</span>
              </div>
            </div>
          </div>

          {/* SVG Chart */}
          <div className={clsx(
            'rounded-sm border',
            isMonet ? 'bg-[#F7F6F3] border-[#E8E6E1]' : 'bg-[#1E1E22] border-[#2D2D33]'
          )}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" preserveAspectRatio="xMidYMid meet">
              {/* Grid lines */}
              {yLabels.map((label) => (
                <line
                  key={label.value}
                  x1={padding.left}
                  y1={label.y}
                  x2={chartWidth - padding.right}
                  y2={label.y}
                  stroke={isMonet ? '#E8E6E1' : '#2D2D33'}
                  strokeWidth="1"
                />
              ))}

              {/* Y-axis labels */}
              {yLabels.map((label) => (
                <text
                  key={label.value}
                  x={padding.left - 8}
                  y={label.y + 4}
                  textAnchor="end"
                  fill={isMonet ? '#9CA3AF' : '#6B7280'}
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {label.value >= 1000 ? `$${Math.round(label.value / 1000)}K` : `$${label.value}`}
                </text>
              ))}

              {/* X-axis labels */}
              {yearPoints.map((p) => (
                <text
                  key={p.year}
                  x={getX(p.year)}
                  y={chartHeight - 5}
                  textAnchor="middle"
                  fill={isMonet ? '#9CA3AF' : '#6B7280'}
                  fontSize="10"
                >
                  Y/{p.year}
                </text>
              ))}

              {/* Market value line */}
              <polyline
                points={marketLine}
                fill="none"
                stroke={isMonet ? '#2D2D2D' : '#E8E6E1'}
                strokeWidth="2"
              />

              {/* Scrap value line */}
              <polyline
                points={scrapLine}
                fill="none"
                stroke="#C53D43"
                strokeWidth="2"
              />

              {/* Optimal year marker */}
              <circle
                cx={getX(optimalYear)}
                cy={getY(optimalEntry?.marketValue ?? 0)}
                r="4"
                fill="#22C55E"
              />
              <circle
                cx={getX(optimalYear)}
                cy={getY(optimalEntry?.scrapValue ?? 0)}
                r="4"
                fill="#22C55E"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Optimal Deregistration Callout */}
      <div className={clsx(
        'rounded-sm border p-4 flex items-start gap-3',
        'border-[#22C55E]/25 bg-[#22C55E]/[0.06]'
      )}>
        <Target className="h-[18px] w-[18px] text-[#22C55E] mt-0.5 shrink-0" />
        <div>
          <p className={clsx(
            'text-sm font-semibold',
            isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
          )}>
            Optimal Deregistration: Year {optimalYear}
          </p>
          <p className={clsx('text-xs mt-0.5', isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]')}>
            Smallest gap between market value ({formatCurrency(optimalEntry?.marketValue ?? 0)}) and scrap value ({formatCurrency(optimalEntry?.scrapValue ?? 0)}). Net depreciation cost: {formatCurrency((optimalEntry?.marketValue ?? 0) - (optimalEntry?.scrapValue ?? 0))}.
          </p>
        </div>
      </div>

      {/* Year-by-Year Schedule Table */}
      <div className={cardClasses}>
        {/* Table header title */}
        <div className={clsx(
          'flex items-center justify-between px-5 py-4 border-b',
          isMonet ? 'border-[#E8E6E1]' : 'border-[#2D2D33]'
        )}>
          <h3 className={clsx(
            'text-base font-semibold',
            isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
          )}>
            Year-by-Year Schedule
          </h3>
        </div>

        {/* Column headers */}
        <div className={clsx(
          'flex items-center px-5 py-3 border-b text-xs font-medium',
          isMonet ? 'bg-[#F7F6F3] border-[#E8E6E1] text-[#6B7280]' : 'bg-[#121214] border-[#2D2D33] text-[#6B7280]'
        )}>
          <div className="w-12">Year</div>
          <div className="flex-1 text-right">Market Value</div>
          <div className="flex-1 text-right">PARF Rebate</div>
          <div className="flex-1 text-right">COE Rebate</div>
          <div className="flex-1 text-right">Scrap Value</div>
          <div className="flex-1 text-right">Depreciation</div>
        </div>

        {/* Data rows */}
        {schedule.map((entry) => {
          const isOptimal = entry.year === optimalYear
          return (
            <div
              key={entry.year}
              className={clsx(
                'flex items-center px-5 py-2.5 border-b last:border-b-0 text-xs',
                isMonet ? 'border-[#E8E6E1]' : 'border-[#2D2D33]',
                isOptimal && 'bg-[#22C55E]/[0.03]'
              )}
            >
              <div className={clsx(
                'w-12 font-medium',
                isOptimal ? 'text-[#22C55E]' : isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
              )}>
                {entry.year}
              </div>
              <div className={clsx(
                'flex-1 text-right font-mono tabular-nums',
                isOptimal ? 'text-[#22C55E] font-medium' : isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
              )}>
                {formatCurrency(entry.marketValue)}
              </div>
              <div className={clsx('flex-1 text-right font-mono tabular-nums', isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]')}>
                {entry.parfRebate > 0 ? formatCurrency(entry.parfRebate) : '—'}
              </div>
              <div className={clsx('flex-1 text-right font-mono tabular-nums', isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]')}>
                {entry.coeRebate > 0 ? formatCurrency(entry.coeRebate) : '—'}
              </div>
              <div className={clsx(
                'flex-1 text-right font-mono tabular-nums font-medium',
                isOptimal ? 'text-[#22C55E]' : isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
              )}>
                {formatCurrency(entry.scrapValue)}
              </div>
              <div className={clsx(
                'flex-1 text-right font-mono tabular-nums',
                'text-[#C53D43]'
              )}>
                ({formatCurrency(entry.annualDepreciation)})
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
