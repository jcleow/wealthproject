import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { ChartDataPoint, VisibleAccounts, ThresholdAges, Milestone } from './types'
import { ACCOUNT_COLORS } from './types'
import { BalanceTooltipContent } from './TooltipContent'
import { RetirementSavingsDot, MADot } from './MilestoneDots'
import { generateAgeTicks } from './utils'

/** Chart margins - must match ComposedChart margin prop */
const CHART_MARGIN = { top: 40, right: 30, left: 0, bottom: 0 }
/** Approximate width of Y-axis labels area */
const Y_AXIS_WIDTH = 50

interface BalanceChartProps {
  data: ChartDataPoint[]
  visibleAccounts: VisibleAccounts
  thresholdAges: ThresholdAges
  milestones: Milestone[]
  selectedAge?: number
  onAgeSelect?: (age: number) => void
  /** FRS annual growth rate for threshold projections */
  frsGrowthRate?: number
}

export function BalanceChart({
  data,
  visibleAccounts,
  thresholdAges,
  milestones,
  selectedAge,
  onAgeSelect,
  frsGrowthRate = 0.035,
}: BalanceChartProps) {
  const startAge = data[0]?.age ?? 0
  const endAge = data[data.length - 1]?.age ?? 100
  const ticks = generateAgeTicks(startAge, endAge)

  // Refs for drag handling
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  // Calculate age from mouse X position
  const calculateAgeFromX = useCallback((clientX: number): number | null => {
    if (!containerRef.current || data.length === 0) return null

    const rect = containerRef.current.getBoundingClientRect()
    // Account for Y-axis labels on the left and right margin
    const leftOffset = CHART_MARGIN.left + Y_AXIS_WIDTH
    const chartWidth = rect.width - leftOffset - CHART_MARGIN.right
    const relativeX = clientX - rect.left - leftOffset

    // Clamp to chart area
    const clampedX = Math.max(0, Math.min(chartWidth, relativeX))
    const ratio = clampedX / chartWidth

    // Map ratio to age range
    const age = Math.round(startAge + ratio * (endAge - startAge))
    return Math.max(startAge, Math.min(endAge, age))
  }, [data.length, startAge, endAge])

  // Mouse event handlers for the wrapper div
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onAgeSelect) return

    isDraggingRef.current = true
    setIsDragging(true)

    const age = calculateAgeFromX(e.clientX)
    if (age !== null) {
      onAgeSelect(age)
    }
  }, [onAgeSelect, calculateAgeFromX])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current || !onAgeSelect) return

    const age = calculateAgeFromX(e.clientX)
    if (age !== null) {
      onAgeSelect(age)
    }
  }, [onAgeSelect, calculateAgeFromX])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
    setIsDragging(false)
  }, [])

  // Handle mouse up outside the component
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        setIsDragging(false)
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  // Click handler for Recharts (for tooltip interaction)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartClick = useCallback((chartData: any) => {
    if (chartData?.activePayload?.[0]?.payload && onAgeSelect) {
      onAgeSelect(chartData.activePayload[0].payload.age)
    }
  }, [onAgeSelect])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={CHART_MARGIN}
          onClick={handleChartClick}
        >
        <defs>
          <linearGradient id="oaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ACCOUNT_COLORS.oa} stopOpacity={0.3} />
            <stop offset="95%" stopColor={ACCOUNT_COLORS.oa} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="saGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ACCOUNT_COLORS.sa} stopOpacity={0.3} />
            <stop offset="95%" stopColor={ACCOUNT_COLORS.sa} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="maGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ACCOUNT_COLORS.ma} stopOpacity={0.3} />
            <stop offset="95%" stopColor={ACCOUNT_COLORS.ma} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="raGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ACCOUNT_COLORS.ra} stopOpacity={0.3} />
            <stop offset="95%" stopColor={ACCOUNT_COLORS.ra} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />

        <XAxis
          dataKey="age"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          ticks={ticks}
        />

        <YAxis
          domain={['dataMin', 'dataMax']}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatYAxis}
        />

        <Tooltip
          content={({ active, payload }) => {
            // Hide tooltip while dragging to avoid interference
            if (isDragging || !active || !payload?.[0]) return null
            return (
              <BalanceTooltipContent
                data={payload[0].payload}
                visibleAccounts={visibleAccounts}
                frsGrowthRate={frsGrowthRate}
              />
            )
          }}
        />

        {milestones.map((m) => (
          <ReferenceLine
            key={m.age}
            x={m.age}
            stroke={m.color}
            strokeDasharray="5 5"
            label={{
              value: m.label,
              fill: m.color,
              fontSize: 11,
              fontWeight: 600,
              position: 'top',
            }}
          />
        ))}

        {/* Selected age indicator line */}
        {selectedAge !== undefined && (
          <ReferenceLine
            x={selectedAge}
            stroke="rgba(148, 163, 184, 0.6)"
            strokeWidth={1.5}
            label={{
              value: `Age ${selectedAge}`,
              fill: '#94a3b8',
              fontSize: 10,
              fontWeight: 500,
              position: 'top',
            }}
          />
        )}

        {visibleAccounts.oa && (
          <Area
            type="monotone"
            dataKey="oa"
            stackId="0"
            stroke={ACCOUNT_COLORS.oa}
            fill="url(#oaGradient)"
            strokeWidth={2}
          />
        )}

        {visibleAccounts.sa && (
          <Area
            type="monotone"
            dataKey="sa"
            stackId="1"
            stroke={ACCOUNT_COLORS.sa}
            fill="url(#saGradient)"
            strokeWidth={2}
          />
        )}

        {visibleAccounts.ma && (
          <Area
            type="monotone"
            dataKey="ma"
            stackId="2"
            stroke={ACCOUNT_COLORS.ma}
            fill="url(#maGradient)"
            strokeWidth={2}
            dot={(props) => <MADot {...props} thresholdAges={thresholdAges} />}
            activeDot={false}
          />
        )}

        {visibleAccounts.ra && (
          <Area
            type="monotone"
            dataKey="ra"
            stackId="3"
            stroke={ACCOUNT_COLORS.ra}
            fill="url(#raGradient)"
            strokeWidth={2}
          />
        )}

        {visibleAccounts.oaSa && (
          <Line
            type="monotone"
            dataKey="retirementSavings"
            stroke={ACCOUNT_COLORS.oaSa}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={(props) => <RetirementSavingsDot {...props} thresholdAges={thresholdAges} />}
            activeDot={false}
            connectNulls={false}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
    </div>
  )
}

function formatYAxis(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  return `$${(value / 1000).toFixed(0)}K`
}
