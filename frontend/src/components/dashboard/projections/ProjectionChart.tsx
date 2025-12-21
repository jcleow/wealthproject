import {
  Area,
  Bar,
  ComposedChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import ScenarioMarker from '../ScenarioMarker'
import { CustomTooltip } from './CustomTooltip'
import { YearTick } from './YearTick'
import { chartColors, AREA_ANIMATION_MS, type AxisMode, type ProjectionPoint } from './types'
import { type ChartType, type MetricId, getMetricConfig } from './chartOverlays'
import type { ScenarioMarkerData } from './useProjectionData'
import type { ScenarioEvent } from '@/types/scenario'
import type { TimeResolution } from '@/types/timeline'

export interface ProjectionChartProps {
  displayData: ProjectionPoint[]
  enhancedDisplayData: ProjectionPoint[]
  enableChartOverlays: boolean
  chartType: ChartType
  selectedMetrics: MetricId[]
  areaAnimationEnabled: boolean
  ticks: number[]
  overrideYearsSet: Set<number>
  onSelectYear?: (year: number) => void
  onSelectMonth?: (month: number) => void
  selectedYear?: number
  xAxisMode: AxisMode
  startingAge?: number
  dataResolution: TimeResolution
  visibleRangeMonths: number
  baseCalendarYear: number
  scenarioMarkers: ScenarioMarkerData[]
  onScenarioSelect?: (event: ScenarioEvent) => void
  markersReady: boolean
  prefersReducedMotion: boolean
}

/**
 * The main chart component using Recharts.
 * Renders the projection area/line/bar chart with scenario markers.
 */
export function ProjectionChart({
  displayData,
  enhancedDisplayData,
  enableChartOverlays,
  chartType,
  selectedMetrics,
  areaAnimationEnabled,
  ticks,
  overrideYearsSet,
  onSelectYear,
  onSelectMonth,
  selectedYear,
  xAxisMode,
  startingAge,
  dataResolution,
  visibleRangeMonths,
  baseCalendarYear,
  scenarioMarkers,
  onScenarioSelect,
  markersReady,
  prefersReducedMotion,
}: ProjectionChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={200}>
      <ComposedChart
        data={enableChartOverlays ? enhancedDisplayData : displayData}
        margin={{ top: 20, right: 8, left: 8, bottom: 12 }}
      >
        <defs>
          {enableChartOverlays ? (
            // Generate gradients for all selected metrics
            selectedMetrics.map((metricId) => {
              const config = getMetricConfig(metricId)
              if (!config) return null
              return (
                <linearGradient
                  key={config.gradientId}
                  id={config.gradientId}
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={config.color} stopOpacity={0.7} />
                  <stop offset="90%" stopColor={config.color} stopOpacity={0.05} />
                </linearGradient>
              )
            })
          ) : (
            // Original single gradient
            <linearGradient id="netWorthGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={chartColors.gradientStart} stopOpacity={0.8} />
              <stop offset="90%" stopColor={chartColors.gradientEnd} stopOpacity={0.05} />
            </linearGradient>
          )}
        </defs>

        <CartesianGrid
          stroke={chartColors.grid}
          strokeDasharray="2 12"
          horizontal={false}
          fillOpacity={0}
        />

        <XAxis
          type="number"
          axisLine={false}
          dataKey="yearIndex"
          fontSize={12}
          interval={0}
          ticks={ticks}
          allowDecimals={false}
          allowDataOverflow
          stroke={chartColors.axis}
          tickLine={false}
          tick={
            <YearTick
              overrideYears={overrideYearsSet}
              onSelectYear={onSelectYear}
              onSelectMonth={onSelectMonth}
              selectedYear={selectedYear}
              mode={xAxisMode}
              startingAge={startingAge}
              resolution={dataResolution}
              visibleRangeMonths={visibleRangeMonths}
              baseCalendarYear={baseCalendarYear}
            />
          }
        />

        <YAxis
          axisLine={false}
          domain={[
            (dataMin: number) => Math.min(0, Math.floor(dataMin * 1.05)),
            (dataMax: number) => (dataMax > 0 ? Math.ceil(dataMax * 1.1) : 500000),
          ]}
          fontSize={12}
          stroke={chartColors.axis}
          tickFormatter={(value) => {
            if (value <= 0) return ''
            if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
            if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
            return `$${value}`
          }}
          tickLine={false}
        />

        {/* Chart rendering - conditional based on feature flag */}
        {enableChartOverlays ? (
          // Dynamic chart elements based on selected metrics and chart type
          selectedMetrics.map((metricId, index) => {
            const config = getMetricConfig(metricId)
            if (!config) return null

            const commonProps = {
              dataKey: metricId,
              name: config.label,
              isAnimationActive: areaAnimationEnabled,
              animationDuration: AREA_ANIMATION_MS,
              animationEasing: 'ease-out' as const,
              animationBegin: index * 50,
            }

            if (chartType === 'bar') {
              return (
                <Bar
                  key={metricId}
                  {...commonProps}
                  fill={config.color}
                  fillOpacity={0.7}
                  radius={[2, 2, 0, 0]}
                />
              )
            }

            if (chartType === 'line') {
              return (
                <Line
                  key={metricId}
                  {...commonProps}
                  type="monotone"
                  stroke={config.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: config.color, strokeWidth: 0 }}
                />
              )
            }

            // Default: area chart
            return (
              <Area
                key={metricId}
                {...commonProps}
                type="monotone"
                fill={`url(#${config.gradientId})`}
                stroke={config.color}
                strokeWidth={2}
                strokeOpacity={0.85}
                dot={false}
                activeDot={{ r: 4, fill: config.color, strokeWidth: 0 }}
              />
            )
          })
        ) : (
          // Original single net worth area chart
          <Area
            data={displayData}
            activeDot={{ r: 5, fill: chartColors.stroke, strokeWidth: 0 }}
            dataKey="netWorth"
            dot={false}
            fill="url(#netWorthGradient)"
            stroke={chartColors.stroke}
            strokeWidth={2.5}
            strokeOpacity={0.85}
            type="monotone"
            name="Net Worth"
            isAnimationActive={areaAnimationEnabled}
            animationDuration={AREA_ANIMATION_MS}
            animationEasing="ease-out"
            animationBegin={0}
          />
        )}

        <Tooltip
          content={
            <CustomTooltip
              startingAge={startingAge}
              resolution={dataResolution}
              selectedMetrics={enableChartOverlays ? selectedMetrics : undefined}
            />
          }
          cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
        />

        {scenarioMarkers.length > 0 && (
          <Scatter
            data={scenarioMarkers}
            dataKey="netWorth"
            xAxisId={0}
            yAxisId={0}
            fill="#8884d8"
            shape={({ cx = 0, cy = 0, payload }: any) => (
              <ScenarioMarker
                cx={cx}
                cy={cy}
                events={payload?.events ?? []}
                yearIndex={payload?.yearIndex ?? 0}
                onSelectYear={onSelectYear}
                onScenarioSelect={onScenarioSelect}
                visible={markersReady}
                animate={!prefersReducedMotion}
              />
            )}
            isAnimationActive={false}
            style={{ pointerEvents: markersReady ? 'auto' : 'none' }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
