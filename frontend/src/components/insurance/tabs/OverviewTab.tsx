'use client'

import { useState, useMemo } from 'react'
import {
  Shield,
  Stethoscope,
  Accessibility,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  Circle,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GovernmentSchemeCard } from '../cards/GovernmentSchemeCard'
import type {
  GovernmentCoverageStatus,
  CoverageStatus,
  StressEvent,
  StressTimeframe,
} from '@/types/insurance'
import { stressEventConfig, stressTimeframeConfig } from '@/types/insurance'
import { createMockStressTestMatrix } from '@/lib/stress-test-calculator'

/**
 * OverviewTab - Redesigned with side-by-side layout
 *
 * Left: 4 square insurance category blocks (SG standard categories)
 * Right: GitHub-style stress test heatmap
 *
 * Categories follow Singapore insurance industry standard:
 * 1. Hospitalisation (MediShield Life + ISP + riders)
 * 2. Life/TPD/Death (term life, whole life, DPS)
 * 3. Critical Illness (early CI, multi-pay CI)
 * 4. Personal Accident (optional)
 */

// Singapore standard insurance categories
type InsuranceCategoryId = 'hospitalisation' | 'life_tpd' | 'critical_illness' | 'personal_accident'

interface InsuranceCategoryStatus {
  id: InsuranceCategoryId
  label: string
  shortLabel: string
  status: CoverageStatus
  summary: string
  details: string[]
}

// Mock data using SG standard categories
const mockCategories: InsuranceCategoryStatus[] = [
  {
    id: 'hospitalisation',
    label: 'Hospitalisation',
    shortLabel: 'Hospital',
    status: 'covered',
    summary: 'Ward B1 with ISP + rider',
    details: ['MediShield Life (base)', 'PRUShield Plus (ISP)', '$3K deductible', '5% co-pay rider'],
  },
  {
    id: 'life_tpd',
    label: 'Life / TPD / Death',
    shortLabel: 'Life/TPD',
    status: 'partial',
    summary: '$420K coverage (DPS + term)',
    details: ['DPS: $70K (auto-enrolled)', 'Term Life: $350K', '2 dependents', '$350K mortgage outstanding'],
  },
  {
    id: 'critical_illness',
    label: 'Critical Illness',
    shortLabel: 'CI',
    status: 'partial',
    summary: '$100K early CI',
    details: ['AIA Early CI: $100K', 'No late-stage CI', 'No multi-pay coverage'],
  },
  {
    id: 'personal_accident',
    label: 'Personal Accident',
    shortLabel: 'Personal Accident',
    status: 'exposed',
    summary: 'No coverage',
    details: ['No PA plan', 'Consider if active lifestyle'],
  },
]

const mockGovernmentSchemes: GovernmentCoverageStatus[] = [
  { scheme: 'medishield_life', isActive: true, notes: 'Active since 2016' },
  { scheme: 'careshield_life', isActive: true, monthlyPayout: 662, notes: 'Born after 1980' },
  { scheme: 'dps', isActive: true, coverageAmount: 70000, notes: 'Auto-enrolled' },
  { scheme: 'eldershield', isActive: false, notes: 'Replaced by CareShield' },
]

const categoryIcons: Record<InsuranceCategoryId, typeof Stethoscope> = {
  hospitalisation: Stethoscope,
  life_tpd: Shield,
  critical_illness: HeartHandshake,
  personal_accident: Accessibility,
}

const events: StressEvent[] = ['cancer', 'accident', 'stroke', 'death', 'severe_disability']
const timeframes: StressTimeframe[] = ['6_months', '2_years', '5_years', 'lifetime']

export function OverviewTab() {
  const [selectedCategory, setSelectedCategory] = useState<InsuranceCategoryId | null>(null)
  const [selectedCell, setSelectedCell] = useState<{
    event: StressEvent
    timeframe: StressTimeframe
  } | null>(null)

  const stressTestMatrix = useMemo(() => createMockStressTestMatrix(), [])

  const selectedCategoryData = selectedCategory
    ? mockCategories.find((c) => c.id === selectedCategory)
    : null

  const selectedCellData = selectedCell
    ? stressTestMatrix.results[selectedCell.event][selectedCell.timeframe]
    : null

  // Count statuses
  const coveredCount = mockCategories.filter((c) => c.status === 'covered').length
  const partialCount = mockCategories.filter((c) => c.status === 'partial').length
  const totalCategories = mockCategories.length

  return (
    <div className="space-y-6">
      {/* Main Dashboard - Side by Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT: Insurance Categories as Square Blocks */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Insurance Coverage</h2>
              <p className="text-sm text-slate-400">
                <span className="text-white font-medium">{coveredCount}</span> of{' '}
                {totalCategories} areas covered
              </p>
            </div>
            <div className="flex gap-1.5">
              <StatusDot status="covered" count={coveredCount} />
              <StatusDot status="partial" count={partialCount} />
            </div>
          </div>

          {/* 4 Square Blocks - 2x2 grid */}
          <div className="grid grid-cols-2 gap-3 justify-items-center">
            {mockCategories.map((category) => (
              <CategoryBlock
                key={category.id}
                category={category}
                isSelected={selectedCategory === category.id}
                onClick={() =>
                  setSelectedCategory(selectedCategory === category.id ? null : category.id)
                }
              />
            ))}
          </div>

          {/* Selected category detail */}
          {selectedCategoryData && (
            <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <h4 className="text-sm font-medium text-white">
                {selectedCategoryData.label}
              </h4>
              <p className="mt-1 text-xs text-slate-400">{selectedCategoryData.summary}</p>
              <ul className="mt-2 space-y-1">
                {selectedCategoryData.details.map((d, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="h-1 w-1 rounded-full bg-slate-600" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* RIGHT: GitHub-style Stress Test Heatmap */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">What happens if...</h2>
            <p className="text-sm text-slate-400">Coverage response to life events</p>
          </div>

          {/* GitHub-style grid */}
          <div className="space-y-2">
            {/* Timeframe labels */}
            <div className="grid grid-cols-[100px_repeat(4,1fr)] gap-1.5 text-xs text-slate-500">
              <div />
              {timeframes.map((tf) => (
                <div key={tf} className="text-center">
                  {stressTimeframeConfig[tf].shortLabel}
                </div>
              ))}
            </div>

            {/* Event rows with squares */}
            {events.map((event) => {
              const config = stressEventConfig[event]
              return (
                <div key={event} className="grid grid-cols-[100px_repeat(4,1fr)] gap-1.5 items-center">
                  <div className="text-xs text-slate-400 truncate">{config.shortLabel}</div>
                  {timeframes.map((tf) => {
                    const cell = stressTestMatrix.results[event][tf]
                    const isSelected =
                      selectedCell?.event === event && selectedCell?.timeframe === tf
                    return (
                      <button
                        key={`${event}-${tf}`}
                        type="button"
                        onClick={() =>
                          setSelectedCell(isSelected ? null : { event, timeframe: tf })
                        }
                        className={cn(
                          'aspect-square w-full max-w-[40px] mx-auto rounded-md transition-all',
                          cell.status === 'covered' && 'bg-emerald-500 hover:bg-emerald-400',
                          cell.status === 'partial' && 'bg-amber-500 hover:bg-amber-400',
                          cell.status === 'exposed' && 'bg-slate-600 hover:bg-slate-500',
                          isSelected && 'ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                        )}
                        title={`${config.label} - ${stressTimeframeConfig[tf].label}`}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 border-t border-white/[0.06] pt-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="h-3 w-3 rounded bg-emerald-500" />
              Protected
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="h-3 w-3 rounded bg-amber-500" />
              At Risk
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="h-3 w-3 rounded bg-slate-600" />
              Exposed
            </div>
          </div>

          {/* Selected cell detail */}
          {selectedCellData && selectedCell && (
            <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white">
                  {stressEventConfig[selectedCell.event].label} -{' '}
                  {stressTimeframeConfig[selectedCell.timeframe].label}
                </h4>
                <StatusBadge status={selectedCellData.status} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{selectedCellData.riskStatement}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Total need:</span>
                  <span className="ml-1 font-mono text-slate-300">
                    ${selectedCellData.impact.totalNeed.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Resources:</span>
                  <span className="ml-1 font-mono text-emerald-400">
                    ${selectedCellData.resources.totalResources.toLocaleString()}
                  </span>
                </div>
              </div>
              {selectedCellData.shortfall > 0 && (
                <div className="mt-2 text-xs text-slate-500">
                  Shortfall:{' '}
                  <span className="font-mono text-amber-400">
                    ${selectedCellData.shortfall.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Hint */}
          {!selectedCell && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-500/5 border border-blue-500/10 px-3 py-2">
              <Info className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs text-slate-400">Click any square for details</span>
            </div>
          )}
        </div>
      </div>

      {/* Government Schemes - Full Width Below */}
      <GovernmentSchemeCard schemes={mockGovernmentSchemes} />
    </div>
  )
}

// Square block for insurance category
function CategoryBlock({
  category,
  isSelected,
  onClick,
}: {
  category: InsuranceCategoryStatus
  isSelected: boolean
  onClick: () => void
}) {
  const Icon = categoryIcons[category.id]

  const statusColors = {
    covered: {
      bg: 'bg-emerald-500/15 hover:bg-emerald-500/25',
      border: 'border-emerald-500/30',
      icon: 'text-emerald-400',
    },
    partial: {
      bg: 'bg-amber-500/15 hover:bg-amber-500/25',
      border: 'border-amber-500/30',
      icon: 'text-amber-400',
    },
    exposed: {
      bg: 'bg-slate-500/15 hover:bg-slate-500/25',
      border: 'border-slate-500/30',
      icon: 'text-slate-400',
    },
  }

  const colors = statusColors[category.status]
  const StatusIcon =
    category.status === 'covered'
      ? CheckCircle2
      : category.status === 'partial'
        ? AlertCircle
        : Circle

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg border p-2 transition-all h-[72px] w-[72px]',
        colors.bg,
        isSelected ? 'border-white/30 ring-2 ring-white/20' : colors.border
      )}
    >
      <Icon className={cn('h-6 w-6 mb-1', colors.icon)} />
      <span className="text-[8px] font-medium text-white text-center leading-tight">
        {category.shortLabel}
      </span>
      <StatusIcon
        className={cn(
          'absolute top-1.5 right-1.5 h-3 w-3',
          category.status === 'covered' && 'text-emerald-400',
          category.status === 'partial' && 'text-amber-400',
          category.status === 'exposed' && 'text-slate-400'
        )}
      />
    </button>
  )
}

// Status dot for header
function StatusDot({ status, count }: { status: CoverageStatus; count: number }) {
  if (count === 0) return null

  const colors = {
    covered: 'bg-emerald-500',
    partial: 'bg-amber-500',
    exposed: 'bg-slate-500',
  }

  return (
    <div className="flex items-center gap-1">
      <span className={cn('h-2 w-2 rounded-full', colors[status])} />
      <span className="text-xs text-slate-500">{count}</span>
    </div>
  )
}

// Status badge
function StatusBadge({ status }: { status: CoverageStatus }) {
  const config = {
    covered: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Protected' },
    partial: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'At Risk' },
    exposed: { bg: 'bg-slate-500/15', text: 'text-slate-400', label: 'Exposed' },
  }

  const c = config[status]

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', c.bg, c.text)}>
      {c.label}
    </span>
  )
}
