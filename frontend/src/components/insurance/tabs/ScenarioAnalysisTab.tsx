'use client'

import { useState, useMemo } from 'react'
import { Info, Filter, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StressTestMatrix } from '../stress-test/StressTestMatrix'
import { createMockStressTestMatrix } from '@/lib/stress-test-calculator'
import type { StressEvent, StressTimeframe } from '@/types/insurance'
import { stressEventConfig, stressTimeframeConfig } from '@/types/insurance'

/**
 * ScenarioAnalysisTab - Replaces GapAnalysisTab
 *
 * Key changes from original:
 * 1. REMOVED: Dollar-based gap bars with red indicators
 * 2. REMOVED: "Critical Gaps: X" summary cards
 * 3. REMOVED: Priority-based alarmist framing
 * 4. ADDED: Full stress test matrix (event × timeframe)
 * 5. ADDED: Event-based filtering
 * 6. ADDED: Neutral educational framing
 */

const events: StressEvent[] = [
  'cancer',
  'accident',
  'stroke',
  'death',
  'severe_disability',
]

const timeframes: StressTimeframe[] = [
  '6_months',
  '2_years',
  '5_years',
  'lifetime',
]

export function ScenarioAnalysisTab() {
  const [selectedEvent, setSelectedEvent] = useState<StressEvent | 'all'>('all')
  const [selectedTimeframe, setSelectedTimeframe] = useState<StressTimeframe | 'all'>('all')

  // Generate stress test matrix
  const stressTestMatrix = useMemo(() => createMockStressTestMatrix(), [])

  // Filter results based on selection
  const filteredResults = useMemo(() => {
    if (selectedEvent === 'all' && selectedTimeframe === 'all') {
      return stressTestMatrix
    }

    const filteredMatrix = { ...stressTestMatrix }

    if (selectedEvent !== 'all') {
      const singleEventResults: typeof stressTestMatrix.results = {
        cancer: stressTestMatrix.results.cancer,
        accident: stressTestMatrix.results.accident,
        stroke: stressTestMatrix.results.stroke,
        death: stressTestMatrix.results.death,
        severe_disability: stressTestMatrix.results.severe_disability,
      }

      // Keep only the selected event
      for (const event of events) {
        if (event !== selectedEvent) {
          delete singleEventResults[event]
        }
      }

      filteredMatrix.results = singleEventResults as typeof stressTestMatrix.results
    }

    return filteredMatrix
  }, [stressTestMatrix, selectedEvent, selectedTimeframe])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Scenario Analysis</h2>
        <p className="text-sm text-slate-400">
          Explore how your coverage responds to different life events
        </p>
      </div>

      {/* Educational intro */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
        <div>
          <p className="text-sm text-slate-300">
            This analysis shows what happens to your finances under different scenarios.
            Each cell represents a combination of event type and duration. Click any cell
            to see the detailed financial breakdown.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Note: These are estimates based on Singapore healthcare costs (2025). Actual
            costs vary by hospital, treatment, and individual circumstances.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Filter className="h-4 w-4" />
          Filter by:
        </div>

        {/* Event filter */}
        <FilterDropdown
          label="Event"
          value={selectedEvent}
          onChange={(v) => setSelectedEvent(v as StressEvent | 'all')}
          options={[
            { value: 'all', label: 'All Events' },
            ...events.map((e) => ({
              value: e,
              label: stressEventConfig[e].label,
            })),
          ]}
        />

        {/* Timeframe filter */}
        <FilterDropdown
          label="Duration"
          value={selectedTimeframe}
          onChange={(v) => setSelectedTimeframe(v as StressTimeframe | 'all')}
          options={[
            { value: 'all', label: 'All Durations' },
            ...timeframes.map((t) => ({
              value: t,
              label: stressTimeframeConfig[t].label,
            })),
          ]}
        />

        {/* Reset button */}
        {(selectedEvent !== 'all' || selectedTimeframe !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSelectedEvent('all')
              setSelectedTimeframe('all')
            }}
            className="text-sm text-slate-500 hover:text-white"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Main stress test matrix */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <StressTestMatrix matrix={filteredResults} />
      </div>

      {/* Key insights */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h3 className="mb-4 text-lg font-medium text-white">Key Observations</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InsightCard
            title="Short-term Events"
            description="Your coverage handles events lasting up to 6 months reasonably well, primarily through savings and insurance payouts."
            status="covered"
          />
          <InsightCard
            title="Extended Illness"
            description="Events lasting 2+ years may deplete resources faster than coverage can replenish. Consider income protection options."
            status="partial"
          />
          <InsightCard
            title="Lifetime Impact"
            description="Severe disability or death scenarios show the largest gaps due to ongoing care costs or dependency needs."
            status="exposed"
          />
        </div>
      </div>

      {/* Methodology note */}
      <div className="rounded-xl bg-white/[0.02] p-4">
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
          How We Calculate This
        </h4>
        <div className="grid gap-4 text-xs text-slate-400 sm:grid-cols-2">
          <div>
            <p className="font-medium text-slate-300">Financial Impact</p>
            <ul className="mt-1 space-y-1">
              <li>• Medical costs from MOH fee benchmarks</li>
              <li>• Income loss based on your declared income</li>
              <li>• Care costs from eldercare market rates</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-slate-300">Coverage Resources</p>
            <ul className="mt-1 space-y-1">
              <li>• Insurance payouts from your policies</li>
              <li>• Government schemes (DPS, CareShield, etc.)</li>
              <li>• Your declared emergency savings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// Filter dropdown component
function FilterDropdown({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find((o) => o.value === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all',
          value !== 'all'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            : 'border-white/[0.08] bg-white/[0.03] text-slate-300 hover:border-white/[0.12]'
        )}
      >
        <span className="text-slate-500">{label}:</span>
        <span>{selectedOption?.label}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-white/[0.08] bg-slate-900 p-1 shadow-xl">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                  value === option.value
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-slate-300 hover:bg-white/[0.05]'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Insight card component
function InsightCard({
  title,
  description,
  status,
}: {
  title: string
  description: string
  status: 'covered' | 'partial' | 'exposed'
}) {
  const statusColors = {
    covered: 'border-emerald-500/20 bg-emerald-500/5',
    partial: 'border-amber-500/20 bg-amber-500/5',
    exposed: 'border-slate-500/20 bg-slate-500/5',
  }

  const dotColors = {
    covered: 'bg-emerald-400',
    partial: 'bg-amber-400',
    exposed: 'bg-slate-400',
  }

  return (
    <div className={cn('rounded-xl border p-4', statusColors[status])}>
      <div className="mb-2 flex items-center gap-2">
        <span className={cn('h-2 w-2 rounded-full', dotColors[status])} />
        <h4 className="text-sm font-medium text-white">{title}</h4>
      </div>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
  )
}
