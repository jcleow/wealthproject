'use client'

import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
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
import { Shield, HeartPulse, Zap, AlertCircle, Check, CheckCircle2, ChevronDown, ChevronRight, ShieldAlert, Accessibility } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePersonsQuery } from '@/hooks/queries/usePersonsQuery'
import { useQuestionnaireAutoPopulate } from '@/hooks/useQuestionnaireAutoPopulate'
import { usePersonFilter } from '@/contexts/PersonFilterContext'
import { usePersonFilterLocal } from '@/hooks/usePersonFilter'
import { useColorScheme } from '@/stores'
import { PersonSelector } from '@/components/ui/PersonSelector'
import { PersonViewDropdown } from '@/components/insurance/shared/PersonViewDropdown'
import { getInsuranceTheme } from '@/lib/insurance-theme'
import { INSURANCE_TYPOGRAPHY as T } from '@/components/insurance/shared/insurance-typography'
import { type CheckboxPillOption } from '@/components/insurance/shared/CheckboxPill'
import { INSURANCE_DARK_THEME } from '@/components/insurance/shared/insurance-dark-theme'
import { JOURNEY_CATEGORY_CONFIG } from '@/config/insurance-categories'
import { getMilestoneIcon as getMilestoneIconFromConfig, getMilestoneColors as getMilestoneColorsFromConfig } from '@/lib/milestone-config'
import { buildCoverageDatasets, buildCoverageChartOptions, type CoverageChartColorConfig } from '@/lib/insurance-chart-config'
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

type IndividualCategory = 'lifeTpd' | 'criticalIllness' | 'earlyCi' | 'disability' | 'personalAccident'

const ALL_CATEGORIES: IndividualCategory[] = ['lifeTpd', 'criticalIllness', 'earlyCi', 'disability', 'personalAccident']

// =============================================================================
// Dark Mode Palette (from Pencil design bpFdW)
// =============================================================================

const DARK_PALETTE = {
  pageBg: '#0a0a0a',
  cardBg: 'rgba(255, 255, 255, 0.03)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  milestoneInnerBg: 'rgba(255, 255, 255, 0.04)',
  contentAreaBg: 'rgba(255, 255, 255, 0.02)',
  // Derive overlapping tokens from the shared theme
  textPrimary: INSURANCE_DARK_THEME.textPrimary,
  textMuted: INSURANCE_DARK_THEME.textMuted,
  textSecondaryMuted: INSURANCE_DARK_THEME.textSecondary,
  red: '#D97706',
  green: INSURANCE_DARK_THEME.statusGreen,
  // Category colors derived from shared config
  blueLifeTpd: JOURNEY_CATEGORY_CONFIG.lifeTpd.color,
  blueLightAccent: '#7CB3D8',
  grayCriticalIllness: JOURNEY_CATEGORY_CONFIG.criticalIllness.color,
  grayCriticalIllnessChip: '#A1A1AA',
  goldPersonalAccident: JOURNEY_CATEGORY_CONFIG.personalAccident.color,
  tealEarlyCi: JOURNEY_CATEGORY_CONFIG.earlyCi.color,
  purpleDisability: JOURNEY_CATEGORY_CONFIG.disability.color,
  gapCardBg: 'rgba(217, 119, 6, 0.08)',
  gapCardBorder: 'rgba(217, 119, 6, 0.20)',
  chipActiveBg: INSURANCE_DARK_THEME.textPrimary,
  chipActiveText: '#111113',
  chipInactiveBg: 'rgba(255, 255, 255, 0.02)',
} as const

// =============================================================================
// Dark Mode: Category color config
// =============================================================================

const DARK_CATEGORY_CONFIG = {
  lifeTpd: {
    chartLine: DARK_PALETTE.blueLifeTpd,
    chartFill: '#3D5A8060',
    chipCheckColor: DARK_PALETTE.blueLifeTpd,
    legendDotFill: '#3D5A8060',
    legendDotStroke: DARK_PALETTE.blueLifeTpd,
    icon: JOURNEY_CATEGORY_CONFIG.lifeTpd.icon,
    label: JOURNEY_CATEGORY_CONFIG.lifeTpd.label,
  },
  criticalIllness: {
    chartLine: DARK_PALETTE.grayCriticalIllness,
    chartFill: '#6B728060',
    chipCheckColor: DARK_PALETTE.grayCriticalIllnessChip,
    legendDotFill: '#6B728060',
    legendDotStroke: DARK_PALETTE.grayCriticalIllness,
    icon: JOURNEY_CATEGORY_CONFIG.criticalIllness.icon,
    label: JOURNEY_CATEGORY_CONFIG.criticalIllness.label,
  },
  earlyCi: {
    chartLine: DARK_PALETTE.tealEarlyCi,
    chartFill: '#14B8A640',
    chipCheckColor: DARK_PALETTE.tealEarlyCi,
    legendDotFill: '#14B8A640',
    legendDotStroke: DARK_PALETTE.tealEarlyCi,
    icon: JOURNEY_CATEGORY_CONFIG.earlyCi.icon,
    label: JOURNEY_CATEGORY_CONFIG.earlyCi.label,
  },
  disability: {
    chartLine: DARK_PALETTE.purpleDisability,
    chartFill: '#A78BFA40',
    chipCheckColor: DARK_PALETTE.purpleDisability,
    legendDotFill: '#A78BFA40',
    legendDotStroke: DARK_PALETTE.purpleDisability,
    icon: JOURNEY_CATEGORY_CONFIG.disability.icon,
    label: JOURNEY_CATEGORY_CONFIG.disability.label,
  },
  personalAccident: {
    chartLine: DARK_PALETTE.goldPersonalAccident,
    chartFill: '#E5A10060',
    chipCheckColor: DARK_PALETTE.goldPersonalAccident,
    legendDotFill: '#E5A10060',
    legendDotStroke: DARK_PALETTE.goldPersonalAccident,
    icon: JOURNEY_CATEGORY_CONFIG.personalAccident.icon,
    label: JOURNEY_CATEGORY_CONFIG.personalAccident.label,
  },
} as const

// =============================================================================
// Dark Mode: Category Filter Chips (shared CheckboxPillGroup)
// =============================================================================

const JOURNEY_CATEGORY_PILLS: CheckboxPillOption[] = [
  { key: 'lifeTpd', label: 'Life/TPD', checkColor: DARK_CATEGORY_CONFIG.lifeTpd.chipCheckColor },
  { key: 'criticalIllness', label: 'Critical Illness', checkColor: DARK_CATEGORY_CONFIG.criticalIllness.chipCheckColor },
  { key: 'earlyCi', label: 'Early CI', checkColor: DARK_CATEGORY_CONFIG.earlyCi.chipCheckColor },
  { key: 'disability', label: 'Disability', checkColor: DARK_CATEGORY_CONFIG.disability.chipCheckColor },
  { key: 'personalAccident', label: 'Personal Accident', checkColor: DARK_CATEGORY_CONFIG.personalAccident.chipCheckColor },
]

function DarkCategoryFilterDropdown({
  activeCategories,
  onToggleCategory,
  onSelectAll,
}: {
  activeCategories: Set<IndividualCategory>
  onToggleCategory: (category: IndividualCategory) => void
  onSelectAll: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const selectedCount = activeCategories.size
  const allSelected = selectedCount === ALL_CATEGORIES.length

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-2 rounded-sm px-3 py-1.5 text-xs transition-all duration-200"
        style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
      >
        <span className="text-slate-500">Analyze:</span>
        <span className="font-medium text-slate-200">
          {allSelected ? 'All coverage' : `${selectedCount} of ${ALL_CATEGORIES.length}`}
        </span>
        <ChevronDown
          className="h-3.5 w-3.5 text-slate-500 transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute left-0 top-full z-30 mt-1 w-[220px] rounded-lg py-2 shadow-xl"
          style={{
            background: '#111113',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Select All */}
          <button
            type="button"
            onClick={onSelectAll}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 transition-colors hover:bg-white/[0.04]"
          >
            <div
              className="flex h-4 w-4 shrink-0 items-center justify-center"
              style={{
                borderRadius: 3,
                background: allSelected ? '#F0F0F0' : 'transparent',
                border: allSelected ? 'none' : '1.5px solid #52525B',
              }}
            >
              {allSelected && <Check className="h-2.5 w-2.5 text-[#111113]" />}
            </div>
            <span className="text-xs font-medium text-slate-400">Select All</span>
          </button>
          <div className="mx-3 my-1 h-px" style={{ background: 'rgba(255, 255, 255, 0.06)' }} />

          {/* Category rows */}
          {JOURNEY_CATEGORY_PILLS.map((option) => {
            const isSelected = activeCategories.has(option.key as IndividualCategory)
            const config = DARK_CATEGORY_CONFIG[option.key as IndividualCategory]
            return (
              <button
                key={option.key}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onToggleCategory(option.key as IndividualCategory)}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 transition-colors hover:bg-white/[0.04]"
              >
                {/* Checkbox */}
                <div
                  className="flex h-4 w-4 shrink-0 items-center justify-center"
                  style={{
                    borderRadius: 3,
                    background: isSelected ? '#F0F0F0' : 'transparent',
                    border: isSelected ? 'none' : '1.5px solid #52525B',
                  }}
                >
                  {isSelected && <Check className="h-2.5 w-2.5 text-[#111113]" />}
                </div>

                {/* Color dot */}
                <div
                  className="h-3 w-3 shrink-0 rounded-md"
                  style={{
                    background: config.legendDotFill,
                    border: `1.5px solid ${config.legendDotStroke}`,
                  }}
                />

                {/* Label */}
                <span className="text-xs font-medium text-slate-200">{option.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Dark Mode: Chart Legend
// =============================================================================

function DarkChartLegend() {
  const legendItems = [
    DARK_CATEGORY_CONFIG.lifeTpd,
    DARK_CATEGORY_CONFIG.criticalIllness,
    DARK_CATEGORY_CONFIG.earlyCi,
    DARK_CATEGORY_CONFIG.disability,
    DARK_CATEGORY_CONFIG.personalAccident,
  ]

  return (
    <div className="flex items-center gap-3">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-md"
            style={{
              background: item.legendDotFill,
              border: `1.5px solid ${item.legendDotStroke}`,
            }}
          />
          <span className={T.legendText} style={{ color: DARK_PALETTE.textMuted }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// Dark Mode: Coverage Chart
// =============================================================================

function DarkCoverageChart({
  projections,
  milestones,
  currentAge,
  selectedAge,
  onAgeSelect,
  activeCategories,
  isMultiPerson,
}: {
  projections: CoverageProjectionYear[]
  milestones: CoverageMilestone[]
  currentAge: number
  selectedAge: number
  onAgeSelect: (age: number) => void
  activeCategories: Set<IndividualCategory>
  isMultiPerson: boolean
}) {
  const currentYear = new Date().getFullYear()
  const ageToYear = (age: number) => currentYear + (age - currentAge)
  const chartRef = useRef<ChartJS<'line'> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDraggingAge, setIsDraggingAge] = useState(false)
  // Flips to true once the chart has rendered its scales, triggering a
  // re-render so milestone icons can read pixel positions from Chart.js
  const [chartScalesReady, setChartScalesReady] = useState(false)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const isDraggingAgeRef = useRef(isDraggingAge)
  isDraggingAgeRef.current = isDraggingAge

  const getChartArea = useCallback(() => {
    const chart = chartRef.current
    if (!chart) return null
    return chart.chartArea
  }, [])

  const pixelToAge = useCallback((pixelX: number): number => {
    const chart = chartRef.current
    const chartArea = getChartArea()
    if (!chart || !chartArea) return selectedAge

    const relativeX = Math.max(0, Math.min(1, (pixelX - chartArea.left) / (chartArea.right - chartArea.left)))
    const minAge = projections[0]?.age ?? 25
    const maxAge = projections[projections.length - 1]?.age ?? 75
    const age = Math.round(minAge + relativeX * (maxAge - minAge))
    return Math.max(minAge, Math.min(maxAge, age))
  }, [projections, selectedAge, getChartArea])

  const selectedAgeIndex = useMemo(() => {
    return projections.findIndex(p => p.age === selectedAge)
  }, [projections, selectedAge])

  const showLifeTpd = activeCategories.has('lifeTpd')
  const showCriticalIllness = activeCategories.has('criticalIllness')
  const showEarlyCi = activeCategories.has('earlyCi')
  const showDisability = activeCategories.has('disability')
  const showPersonalAccident = activeCategories.has('personalAccident')

  const darkChartColorConfig: CoverageChartColorConfig = useMemo(() => ({
    lifeTpd: { chartLine: DARK_CATEGORY_CONFIG.lifeTpd.chartLine, chartFill: DARK_CATEGORY_CONFIG.lifeTpd.chartFill },
    criticalIllness: { chartLine: DARK_CATEGORY_CONFIG.criticalIllness.chartLine, chartFill: DARK_CATEGORY_CONFIG.criticalIllness.chartFill },
    earlyCi: { chartLine: DARK_CATEGORY_CONFIG.earlyCi.chartLine, chartFill: DARK_CATEGORY_CONFIG.earlyCi.chartFill },
    disability: { chartLine: DARK_CATEGORY_CONFIG.disability.chartLine, chartFill: DARK_CATEGORY_CONFIG.disability.chartFill },
    personalAccident: { chartLine: DARK_CATEGORY_CONFIG.personalAccident.chartLine, chartFill: DARK_CATEGORY_CONFIG.personalAccident.chartFill },
    pointHoverBorderColor: DARK_PALETTE.textPrimary,
    gridColor: DARK_PALETTE.cardBorder,
    axisColor: DARK_PALETTE.textMuted,
  }), [])

  const chartData: ChartData<'line'> = useMemo(() => {
    const labelMapper = isMultiPerson
      ? (p: CoverageProjectionYear) => ageToYear(p.age).toString()
      : undefined
    return buildCoverageDatasets(projections, darkChartColorConfig, activeCategories, labelMapper)
  }, [projections, activeCategories, isMultiPerson, ageToYear, darkChartColorConfig])

  const handleMarkerMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingAge(true)
  }, [])

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingAge) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const newAge = pixelToAge(x)
    if (newAge !== selectedAge) {
      onAgeSelect(newAge)
    }
  }, [isDraggingAge, pixelToAge, selectedAge, onAgeSelect])

  const handleMouseUp = useCallback(() => {
    setIsDraggingAge(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (isDraggingAge) setIsDraggingAge(false)
  }, [isDraggingAge])

  const handleChartClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingAge) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const newAge = pixelToAge(x)
    onAgeSelect(newAge)
  }, [isDraggingAge, pixelToAge, onAgeSelect])

  // After the chart mounts and renders, its scales become available.
  // We need one re-render to read pixel positions for milestone icons.
  const chartScalesReadyRef = useRef(chartScalesReady)
  chartScalesReadyRef.current = chartScalesReady

  // Clean up external tooltip element on unmount
  useEffect(() => {
    return () => { tooltipRef.current?.remove() }
  }, [])

  // External HTML tooltip — renders as a DOM element with boundary-aware positioning
  const externalTooltipHandler = useCallback(
    (context: { chart: ChartJS<'line'>; tooltip: any }) => {
      const { chart, tooltip } = context
      const container = containerRef.current
      if (!container) return

      if (!tooltipRef.current) {
        const el = document.createElement('div')
        Object.assign(el.style, {
          position: 'absolute',
          pointerEvents: 'none',
          zIndex: '20',
          transition: 'opacity 0.15s ease',
          borderRadius: '4px',
          padding: '12px',
          fontSize: '12px',
          lineHeight: '1.5',
          background: '#1C1C1E',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        })
        container.appendChild(el)
        tooltipRef.current = el
      }

      const tooltipEl = tooltipRef.current

      if (isDraggingAgeRef.current || tooltip.opacity === 0) {
        tooltipEl.style.opacity = '0'
        return
      }

      let html = ''
      if (tooltip.title?.length) {
        html += `<div style="color:${DARK_PALETTE.textPrimary};font-weight:600;margin-bottom:6px">${tooltip.title[0]}</div>`
      }
      for (const point of tooltip.dataPoints ?? []) {
        const color = point.dataset.borderColor || '#fff'
        const label = point.dataset.label || ''
        const value = formatCoverageAmount(point.raw as number)
        html += `<div style="display:flex;align-items:center;gap:6px;color:${DARK_PALETTE.textMuted};font-size:11px;margin-top:2px"><span style="width:8px;height:8px;border-radius:2px;background:${color};flex-shrink:0"></span>${label}: ${value}</div>`
      }

      tooltipEl.innerHTML = html
      tooltipEl.style.transform = 'none'

      // Boundary-aware positioning (matches net worth tooltip logic)
      const { offsetLeft: canvasLeft, offsetTop: canvasTop } = chart.canvas
      const caretX = canvasLeft + tooltip.caretX
      const caretY = canvasTop + tooltip.caretY
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight
      const tooltipWidth = tooltipEl.offsetWidth
      const tooltipHeight = tooltipEl.offsetHeight

      // Offset tooltip to the right of cursor
      let adjustedX = caretX + 15
      let adjustedY = caretY

      // If tooltip overflows right edge, flip to the left of cursor
      if (adjustedX + tooltipWidth > containerWidth) {
        adjustedX = caretX - tooltipWidth - 15
      }

      // Keep tooltip within vertical bounds
      if (adjustedY + tooltipHeight > containerHeight) {
        adjustedY = containerHeight - tooltipHeight - 10
      }
      if (adjustedY < 10) {
        adjustedY = 10
      }

      tooltipEl.style.left = adjustedX + 'px'
      tooltipEl.style.top = adjustedY + 'px'
      tooltipEl.style.opacity = '1'
    },
    []
  )

  const chartOptions: ChartOptions<'line'> = useMemo(() =>
    buildCoverageChartOptions(darkChartColorConfig, {
      onAnimationComplete: () => {
        if (!chartScalesReadyRef.current) {
          setChartScalesReady(true)
        }
      },
      externalTooltipHandler,
      tooltipTitleCallback: (items) => {
        if (items.length > 0) {
          const age = projections[items[0].dataIndex]?.age
          const isCurrent = age === currentAge
          if (isMultiPerson) {
            return `${ageToYear(age)}${isCurrent ? ' (Current)' : ''}`
          }
          return `Age ${age}${isCurrent ? ' (Current)' : ''}`
        }
        return ''
      },
      xTickCallback: (_value, index) => {
        const age = projections[index]?.age
        if (age === undefined) return ''
        if (isMultiPerson) {
          const year = ageToYear(age)
          if (year % 5 === 0) return year
          return ''
        }
        if (age % 5 === 0) return age
        return ''
      },
    }),
  [projections, currentAge, externalTooltipHandler, isMultiPerson, ageToYear, darkChartColorConfig])

  return (
    <div
      ref={containerRef}
      className="relative h-[340px]"
      style={{ cursor: isDraggingAge ? 'ew-resize' : 'crosshair' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={handleChartClick}
    >
      <Line ref={chartRef} data={chartData} options={chartOptions} />

      {/* Selected age marker (draggable) */}
      {selectedAgeIndex >= 0 && (() => {
        const chart = chartRef.current
        const chartArea = chart?.chartArea
        // Use Chart.js scale for accurate pixel position; fall back to percentage if scales not ready
        const markerLeft = chart?.scales?.x
          ? chart.scales.x.getPixelForValue(selectedAgeIndex)
          : null
        const markerTop = chartArea?.top ?? 0
        const markerBottom = chartArea ? (containerRef.current?.clientHeight ?? 0) - chartArea.bottom : 0

        if (markerLeft == null) return null

        return (
          <div
            className="absolute transition-all"
            style={{
              left: markerLeft,
              top: markerTop,
              bottom: markerBottom,
              width: 2,
              background: DARK_PALETTE.textPrimary,
              cursor: 'ew-resize',
              zIndex: 10,
            }}
            onMouseDown={handleMarkerMouseDown}
          >
            {/* Age/Year badge at top */}
            <div
              className="absolute -top-1 left-1/2 -translate-x-1/2 flex items-center justify-center px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap"
              style={{
                background: DARK_PALETTE.textPrimary,
                color: DARK_PALETTE.pageBg,
                cursor: 'ew-resize',
              }}
            >
              {isMultiPerson ? ageToYear(selectedAge) : `Age ${selectedAge}`}
            </div>
          </div>
        )
      })()}

      {/* Milestone markers on chart — positioned relative to the data curve */}
      {milestones.map((milestone, idx) => {
        const minAge = projections[0]?.age ?? 25
        const maxAge = projections[projections.length - 1]?.age ?? 75
        if (milestone.age < minAge || milestone.age > maxAge) return null

        const chart = chartRef.current
        if (!chart || !chart.chartArea) return null

        const Icon = getDarkMilestoneIcon(milestone.category)
        const iconBgColor = milestone.category === 'debt' ? DARK_PALETTE.red : DARK_PALETTE.blueLifeTpd

        // Find the data index for this milestone's age
        const dataIndex = projections.findIndex(p => p.age === milestone.age)
        if (dataIndex < 0) return null

        // Get X pixel from Chart.js scale (accounts for chart padding/margins)
        const pixelX = chart.scales.x.getPixelForValue(dataIndex)

        // Find the highest visible dataset value at this age
        const projection = projections[dataIndex]
        const visibleValues: number[] = []
        if (showLifeTpd) visibleValues.push(projection.recommendedLifeTpd)
        if (showCriticalIllness) visibleValues.push(projection.recommendedCriticalIllness)
        if (showEarlyCi) visibleValues.push(projection.recommendedEarlyCi)
        if (showDisability) visibleValues.push(projection.recommendedDisability)
        if (showPersonalAccident) visibleValues.push(projection.recommendedPersonalAccident)
        const maxValue = visibleValues.length > 0 ? Math.max(...visibleValues) : 0

        // Convert data value to pixel Y, then offset 24px above the curve
        const ICON_OFFSET_ABOVE_CURVE = 24
        const pixelY = chart.scales.y.getPixelForValue(maxValue) - ICON_OFFSET_ABOVE_CURVE

        return (
          <div
            key={idx}
            className="absolute pointer-events-none"
            style={{
              left: pixelX,
              top: pixelY,
              transform: 'translate(-50%, -50%)',
              zIndex: 5,
            }}
            title={`${milestone.event} (Age ${milestone.age})`}
          >
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full shadow-lg"
              style={{ background: iconBgColor }}
            >
              <Icon className="h-4 w-4" style={{ color: DARK_PALETTE.pageBg }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// =============================================================================
// Dark Mode: Coverage Breakdown Card (bottom-left)
// =============================================================================

function DarkCoverageBreakdownCard({
  projections,
  selectedAge,
  persons,
}: {
  projections: CoverageProjectionYear[]
  selectedAge: number
  persons: Array<{ id: string; name: string; displayColor?: string | null; isIncluded?: boolean }>
}) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('lifeTpd')

  const selectedProjection = projections.find(p => p.age === selectedAge)
  if (!selectedProjection) return null

  const includedPersons = persons.filter(p => p.isIncluded)

  const categories = [
    {
      key: 'lifeTpd',
      label: 'Life/TPD',
      icon: Shield,
      iconColor: DARK_PALETTE.blueLifeTpd,
      recommended: selectedProjection.recommendedLifeTpd,
      current: selectedProjection.currentLifeTpd,
    },
    {
      key: 'criticalIllness',
      label: 'Critical Illness',
      icon: HeartPulse,
      iconColor: DARK_PALETTE.grayCriticalIllnessChip,
      recommended: selectedProjection.recommendedCriticalIllness,
      current: selectedProjection.currentCriticalIllness,
    },
    {
      key: 'earlyCi',
      label: 'Early CI',
      icon: ShieldAlert,
      iconColor: DARK_PALETTE.tealEarlyCi,
      recommended: selectedProjection.recommendedEarlyCi,
      current: selectedProjection.currentEarlyCi,
    },
    {
      key: 'disability',
      label: 'Disability',
      icon: Accessibility,
      iconColor: DARK_PALETTE.purpleDisability,
      recommended: selectedProjection.recommendedDisability,
      current: selectedProjection.currentDisability,
    },
    {
      key: 'personalAccident',
      label: 'Personal Accident',
      icon: Zap,
      iconColor: DARK_PALETTE.goldPersonalAccident,
      recommended: selectedProjection.recommendedPersonalAccident,
      current: selectedProjection.currentPersonalAccident,
    },
  ]

  return (
    <div
      className="rounded-sm"
      style={{
        background: DARK_PALETTE.cardBg,
        border: `1px solid ${DARK_PALETTE.cardBorder}`,
      }}
    >
      <div className="p-6 pb-0">
        <div
          className={T.cardLabel}
          style={{ color: DARK_PALETTE.textMuted }}
        >
          POLICY COVERAGES
        </div>
      </div>

      <div
        className="mx-6 mt-3 mb-0 h-px"
        style={{ background: DARK_PALETTE.cardBorder }}
      />

      <div className="px-6 pb-6">
        {categories.map((category, idx) => {
          const Icon = category.icon
          const gap = category.recommended - category.current
          const hasGap = gap > 0
          const isExpanded = expandedCategory === category.key
          const ChevIcon = isExpanded ? ChevronDown : ChevronRight

          return (
            <div key={category.key}>
              {/* Category header row */}
              <button
                type="button"
                onClick={() => setExpandedCategory(isExpanded ? null : category.key)}
                className="flex items-center justify-between w-full py-3 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={T.categoryIconSize} style={{ color: category.iconColor }} />
                  <span className={T.categoryLabel} style={{ color: DARK_PALETTE.textPrimary }}>
                    {category.label}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded"
                      style={{ background: hasGap ? DARK_PALETTE.red : DARK_PALETTE.green }}
                    />
                    <span
                      className={T.statusText}
                      style={{ color: hasGap ? DARK_PALETTE.red : DARK_PALETTE.green }}
                    >
                      {hasGap ? `Gap: ${formatCoverageAmount(gap)}` : 'On Target'}
                    </span>
                  </div>
                  <ChevIcon className="h-4 w-4" style={{ color: DARK_PALETTE.textSecondaryMuted }} />
                </div>
              </button>

              {/* Expanded per-person breakdown */}
              {isExpanded && includedPersons.length > 0 && (
                <div
                  className="rounded-sm mb-2"
                  style={{ background: DARK_PALETTE.contentAreaBg }}
                >
                  {/* Sub-header */}
                  <div
                    className="flex items-center gap-3 px-4 py-2"
                  >
                    <span
                      className={cn(T.legendText, 'flex-1')}
                      style={{ color: DARK_PALETTE.textMuted }}
                    >
                      Person
                    </span>
                    <span
                      className={cn(T.legendText, 'w-20 text-right')}
                      style={{ color: DARK_PALETTE.textMuted }}
                    >
                      Target
                    </span>
                    <span
                      className={cn(T.legendText, 'w-20 text-right')}
                      style={{ color: DARK_PALETTE.textMuted }}
                    >
                      Current
                    </span>
                    <span
                      className={cn(T.legendText, 'w-24 text-right')}
                      style={{ color: DARK_PALETTE.textMuted }}
                    >
                      Gap
                    </span>
                  </div>

                  {/* Person rows */}
                  {includedPersons.map((person) => {
                    // Split the target evenly across persons for display
                    const perPersonTarget = Math.round(category.recommended / includedPersons.length)
                    const perPersonCurrent = Math.round(category.current / includedPersons.length)
                    const perPersonGap = perPersonTarget - perPersonCurrent

                    return (
                      <div
                        key={person.id}
                        className="flex items-center gap-3 px-4 py-2.5"
                        style={{ borderTop: `1px solid ${DARK_PALETTE.cardBorder}` }}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className="w-5 h-5 rounded-full flex-shrink-0"
                            style={{ background: person.displayColor || '#64748b' }}
                          />
                          <span className={cn(T.bodyText, 'truncate')} style={{ color: DARK_PALETTE.textPrimary }}>
                            {person.name}
                          </span>
                        </div>
                        <span
                          className={cn(T.bodyText, 'w-20 text-right')}
                          style={{ color: DARK_PALETTE.textPrimary }}
                        >
                          {formatCoverageAmount(perPersonTarget)}
                        </span>
                        <span
                          className={cn(T.bodyText, 'w-20 text-right')}
                          style={{ color: DARK_PALETTE.textPrimary }}
                        >
                          {formatCoverageAmount(perPersonCurrent)}
                        </span>
                        <span
                          className={cn(T.bodyText, 'w-24 text-right')}
                          style={{ color: perPersonGap > 0 ? DARK_PALETTE.red : DARK_PALETTE.green }}
                        >
                          {perPersonGap > 0 ? `(${formatCoverageAmount(perPersonGap)})` : 'OK'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Divider between categories */}
              {idx < categories.length - 1 && (
                <div className="h-px" style={{ background: DARK_PALETTE.cardBorder }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// Dark Mode: Milestones Card (bottom-right)
// =============================================================================

function getDarkMilestoneIcon(category: CoverageMilestone['category']) {
  return getMilestoneIconFromConfig(category, 'dark')
}

function getDarkMilestoneIconBg(category: CoverageMilestone['category']): string {
  return getMilestoneColorsFromConfig(category, 'dark').bg
}

function getDarkMilestoneYearColor(category: CoverageMilestone['category']): string {
  return getMilestoneColorsFromConfig(category, 'dark').yearColor
}

function DarkMilestonesCard({
  milestones,
  currentYear,
}: {
  milestones: CoverageMilestone[]
  currentYear: number
}) {
  if (milestones.length === 0) {
    return (
      <div
        className="rounded-sm p-6"
        style={{
          background: DARK_PALETTE.cardBg,
          border: `1px solid ${DARK_PALETTE.cardBorder}`,
        }}
      >
        <div
          className={cn(T.cardLabel, 'mb-4')}
          style={{ color: DARK_PALETTE.textMuted }}
        >
          UPCOMING MILESTONES
        </div>
        <p className={cn(T.bodyText, 'text-center py-6')} style={{ color: DARK_PALETTE.textMuted }}>
          No upcoming milestones detected
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-sm"
      style={{
        background: DARK_PALETTE.cardBg,
        border: `1px solid ${DARK_PALETTE.cardBorder}`,
      }}
    >
      <div className="p-6 pb-0">
        <div
          className={T.cardLabel}
          style={{ color: DARK_PALETTE.textMuted }}
        >
          UPCOMING MILESTONES
        </div>
      </div>

      <div
        className="mx-6 mt-3 mb-0 h-px"
        style={{ background: DARK_PALETTE.cardBorder }}
      />

      <div className="p-6 pt-4 flex flex-col gap-4">
        {milestones.map((milestone, idx) => {
          const Icon = getDarkMilestoneIcon(milestone.category)
          const iconBgColor = getDarkMilestoneIconBg(milestone.category)
          const yearColor = getDarkMilestoneYearColor(milestone.category)
          const yearsAway = milestone.year - currentYear

          // Determine impact color: positive coverage change = red (gap grows), negative = green (gap shrinks)
          const impactColor = milestone.coverageChange > 0
            ? DARK_PALETTE.red
            : milestone.coverageChange < 0
              ? DARK_PALETTE.green
              : DARK_PALETTE.textMuted

          return (
            <div
              key={idx}
              className="flex gap-4 rounded-md p-4"
              style={{ background: DARK_PALETTE.milestoneInnerBg }}
            >
              {/* Icon circle */}
              <div
                className="flex items-center justify-center w-9 h-9 rounded-2xl flex-shrink-0"
                style={{ background: iconBgColor }}
              >
                <Icon className={T.categoryIconSize} style={{ color: DARK_PALETTE.pageBg }} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                {/* Meta row: year + time away */}
                <div className="flex items-center gap-2">
                  <span className={cn(T.metaText, 'font-semibold')} style={{ color: yearColor }}>
                    {milestone.year}
                  </span>
                  <span className={T.metaText} style={{ color: DARK_PALETTE.textMuted }}>
                    &middot;
                  </span>
                  <span className={T.metaText} style={{ color: DARK_PALETTE.textMuted }}>
                    {yearsAway === 1 ? 'In 1 year' : `In ${yearsAway} years`}
                  </span>
                </div>

                {/* Title */}
                <h4 className={T.milestoneTitle} style={{ color: DARK_PALETTE.textPrimary }}>
                  {milestone.event}
                </h4>

                {/* Description */}
                <p className={T.milestoneDescription} style={{ color: DARK_PALETTE.textMuted }}>
                  {milestone.description}
                </p>

                {/* Impact */}
                <p className={T.milestoneImpact} style={{ color: impactColor }}>
                  {milestone.impact}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// Coverage Comparison (Monet/Light Theme) — preserved as-is
// =============================================================================

function CoverageComparisonLight({
  recommendedLifeTpd,
  recommendedCriticalIllness,
  recommendedEarlyCi,
  recommendedDisability,
  recommendedPersonalAccident,
}: {
  recommendedLifeTpd: number
  recommendedCriticalIllness: number
  recommendedEarlyCi: number
  recommendedDisability: number
  recommendedPersonalAccident: number
}) {
  const colorScheme = useColorScheme()
  const monetColors = getInsuranceTheme(colorScheme)

  const categories = [
    { name: 'Life/TPD', icon: Shield, recommended: recommendedLifeTpd, current: 0 },
    { name: 'Critical Illness', icon: HeartPulse, recommended: recommendedCriticalIllness, current: 0 },
    { name: 'Early CI', icon: ShieldAlert, recommended: recommendedEarlyCi, current: 0 },
    { name: 'Disability', icon: Accessibility, recommended: recommendedDisability, current: 0 },
    { name: 'Personal Accident', icon: Zap, recommended: recommendedPersonalAccident, current: 0 },
  ]

  return (
    <div className="space-y-3">
      {/* Header */}
      <div
        className="flex items-center gap-4 pb-2"
        style={{ borderBottom: '1px solid rgba(155, 139, 180, 0.15)' }}
      >
        <div className={cn('flex-1', T.metaText)} style={{ color: monetColors.textMuted }}>
          Category
        </div>
        <div className={cn('w-28 text-right', T.metaText)} style={{ color: monetColors.textMuted }}>
          Recommended
        </div>
        <div className={cn('w-28 text-right', T.metaText)} style={{ color: monetColors.textMuted }}>
          Current
        </div>
        <div className={cn('w-28 text-right', T.metaText)} style={{ color: monetColors.textMuted }}>
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
              <span className={T.bodyText} style={{ color: monetColors.textSecondary }}>
                {cat.name}
              </span>
            </div>
            <div className="w-28 text-right">
              <span
                className={cn(T.bodyText, 'font-mono')}
                style={{ color: monetColors.textMuted }}
              >
                {formatCoverageAmount(cat.recommended)}
              </span>
            </div>
            <div className="w-28 text-right">
              <span
                className={cn(T.bodyText, 'font-mono')}
                style={{ color: monetColors.textPrimary }}
              >
                {formatCoverageAmount(cat.current)}
              </span>
            </div>
            <div className="w-28 flex items-center justify-end gap-1.5">
              {hasGap ? (
                <>
                  <AlertCircle className="h-3.5 w-3.5" style={{ color: monetColors.coralRose }} />
                  <span className={T.statusText} style={{ color: monetColors.coralRose }}>
                    Gap: {formatCoverageAmount(gap)}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: monetColors.sage }} />
                  <span className={T.statusText} style={{ color: monetColors.sage }}>
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
// Milestone Cards (Monet/Light Theme) — preserved as-is
// =============================================================================

function getMilestoneIcon(category: CoverageMilestone['category']) {
  return getMilestoneIconFromConfig(category, 'light')
}

function getMilestoneColor(category: CoverageMilestone['category'], theme: ReturnType<typeof getInsuranceTheme>, isMonet: boolean) {
  const colors = getMilestoneColorsFromConfig(category, 'light', theme, isMonet)
  return {
    bg: colors.bg,
    border: colors.border ?? '',
    text: colors.text ?? '',
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
        <p className={T.bodyText} style={{ color: monetColors.textMuted }}>
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
                  <span className={T.metaText} style={{ color: monetColors.textMuted }}>
                    {milestone.year}
                  </span>
                  <span className={T.legendText} style={{ color: monetColors.textMuted }}>•</span>
                  <span className={T.legendText} style={{ color: monetColors.textMuted }}>
                    {yearsAway === 1 ? 'In 1 year' : `In ${yearsAway} years`}
                  </span>
                </div>

                <h4
                  className={cn(T.milestoneTitle, 'mb-0.5')}
                  style={{ color: monetColors.textPrimary }}
                >
                  {milestone.event}
                </h4>

                <p className={T.milestoneDescription} style={{ color: monetColors.textSecondary }}>
                  {milestone.description}
                </p>

                <div
                  className={cn(T.milestoneImpact, 'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg mt-2')}
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
// Coverage Chart (Monet/Light Theme) — preserved as-is
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
    earlyCi: {
      line: '#14B8A6',
      fill: 'rgba(20, 184, 166, 0.12)',
    },
    disability: {
      line: '#A78BFA',
      fill: 'rgba(167, 139, 250, 0.12)',
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
  // Flips to true once the chart has rendered its scales, triggering a
  // re-render so milestone icons can read pixel positions from Chart.js
  const [chartScalesReady, setChartScalesReady] = useState(false)

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
          label: 'Early CI',
          data: projections.map(p => p.recommendedEarlyCi),
          borderColor: CHART_COLORS_LIGHT.earlyCi.line,
          backgroundColor: CHART_COLORS_LIGHT.earlyCi.fill,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: CHART_COLORS_LIGHT.earlyCi.line,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          borderWidth: 1.5,
        },
        {
          label: 'Disability',
          data: projections.map(p => p.recommendedDisability),
          borderColor: CHART_COLORS_LIGHT.disability.line,
          backgroundColor: CHART_COLORS_LIGHT.disability.fill,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: CHART_COLORS_LIGHT.disability.line,
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

  // After the chart mounts and renders, its scales become available.
  // We need one re-render to read pixel positions for milestone icons.
  const chartScalesReadyRef = useRef(chartScalesReady)
  chartScalesReadyRef.current = chartScalesReady

  const chartOptions: ChartOptions<'line'> = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        onComplete: () => {
          if (!chartScalesReadyRef.current) {
            setChartScalesReady(true)
          }
        },
      },
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
          <span className={T.bodyText} style={{ color: monetColors.textSecondary }}>
            Viewing age
          </span>
          <span
            className={cn(T.bodyText, 'font-semibold px-2 py-0.5 rounded-lg')}
            style={{
              background: isCurrentAge ? `${monetColors.sage}20` : `${monetColors.lavender}20`,
              color: isCurrentAge ? monetColors.sage : monetColors.lavenderDark,
            }}
          >
            {selectedAge}
            {isCurrentAge && ' (You)'}
          </span>
        </div>
        <span className={T.metaText} style={{ color: monetColors.textMuted }}>
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

        {/* Milestone markers on chart — positioned relative to the data curve */}
        {milestones.map((milestone, idx) => {
          const minAge = projections[0]?.age ?? 25
          const maxAge = projections[projections.length - 1]?.age ?? 75

          // Skip milestones outside the chart range
          if (milestone.age < minAge || milestone.age > maxAge) return null

          const chart = chartRef.current
          if (!chart || !chart.chartArea) return null

          const Icon = getMilestoneIcon(milestone.category)
          const colors = getMilestoneColor(milestone.category, monetColors, true)

          // Find the data index for this milestone's age
          const dataIndex = projections.findIndex(p => p.age === milestone.age)
          if (dataIndex < 0) return null

          // Get X pixel from Chart.js scale
          const pixelX = chart.scales.x.getPixelForValue(dataIndex)

          // Find the highest dataset value at this age
          const projection = projections[dataIndex]
          const maxValue = Math.max(
            projection.recommendedLifeTpd,
            projection.recommendedCriticalIllness,
            projection.recommendedEarlyCi,
            projection.recommendedDisability,
            projection.recommendedPersonalAccident
          )

          // Convert data value to pixel Y, offset 24px above the curve
          const ICON_OFFSET_ABOVE_CURVE = 24
          const pixelY = chart.scales.y.getPixelForValue(maxValue) - ICON_OFFSET_ABOVE_CURVE

          return (
            <div
              key={idx}
              className="absolute pointer-events-none"
              style={{
                left: pixelX,
                top: pixelY,
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
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5" style={{ color: monetColors.lavender }} />
          <div className="w-3 h-0.5 rounded-full" style={{ background: monetColors.lavender }} />
          <span className={T.legendText} style={{ color: monetColors.textMuted }}>Life/TPD</span>
        </div>
        <div className="flex items-center gap-2">
          <HeartPulse className="h-3.5 w-3.5" style={{ color: monetColors.sage }} />
          <div className="w-3 h-0.5 rounded-full" style={{ background: monetColors.sage }} />
          <span className={T.legendText} style={{ color: monetColors.textMuted }}>Critical Illness</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5" style={{ color: '#14B8A6' }} />
          <div className="w-3 h-0.5 rounded-full" style={{ background: '#14B8A6' }} />
          <span className={T.legendText} style={{ color: monetColors.textMuted }}>Early CI</span>
        </div>
        <div className="flex items-center gap-2">
          <Accessibility className="h-3.5 w-3.5" style={{ color: '#A78BFA' }} />
          <div className="w-3 h-0.5 rounded-full" style={{ background: '#A78BFA' }} />
          <span className={T.legendText} style={{ color: monetColors.textMuted }}>Disability</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5" style={{ color: monetColors.coralRose }} />
          <div className="w-3 h-0.5 rounded-full" style={{ background: monetColors.coralRose }} />
          <span className={T.legendText} style={{ color: monetColors.textMuted }}>Personal Accident</span>
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

  // Person selection state -- dark mode uses multi-select hook, monet uses single-select
  const {
    selectedPersonIds,
    togglePerson: handleTogglePerson,
    toggleSelectAll: handleToggleSelectAllPersons,
  } = usePersonFilterLocal(includedPersons)
  const [monetSelectedPersonId, setMonetSelectedPersonId] = useState<string | null>(null)

  // Category filter state (dark mode only) — multi-select via Set
  const [activeCategories, setActiveCategories] = useState<Set<IndividualCategory>>(
    () => new Set(ALL_CATEGORIES)
  )

  const handleToggleCategory = useCallback((category: IndividualCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])



  // Derive effective person for projections:
  // - Dark mode: first selected person (or first included if none selected)
  // - Monet mode: single-select value
  const effectivePersonId = isMonet
    ? (monetSelectedPersonId && includedPersons.some(p => p.id === monetSelectedPersonId)
        ? monetSelectedPersonId
        : includedPersons[0]?.id ?? null)
    : (selectedPersonIds !== null && selectedPersonIds.size > 0
        ? (includedPersons.find(p => selectedPersonIds.has(p.id))?.id ?? includedPersons[0]?.id ?? null)
        : includedPersons[0]?.id ?? null)

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
        <div
          className="h-12 rounded-xl"
          style={{ background: isMonet ? 'rgba(255,255,255,0.4)' : DARK_PALETTE.cardBg }}
        />
        <div
          className="h-[200px] rounded-xl"
          style={{ background: isMonet ? 'rgba(255,255,255,0.4)' : DARK_PALETTE.cardBg }}
        />
        <div
          className="h-32 rounded-xl"
          style={{ background: isMonet ? 'rgba(255,255,255,0.4)' : DARK_PALETTE.cardBg }}
        />
      </div>
    )
  }

  if (!selectedPerson) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Shield
          className="h-12 w-12 mx-auto mb-4"
          style={{ color: isMonet ? monetColors.lavenderLight : DARK_PALETTE.blueLifeTpd }}
        />
        <p className="text-sm" style={{ color: isMonet ? monetColors.textMuted : DARK_PALETTE.textMuted }}>
          Select a person to view their coverage journey
        </p>
      </div>
    )
  }

  // =========================================================================
  // DARK MODE RENDER
  // =========================================================================
  if (!isMonet) {
    return (
      <div className={cn('space-y-6 p-8', className)}>
        {/* Coverage Projection Chart Card */}
        <div
          className="rounded-sm p-6"
          style={{
            background: DARK_PALETTE.cardBg,
            border: `1px solid ${DARK_PALETTE.cardBorder}`,
          }}
        >
          {/* Chart header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex flex-col gap-1">
              <h3
                className={T.sectionTitle}
                style={{ color: DARK_PALETTE.textPrimary }}
              >
                Coverage Analysis Over Time
              </h3>
              <p className={T.sectionSubtitle} style={{ color: DARK_PALETTE.textMuted }}>
                How your coverage gap changes as you age — drag marker to explore
              </p>
            </div>

            {/* Person Selector — multi-select matching Pencil design */}
            {includedPersons.length > 1 && (
              <PersonViewDropdown
                persons={includedPersons}
                selectedIds={selectedPersonIds}
                onToggle={handleTogglePerson}
                onSelectAll={handleToggleSelectAllPersons}
              />
            )}
          </div>

          {/* Divider */}
          <div className="h-px mb-5" style={{ background: DARK_PALETTE.cardBorder }} />

          {/* Filters row: chips + legend */}
          <div className="flex items-center justify-between mb-5">
            <DarkCategoryFilterDropdown
              activeCategories={activeCategories}
              onToggleCategory={handleToggleCategory}
              onSelectAll={() => setActiveCategories((prev) =>
                prev.size === ALL_CATEGORIES.length ? new Set() : new Set(ALL_CATEGORIES)
              )}
            />
            <DarkChartLegend />
          </div>

          {/* Chart */}
          <DarkCoverageChart
            projections={projections}
            milestones={milestones}
            currentAge={currentAge}
            selectedAge={selectedAge}
            onAgeSelect={setSelectedAge}
            activeCategories={activeCategories}
            isMultiPerson={includedPersons.length > 1 && (selectedPersonIds === null || selectedPersonIds.size !== 1)}
          />
        </div>

        {/* Bottom 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DarkCoverageBreakdownCard
            projections={projections}
            selectedAge={selectedAge}
            persons={persons ?? []}
          />
          <DarkMilestonesCard
            milestones={milestones}
            currentYear={currentYear}
          />
        </div>

      </div>
    )
  }

  // =========================================================================
  // MONET (LIGHT) MODE RENDER — preserved as-is
  // =========================================================================
  return (
    <div className={cn('space-y-6 p-8', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2
            className={T.sectionTitle}
            style={{
              color: monetColors.textPrimary,
              fontFamily: "'Cormorant Garamond', Georgia, serif",
            }}
          >
            Coverage Journey
          </h2>
          <p className={cn(T.cardDescription, 'mt-1')} style={{ color: monetColors.textSecondary }}>
            How your insurance needs change over time
          </p>
        </div>

        {/* Person Selector */}
        {includedPersons.length > 1 && (
          <PersonSelector
            value={effectivePersonId}
            onChange={(id) => setMonetSelectedPersonId(id)}
            variant="monet"
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
          className={cn(T.cardLabel, 'mb-3')}
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
                className={T.cardLabel}
                style={{ color: monetColors.textMuted }}
              >
                At Age {selectedAge}
              </div>
              <div className={cn(T.cardDescription, 'mt-0.5')} style={{ color: monetColors.textSecondary }}>
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
                className={cn(T.metaText, 'transition-colors')}
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
              recommendedEarlyCi={selectedProjection.recommendedEarlyCi}
              recommendedDisability={selectedProjection.recommendedDisability}
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
              className={cn(T.cardLabel, 'mb-3')}
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
