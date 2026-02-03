'use client'

import { useMemo, useState, useRef, useCallback } from 'react'
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
import { Shield, HeartPulse, Zap, AlertCircle, CheckCircle2, Calendar, GraduationCap, Home, Sunset } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePersonsQuery } from '@/hooks/queries/usePersonsQuery'
import { useQuestionnaireAutoPopulate } from '@/hooks/useQuestionnaireAutoPopulate'
import { usePersonFilter } from '@/contexts/PersonFilterContext'
import { useColorScheme } from '@/stores'
import { PersonSelector } from '@/components/ui/PersonSelector'
import { getInsuranceTheme } from '@/lib/insurance-theme'
import {
  generateCoverageProjection,
  calculateMilestones,
  calculateAge,
  formatCoverageAmount,
  type PersonCoverageContext,
  type CoverageMilestone,
  type CoverageProjectionYear,
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

interface JourneyTabProps {
  className?: string
}

// =============================================================================
// Coverage Comparison (Light Theme)
// =============================================================================

function CoverageComparisonLight({
  recommendedLifeTpd,
  recommendedCriticalIllness,
  recommendedPersonalAccident,
}: {
  recommendedLifeTpd: number
  recommendedCriticalIllness: number
  recommendedPersonalAccident: number
}) {
  const colorScheme = useColorScheme()
  const monetColors = getInsuranceTheme(colorScheme)

  const categories = [
    { name: 'Life/TPD', icon: Shield, recommended: recommendedLifeTpd, current: 0 },
    { name: 'Critical Illness', icon: HeartPulse, recommended: recommendedCriticalIllness, current: 0 },
    { name: 'Personal Accident', icon: Zap, recommended: recommendedPersonalAccident, current: 0 },
  ]

  return (
    <div className="space-y-3">
      {/* Header */}
      <div
        className="flex items-center gap-4 pb-2"
        style={{ borderBottom: '1px solid rgba(155, 139, 180, 0.15)' }}
      >
        <div className="flex-1 text-xs font-medium" style={{ color: monetColors.textMuted }}>
          Category
        </div>
        <div className="w-28 text-right text-xs font-medium" style={{ color: monetColors.textMuted }}>
          Recommended
        </div>
        <div className="w-28 text-right text-xs font-medium" style={{ color: monetColors.textMuted }}>
          Current
        </div>
        <div className="w-28 text-right text-xs font-medium" style={{ color: monetColors.textMuted }}>
          Status
        </div>
      </div>

      {/* Rows */}
      {categories.map((cat) => {
        const Icon = cat.icon
        const gap = cat.recommended - cat.current
        const hasGap = gap > 0

        return (
          <div
            key={cat.name}
            className="flex items-center gap-4 py-3"
            style={{ borderBottom: '1px solid rgba(155, 139, 180, 0.08)' }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Icon className="h-4 w-4" style={{ color: monetColors.lavender }} />
              <span className="text-sm" style={{ color: monetColors.textSecondary }}>
                {cat.name}
              </span>
            </div>
            <div className="w-28 text-right">
              <span
                className="text-sm font-mono"
                style={{ color: monetColors.textMuted }}
              >
                {formatCoverageAmount(cat.recommended)}
              </span>
            </div>
            <div className="w-28 text-right">
              <span
                className="text-sm font-mono"
                style={{ color: monetColors.textPrimary }}
              >
                {formatCoverageAmount(cat.current)}
              </span>
            </div>
            <div className="w-28 flex items-center justify-end gap-1.5">
              {hasGap ? (
                <>
                  <AlertCircle className="h-3.5 w-3.5" style={{ color: monetColors.coralRose }} />
                  <span className="text-xs font-medium" style={{ color: monetColors.coralRose }}>
                    Gap: {formatCoverageAmount(gap)}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: monetColors.sage }} />
                  <span className="text-xs font-medium" style={{ color: monetColors.sage }}>
                    On Target
                  </span>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// =============================================================================
// Milestone Cards (Light Theme)
// =============================================================================

function getMilestoneIcon(category: CoverageMilestone['category']) {
  switch (category) {
    case 'dependent':
      return GraduationCap
    case 'debt':
      return Home
    case 'retirement':
      return Sunset
    default:
      return Calendar
  }
}

function getMilestoneColor(category: CoverageMilestone['category'], theme: ReturnType<typeof getInsuranceTheme>, isMonet: boolean) {
  switch (category) {
    case 'dependent':
      return {
        bg: isMonet ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.15)',
        border: 'rgba(59, 130, 246, 0.25)',
        text: '#3B82F6',
      }
    case 'debt':
      return {
        bg: isMonet ? `${theme.sage}18` : `${theme.sage}20`,
        border: `${theme.sage}35`,
        text: theme.sage,
      }
    case 'retirement':
      return {
        bg: isMonet ? `${theme.sunlightGold}25` : `${theme.amber}20`,
        border: isMonet ? `${theme.sunlightGold}40` : `${theme.amber}35`,
        text: isMonet ? '#8A7A5A' : theme.amber,
      }
    default:
      return {
        bg: `${theme.lavender}15`,
        border: `${theme.lavender}25`,
        text: theme.lavender,
      }
  }
}

function MilestoneAlertsLight({
  milestones,
  currentYear,
}: {
  milestones: CoverageMilestone[]
  currentYear: number
}) {
  const colorScheme = useColorScheme()
  const monetColors = getInsuranceTheme(colorScheme)
  const isMonet = colorScheme === 'monet'

  if (milestones.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm" style={{ color: monetColors.textMuted }}>
          No upcoming milestones detected
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {milestones.map((milestone, idx) => {
        const Icon = getMilestoneIcon(milestone.category)
        const colors = getMilestoneColor(milestone.category, monetColors, isMonet)
        const yearsAway = milestone.year - currentYear

        return (
          <div
            key={idx}
            className="px-4 py-3 rounded-xl transition-all duration-200 hover:shadow-md"
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ background: monetColors.surfaceBg }}
              >
                <Icon className="h-4 w-4" style={{ color: colors.text }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium" style={{ color: monetColors.textMuted }}>
                    {milestone.year}
                  </span>
                  <span className="text-[10px]" style={{ color: monetColors.textMuted }}>•</span>
                  <span className="text-[10px]" style={{ color: monetColors.textMuted }}>
                    {yearsAway === 1 ? 'In 1 year' : `In ${yearsAway} years`}
                  </span>
                </div>

                <h4
                  className="text-sm font-medium mb-0.5"
                  style={{ color: monetColors.textPrimary }}
                >
                  {milestone.event}
                </h4>

                <p className="text-xs" style={{ color: monetColors.textSecondary }}>
                  {milestone.description}
                </p>

                <div
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg mt-2 text-xs"
                  style={{ background: monetColors.surfaceBg, color: colors.text }}
                >
                  {milestone.impact}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// =============================================================================
// Coverage Chart (Light Theme) - Interactive with Draggable Age Marker
// =============================================================================

function getChartColors(theme: ReturnType<typeof getInsuranceTheme>) {
  return {
    lifeTpd: {
      line: theme.lavender,
      fill: 'rgba(155, 139, 180, 0.2)',
    },
    criticalIllness: {
      line: theme.sage,
      fill: 'rgba(127, 178, 133, 0.15)',
    },
    personalAccident: {
      line: theme.coralRose,
      fill: 'rgba(232, 168, 152, 0.1)',
    },
    grid: 'rgba(155, 139, 180, 0.1)',
    axis: theme.textMuted,
  }
}

interface CoverageChartLightProps {
  projections: CoverageProjectionYear[]
  milestones: CoverageMilestone[]
  currentAge: number
  selectedAge: number
  onAgeSelect: (age: number) => void
}

function CoverageChartLight({
  projections,
  milestones,
  currentAge,
  selectedAge,
  onAgeSelect,
}: CoverageChartLightProps) {
  const colorScheme = useColorScheme()
  const monetColors = getInsuranceTheme(colorScheme)
  const CHART_COLORS_LIGHT = getChartColors(monetColors)

  const chartRef = useRef<ChartJS<'line'> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Drag state for the age marker
  const [isDraggingAge, setIsDraggingAge] = useState(false)

  // Calculate chart area bounds
  const getChartArea = useCallback(() => {
    const chart = chartRef.current
    if (!chart) return null
    return chart.chartArea
  }, [])

  // Convert pixel X position to age
  const pixelToAge = useCallback((pixelX: number): number => {
    const chart = chartRef.current
    const chartArea = getChartArea()
    if (!chart || !chartArea) return selectedAge

    // Calculate the relative position within the chart area
    const relativeX = Math.max(0, Math.min(1, (pixelX - chartArea.left) / (chartArea.right - chartArea.left)))

    // Map to age range
    const minAge = projections[0]?.age ?? 25
    const maxAge = projections[projections.length - 1]?.age ?? 75
    const age = Math.round(minAge + relativeX * (maxAge - minAge))

    return Math.max(minAge, Math.min(maxAge, age))
  }, [projections, selectedAge, getChartArea])

  // Calculate position of selected age marker
  const selectedAgeIndex = useMemo(() => {
    return projections.findIndex(p => p.age === selectedAge)
  }, [projections, selectedAge])

  const currentAgeIndex = useMemo(() => {
    return projections.findIndex(p => p.age === currentAge)
  }, [projections, currentAge])

  const chartData: ChartData<'line'> = useMemo(() => {
    const labels = projections.map(p => p.age.toString())

    return {
      labels,
      datasets: [
        {
          label: 'Life/TPD',
          data: projections.map(p => p.recommendedLifeTpd),
          borderColor: CHART_COLORS_LIGHT.lifeTpd.line,
          backgroundColor: CHART_COLORS_LIGHT.lifeTpd.fill,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: CHART_COLORS_LIGHT.lifeTpd.line,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          borderWidth: 2,
        },
        {
          label: 'Critical Illness',
          data: projections.map(p => p.recommendedCriticalIllness),
          borderColor: CHART_COLORS_LIGHT.criticalIllness.line,
          backgroundColor: CHART_COLORS_LIGHT.criticalIllness.fill,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: CHART_COLORS_LIGHT.criticalIllness.line,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          borderWidth: 1.5,
        },
        {
          label: 'Personal Accident',
          data: projections.map(p => p.recommendedPersonalAccident),
          borderColor: CHART_COLORS_LIGHT.personalAccident.line,
          backgroundColor: CHART_COLORS_LIGHT.personalAccident.fill,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: CHART_COLORS_LIGHT.personalAccident.line,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          borderWidth: 1,
        },
      ],
    }
  }, [projections])

  // Handle mouse down on the age marker to start dragging
  const handleMarkerMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingAge(true)
  }, [])

  // Handle mouse move during drag
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingAge) return

    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const newAge = pixelToAge(x)

    if (newAge !== selectedAge) {
      onAgeSelect(newAge)
    }
  }, [isDraggingAge, pixelToAge, selectedAge, onAgeSelect])

  // Handle mouse up - stop dragging
  const handleMouseUp = useCallback(() => {
    setIsDraggingAge(false)
  }, [])

  // Handle mouse leave - stop dragging
  const handleMouseLeave = useCallback(() => {
    if (isDraggingAge) {
      setIsDraggingAge(false)
    }
  }, [isDraggingAge])

  // Handle click on chart to select age
  const handleChartClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingAge) return

    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const newAge = pixelToAge(x)
    onAgeSelect(newAge)
  }, [isDraggingAge, pixelToAge, onAgeSelect])

  const chartOptions: ChartOptions<'line'> = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: !isDraggingAge,
          backgroundColor: monetColors.cardBgHover,
          titleColor: monetColors.textPrimary,
          bodyColor: monetColors.textSecondary,
          borderColor: monetColors.cardBorder,
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
            color: CHART_COLORS_LIGHT.grid,
            drawTicks: false,
          },
          ticks: {
            color: CHART_COLORS_LIGHT.axis,
            font: {
              size: 11,
            },
            maxRotation: 0,
            callback: function(_value, index) {
              const age = projections[index]?.age
              if (age !== undefined && age % 10 === 0) {
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
            color: CHART_COLORS_LIGHT.grid,
            drawTicks: false,
          },
          ticks: {
            color: CHART_COLORS_LIGHT.axis,
            font: {
              size: 11,
            },
            callback: (value) => formatCoverageAmount(value as number),
            maxTicksLimit: 5,
          },
          border: {
            display: false,
          },
          beginAtZero: true,
        },
      },
    }
  }, [projections, currentAge, isDraggingAge])

  const isCurrentAge = selectedAge === currentAge

  return (
    <div className="space-y-3">
      {/* Header with selected age display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: monetColors.textSecondary }}>
            Viewing age
          </span>
          <span
            className="text-sm font-semibold px-2 py-0.5 rounded-lg"
            style={{
              background: isCurrentAge ? `${monetColors.sage}20` : `${monetColors.lavender}20`,
              color: isCurrentAge ? monetColors.sage : monetColors.lavenderDark,
            }}
          >
            {selectedAge}
            {isCurrentAge && ' (You)'}
          </span>
        </div>
        <span className="text-xs" style={{ color: monetColors.textMuted }}>
          Drag the marker to explore
        </span>
      </div>

      {/* Chart with drag handling */}
      <div
        ref={containerRef}
        className="relative h-[240px] rounded-xl p-3"
        style={{
          background: monetColors.surfaceBg,
          cursor: isDraggingAge ? 'ew-resize' : 'crosshair',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleChartClick}
      >
        <Line ref={chartRef} data={chartData} options={chartOptions} />

        {/* Current age indicator (static) */}
        {currentAgeIndex >= 0 && selectedAge !== currentAge && (
          <div
            className="absolute top-3 bottom-3 w-px pointer-events-none"
            style={{
              left: `calc(${(currentAgeIndex / (projections.length - 1)) * 100}% + 12px)`,
              background: monetColors.textMuted,
              opacity: 0.3,
            }}
          >
            <div
              className="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-medium whitespace-nowrap"
              style={{
                background: 'rgba(155, 139, 180, 0.2)',
                color: monetColors.textMuted,
              }}
            >
              Current
            </div>
          </div>
        )}

        {/* Selected age marker (draggable) */}
        {selectedAgeIndex >= 0 && (
          <div
            className="absolute top-3 bottom-3 w-0.5 transition-all"
            style={{
              left: `calc(${(selectedAgeIndex / (projections.length - 1)) * 100}% + 12px)`,
              background: `linear-gradient(to bottom, ${monetColors.lavender}, ${monetColors.lavenderDark})`,
              cursor: 'ew-resize',
              zIndex: 10,
            }}
            onMouseDown={handleMarkerMouseDown}
          >
            {/* Drag handle at top */}
            <div
              className="absolute -top-2 left-1/2 -translate-x-1/2 flex flex-col items-center"
              style={{ cursor: 'ew-resize' }}
            >
              <div
                className="px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${monetColors.lavender}, ${monetColors.lavenderDark})`,
                  color: 'white',
                }}
              >
                Age {selectedAge}
              </div>
              {/* Arrow pointing down */}
              <div
                className="w-0 h-0 border-l-4 border-r-4 border-t-4"
                style={{
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderTopColor: monetColors.lavenderDark,
                }}
              />
            </div>

            {/* Drag affordance dots on the line */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
            </div>
          </div>
        )}

        {/* Dragging indicator */}
        {isDraggingAge && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: `${monetColors.lavender}05`,
              border: `2px dashed ${monetColors.lavender}40`,
            }}
          />
        )}

        {/* Milestone markers on chart */}
        {milestones.map((milestone, idx) => {
          const minAge = projections[0]?.age ?? 25
          const maxAge = projections[projections.length - 1]?.age ?? 75

          // Skip milestones outside the chart range
          if (milestone.age < minAge || milestone.age > maxAge) return null

          const positionPercent = ((milestone.age - minAge) / (maxAge - minAge)) * 100
          const Icon = getMilestoneIcon(milestone.category)
          const colors = getMilestoneColor(milestone.category, monetColors, true)

          return (
            <div
              key={idx}
              className="absolute pointer-events-none"
              style={{
                left: `calc(${positionPercent}% + 12px)`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 5,
              }}
              title={`${milestone.event} (Age ${milestone.age})`}
            >
              <div
                className="flex items-center justify-center w-7 h-7 rounded-full shadow-md"
                style={{
                  background: colors.bg,
                  border: `2px solid ${colors.border}`,
                }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: colors.text }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5" style={{ color: monetColors.lavender }} />
          <div className="w-3 h-0.5 rounded-full" style={{ background: monetColors.lavender }} />
          <span className="text-xs" style={{ color: monetColors.textMuted }}>Life/TPD</span>
        </div>
        <div className="flex items-center gap-2">
          <HeartPulse className="h-3.5 w-3.5" style={{ color: monetColors.sage }} />
          <div className="w-3 h-0.5 rounded-full" style={{ background: monetColors.sage }} />
          <span className="text-xs" style={{ color: monetColors.textMuted }}>Critical Illness</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5" style={{ color: monetColors.coralRose }} />
          <div className="w-3 h-0.5 rounded-full" style={{ background: monetColors.coralRose }} />
          <span className="text-xs" style={{ color: monetColors.textMuted }}>Personal Accident</span>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function JourneyTab({ className }: JourneyTabProps) {
  const colorScheme = useColorScheme()
  const monetColors = getInsuranceTheme(colorScheme)
  const isMonet = colorScheme === 'monet'

  const { includedPersons } = usePersonFilter()
  const { data: persons, isLoading: personsLoading } = usePersonsQuery()

  // Person selection state - default to first included person
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)

  // Initialize/update selected person when includedPersons changes
  const effectivePersonId = selectedPersonId && includedPersons.some(p => p.id === selectedPersonId)
    ? selectedPersonId
    : includedPersons[0]?.id ?? null

  const selectedPerson = persons?.find(p => p.id === effectivePersonId)

  const autoPopulated = useQuestionnaireAutoPopulate(effectivePersonId)

  const currentAge = selectedPerson ? calculateAge(selectedPerson.dateOfBirth) : 35
  const [selectedAge, setSelectedAge] = useState(currentAge)

  const coverageContext: PersonCoverageContext = useMemo(() => {
    const dependents = (persons ?? [])
      .filter(p => p.id !== effectivePersonId && p.isIncluded)
      .map(p => ({
        name: p.name,
        age: calculateAge(p.dateOfBirth),
      }))
      .filter(d => d.age < 22)

    return {
      age: currentAge,
      annualIncome: autoPopulated.computed.primaryPersonIncome || 60000,
      dependents,
      mortgageBalance: autoPopulated.computed.totalMortgage,
      mortgageEndYear: autoPopulated.computed.totalMortgage > 0
        ? new Date().getFullYear() + 25
        : null,
      retirementAge: 65,
    }
  }, [currentAge, autoPopulated, persons, effectivePersonId])

  // Generate projections
  const projections = useMemo(() => {
    return generateCoverageProjection(coverageContext, 25, 75)
  }, [coverageContext])

  const milestones = useMemo(() => {
    return calculateMilestones(coverageContext)
  }, [coverageContext])

  const selectedProjection = useMemo(() => {
    return projections.find(p => p.age === selectedAge) ?? projections.find(p => p.age === currentAge)
  }, [projections, selectedAge, currentAge])

  const currentYear = new Date().getFullYear()
  const isCurrentAge = selectedAge === currentAge
  const yearsFromNow = selectedAge - currentAge

  if (personsLoading || autoPopulated.isLoading) {
    return (
      <div className={cn('animate-pulse space-y-4 p-8', className)}>
        <div className="h-12 bg-white/40 rounded-xl" />
        <div className="h-[200px] bg-white/40 rounded-xl" />
        <div className="h-32 bg-white/40 rounded-xl" />
      </div>
    )
  }

  if (!selectedPerson) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Shield className="h-12 w-12 mx-auto mb-4" style={{ color: monetColors.lavenderLight }} />
        <p className="text-sm" style={{ color: monetColors.textMuted }}>
          Select a person to view their coverage journey
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6 p-8', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2
            className="text-xl font-semibold"
            style={{
              color: monetColors.textPrimary,
              fontFamily: "'Cormorant Garamond', Georgia, serif",
            }}
          >
            Coverage Journey
          </h2>
          <p className="text-sm mt-1" style={{ color: monetColors.textSecondary }}>
            How your insurance needs change over time
          </p>
        </div>

        {/* Person Selector */}
        {includedPersons.length > 1 && (
          <PersonSelector
            value={effectivePersonId}
            onChange={(id) => setSelectedPersonId(id)}
            variant={isMonet ? 'monet' : 'dark'}
            showCreate={false}
            required
            className="w-48"
          />
        )}
        {includedPersons.length === 1 && selectedPerson && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: monetColors.cardBg,
              border: `1px solid ${monetColors.cardBorder}`,
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: selectedPerson.displayColor || '#64748b' }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: monetColors.textPrimary }}
            >
              {selectedPerson.name}
            </span>
          </div>
        )}
      </div>

      {/* Coverage Needs Chart */}
      <div
        className="px-5 py-4 rounded-2xl"
        style={{
          background: monetColors.cardBg,
          boxShadow: `0 4px 20px ${monetColors.shadowSoft}`,
          border: `1px solid ${monetColors.cardBorder}`,
        }}
      >
        <div
          className="text-xs font-medium uppercase tracking-wide mb-3"
          style={{ color: monetColors.textMuted }}
        >
          Coverage Needs Over Time
        </div>
        <CoverageChartLight
          projections={projections}
          milestones={milestones}
          currentAge={currentAge}
          selectedAge={selectedAge}
          onAgeSelect={setSelectedAge}
        />
      </div>



      {/* Coverage Comparison + Milestones - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coverage Comparison */}
        <div
          className="px-5 py-4 rounded-2xl"
          style={{
            background: monetColors.cardBg,
            boxShadow: `0 4px 20px ${monetColors.shadowSoft}`,
            border: `1px solid ${monetColors.cardBorder}`,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: monetColors.textMuted }}
              >
                At Age {selectedAge}
              </div>
              <div className="text-sm mt-0.5" style={{ color: monetColors.textSecondary }}>
                {isCurrentAge ? (
                  <span style={{ color: monetColors.sage }}>Your current age</span>
                ) : yearsFromNow > 0 ? (
                  <span>{yearsFromNow} years from now</span>
                ) : (
                  <span>{Math.abs(yearsFromNow)} years ago</span>
                )}
              </div>
            </div>
            {!isCurrentAge && (
              <button
                type="button"
                onClick={() => setSelectedAge(currentAge)}
                className="text-xs transition-colors"
                style={{ color: monetColors.lavender }}
              >
                ← Back to current
              </button>
            )}
          </div>

          {selectedProjection && (
            <CoverageComparisonLight
              recommendedLifeTpd={selectedProjection.recommendedLifeTpd}
              recommendedCriticalIllness={selectedProjection.recommendedCriticalIllness}
              recommendedPersonalAccident={selectedProjection.recommendedPersonalAccident}
            />
          )}
        </div>

        {/* Milestones */}
        {milestones.length > 0 && (
          <div
            className="px-5 py-4 rounded-2xl"
            style={{
              background: monetColors.cardBg,
              boxShadow: `0 4px 20px ${monetColors.shadowSoft}`,
              border: `1px solid ${monetColors.cardBorder}`,
            }}
          >
            <div
              className="text-xs font-medium uppercase tracking-wide mb-3"
              style={{ color: monetColors.textMuted }}
            >
              Upcoming Milestones
            </div>
            <MilestoneAlertsLight milestones={milestones} currentYear={currentYear} />
          </div>
        )}
      </div>
    </div>
  )
}
