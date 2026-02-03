'use client'

import { useMemo, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  type ChartOptions,
  type ChartData,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { Shield, HeartPulse, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type CoverageProjectionYear,
  type CoverageMilestone,
  formatCoverageAmount,
} from '@/lib/coverage-journey-utils'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip
)

// =============================================================================
// Types
// =============================================================================

interface CoverageNeedsCurveProps {
  projections: CoverageProjectionYear[]
  milestones: CoverageMilestone[]
  currentAge: number
  selectedAge: number
  onAgeSelect: (age: number) => void
  className?: string
}

// =============================================================================
// Chart Colors
// =============================================================================

const CHART_COLORS = {
  lifeTpd: {
    line: 'rgb(16, 185, 129)', // emerald-500
    fill: 'rgba(16, 185, 129, 0.15)',
  },
  criticalIllness: {
    line: 'rgb(59, 130, 246)', // blue-500
    fill: 'rgba(59, 130, 246, 0.1)',
  },
  personalAccident: {
    line: 'rgb(168, 85, 247)', // purple-500
    fill: 'rgba(168, 85, 247, 0.08)',
  },
  grid: 'rgba(255, 255, 255, 0.04)',
  axis: 'rgb(100, 116, 139)', // slate-500
  currentAge: 'rgba(16, 185, 129, 0.8)',
  selectedAge: 'rgba(255, 255, 255, 0.3)',
}

// =============================================================================
// Component
// =============================================================================

export function CoverageNeedsCurve({
  projections,
  milestones,
  currentAge,
  selectedAge,
  onAgeSelect,
  className,
}: CoverageNeedsCurveProps) {
  const chartRef = useRef<ChartJS<'line'> | null>(null)

  // Find current age index
  const currentAgeIndex = useMemo(() => {
    return projections.findIndex(p => p.age === currentAge)
  }, [projections, currentAge])

  // Chart data
  const chartData: ChartData<'line'> = useMemo(() => {
    const labels = projections.map(p => p.age.toString())

    return {
      labels,
      datasets: [
        {
          label: 'Life/TPD',
          data: projections.map(p => p.recommendedLifeTpd),
          borderColor: CHART_COLORS.lifeTpd.line,
          backgroundColor: CHART_COLORS.lifeTpd.fill,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: CHART_COLORS.lifeTpd.line,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          borderWidth: 2,
        },
        {
          label: 'Critical Illness',
          data: projections.map(p => p.recommendedCriticalIllness),
          borderColor: CHART_COLORS.criticalIllness.line,
          backgroundColor: CHART_COLORS.criticalIllness.fill,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: CHART_COLORS.criticalIllness.line,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          borderWidth: 1.5,
        },
        {
          label: 'Personal Accident',
          data: projections.map(p => p.recommendedPersonalAccident),
          borderColor: CHART_COLORS.personalAccident.line,
          backgroundColor: CHART_COLORS.personalAccident.fill,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: CHART_COLORS.personalAccident.line,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          borderWidth: 1,
        },
      ],
    }
  }, [projections])

  // Chart options
  const chartOptions: ChartOptions<'line'> = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      onClick: (_event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index
          const age = projections[index]?.age
          if (age !== undefined) {
            onAgeSelect(age)
          }
        }
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(15, 23, 40, 0.95)',
          titleColor: '#fff',
          bodyColor: 'rgb(148, 163, 184)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            title: (items) => {
              if (items.length > 0) {
                const age = projections[items[0].dataIndex]?.age
                const isCurrent = age === currentAge
                return `Age ${age}${isCurrent ? ' (Current)' : ''}`
              }
              return ''
            },
            label: (context) => {
              const value = context.raw as number
              return ` ${context.dataset.label}: ${formatCoverageAmount(value)}`
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: CHART_COLORS.grid,
            drawTicks: false,
          },
          ticks: {
            color: CHART_COLORS.axis,
            font: {
              size: 11,
            },
            maxRotation: 0,
            callback: function(_value, index) {
              const age = projections[index]?.age
              // Show every 5 years
              if (age !== undefined && age % 5 === 0) {
                return age
              }
              return ''
            },
          },
          border: {
            display: false,
          },
        },
        y: {
          grid: {
            color: CHART_COLORS.grid,
            drawTicks: false,
          },
          ticks: {
            color: CHART_COLORS.axis,
            font: {
              size: 11,
            },
            callback: (value) => formatCoverageAmount(value as number),
            maxTicksLimit: 6,
          },
          border: {
            display: false,
          },
          beginAtZero: true,
        },
      },
    }
  }, [projections, currentAge, onAgeSelect])

  // Calculate slider position
  const minAge = projections[0]?.age ?? 25
  const maxAge = projections[projections.length - 1]?.age ?? 75
  const sliderPercent = ((selectedAge - minAge) / (maxAge - minAge)) * 100

  return (
    <div className={cn('space-y-4', className)}>
      {/* Chart */}
      <div className="relative h-[280px] rounded-xl bg-black/20 p-3">
        <Line ref={chartRef} data={chartData} options={chartOptions} />

        {/* Current age indicator */}
        {currentAgeIndex >= 0 && (
          <div
            className="absolute top-3 bottom-3 w-px bg-emerald-500/50 pointer-events-none"
            style={{
              left: `calc(${(currentAgeIndex / (projections.length - 1)) * 100}% + 12px)`,
            }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] font-medium text-emerald-400 whitespace-nowrap">
              You
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-emerald-500" />
          <div className="w-3 h-0.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-400">Life/TPD</span>
        </div>
        <div className="flex items-center gap-2">
          <HeartPulse className="h-3.5 w-3.5 text-blue-500" />
          <div className="w-3 h-0.5 rounded-full bg-blue-500" />
          <span className="text-xs text-slate-400">Critical Illness</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-purple-500" />
          <div className="w-3 h-0.5 rounded-full bg-purple-500" />
          <span className="text-xs text-slate-400">Personal Accident</span>
        </div>
      </div>

      {/* Age Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Explore coverage at different ages</span>
          <span className="font-medium text-slate-300">Age {selectedAge}</span>
        </div>

        <div className="relative px-2">
          {/* Track */}
          <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
            {/* Filled portion */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500/30 to-emerald-500/10"
              style={{ width: `${sliderPercent}%` }}
            />

            {/* Milestone markers */}
            {milestones.map((milestone, idx) => {
              const milestonePercent = ((milestone.age - minAge) / (maxAge - minAge)) * 100
              if (milestonePercent < 0 || milestonePercent > 100) return null

              return (
                <div
                  key={idx}
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-500/70"
                  style={{ left: `${milestonePercent}%` }}
                  title={milestone.event}
                />
              )
            })}
          </div>

          {/* Slider Input */}
          <input
            type="range"
            min={minAge}
            max={maxAge}
            value={selectedAge}
            onChange={(e) => onAgeSelect(parseInt(e.target.value, 10))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          {/* Custom Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-emerald-500 shadow-lg pointer-events-none transition-transform hover:scale-110"
            style={{ left: `${sliderPercent}%` }}
          />

          {/* Age Labels */}
          <div className="flex justify-between mt-2 text-[10px] text-slate-600">
            <span>{minAge}</span>
            <span>{maxAge}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
