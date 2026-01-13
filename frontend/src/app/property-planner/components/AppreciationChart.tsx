'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import type { AppreciationPeriod } from '../types'
import { formatCurrency, formatCompactCurrency } from '../hooks/useCalculations'

export interface AppreciationDataPoint {
  year: number
  yearLabel: string
  propertyValue: number
  rate: number
  periodId: string
}

interface AppreciationChartProps {
  initialPrice: number
  purchaseDate: string
  saleDate: string
  appreciationPeriods: AppreciationPeriod[]
}

/**
 * Calculate appreciation data points from purchase to sale date
 */
function calculateAppreciationCurve(
  initialPrice: number,
  purchaseDate: string,
  saleDate: string,
  periods: AppreciationPeriod[]
): AppreciationDataPoint[] {
  const purchaseYear = new Date(purchaseDate + '-01').getFullYear()
  const saleYear = new Date(saleDate + '-01').getFullYear()
  const saleMonth = new Date(saleDate + '-01').getMonth()

  // Calculate total years (including partial year at end)
  const totalYears = Math.max(1, saleYear - purchaseYear + (saleMonth > 0 ? 1 : 0))

  const dataPoints: AppreciationDataPoint[] = []
  let currentValue = initialPrice

  // Add initial point (Year 0 / Purchase)
  dataPoints.push({
    year: 0,
    yearLabel: 'Purchase',
    propertyValue: Math.round(currentValue),
    rate: 0,
    periodId: 'initial',
  })

  for (let year = 1; year <= totalYears; year++) {
    // Find the active period for this year
    const activePeriod = periods.find((period) => {
      const startsBeforeOrAt = period.startYear <= year
      const endsAfterOrAt = period.endYear === null || period.endYear >= year
      return startsBeforeOrAt && endsAfterOrAt
    }) || periods[periods.length - 1] // Fallback to last period

    const rate = activePeriod?.rate || 0

    // Apply compound growth for this year
    currentValue = currentValue * (1 + rate / 100)

    dataPoints.push({
      year,
      yearLabel: `Year ${year}`,
      propertyValue: Math.round(currentValue),
      rate,
      periodId: activePeriod?.id || 'unknown',
    })
  }

  return dataPoints
}

/**
 * AppreciationChart - Displays property value growth over time as an area chart.
 */
export function AppreciationChart({
  initialPrice,
  purchaseDate,
  saleDate,
  appreciationPeriods,
}: AppreciationChartProps) {
  const dataPoints = calculateAppreciationCurve(
    initialPrice,
    purchaseDate,
    saleDate,
    appreciationPeriods
  )

  if (dataPoints.length <= 1) return null

  const maxValue = Math.max(...dataPoints.map((d) => d.propertyValue))
  const minValue = Math.min(...dataPoints.map((d) => d.propertyValue))
  const yDomain: [number, number] = [
    Math.floor(minValue * 0.95),
    Math.ceil(maxValue * 1.05),
  ]

  // Find period transition points for reference lines
  const transitionYears = appreciationPeriods
    .filter((p) => p.startYear > 1)
    .map((p) => p.startYear)

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={dataPoints}
          margin={{ bottom: 24, left: 8, right: 8, top: 8 }}
        >
          <defs>
            <linearGradient id="appreciationGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
          <XAxis
            dataKey="year"
            type="number"
            domain={[0, dataPoints.length - 1]}
            ticks={dataPoints.map((d) => d.year).filter((_, i, arr) =>
              i === 0 || i === arr.length - 1 || i % Math.ceil(arr.length / 6) === 0
            )}
            allowDecimals={false}
            stroke="#64748b"
            fontSize={10}
            tickMargin={8}
            tickFormatter={(value) => value === 0 ? 'Buy' : `Y${value}`}
          />
          <YAxis
            stroke="#64748b"
            fontSize={10}
            tickFormatter={(value) => formatCompactCurrency(value as number)}
            width={55}
            domain={yDomain}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 40, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              backdropFilter: 'blur(12px)',
              padding: '8px 12px',
            }}
            labelFormatter={(value) => {
              const point = dataPoints.find((d) => d.year === value)
              return point?.yearLabel || `Year ${value}`
            }}
            formatter={(value, _name, props) => {
              const rate = (props as { payload?: AppreciationDataPoint }).payload?.rate
              return [
                <span key="value">
                  {formatCurrency(Number(value) || 0)}
                  {rate !== undefined && rate > 0 && (
                    <span className="text-emerald-400 ml-2 text-xs">
                      +{rate}%/yr
                    </span>
                  )}
                </span>,
                'Value',
              ]
            }}
          />
          {/* Reference lines for period transitions */}
          {transitionYears.map((year) => (
            <ReferenceLine
              key={year}
              x={year}
              stroke="rgba(255,255,255,0.15)"
              strokeDasharray="4 4"
            />
          ))}
          <Area
            dataKey="propertyValue"
            type="monotone"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#appreciationGradient)"
            name="Property Value"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export { calculateAppreciationCurve }
