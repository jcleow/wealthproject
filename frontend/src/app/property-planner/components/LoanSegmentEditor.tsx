'use client'

import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { MonthPicker } from '@/components/ui/MonthPicker'
import type { LoanSegment } from '../types'

interface LoanSegmentEditorProps {
  segments: LoanSegment[]
  onSegmentsChange: (segments: LoanSegment[]) => void
  initialStartMonth: string
  loanType: 'bank' | 'hdb'
}

/**
 * Calculate the end month of a segment
 */
function getSegmentEndMonth(startMonth: string, termYears: number): string {
  const [year, month] = startMonth.split('-').map(Number)
  const endDate = new Date(year, month - 1 + termYears * 12, 1)
  return `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Format month for display
 */
function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/**
 * LoanSegmentEditor - A component for managing loan segments/refinancing scenarios.
 *
 * For HDB loans: Shows a single rate input with FIXED label (HDB loans are always fixed at 2.6%)
 * For Bank loans: Allows multiple rate tranches with rate type selector (fixed or floating)
 */
export function LoanSegmentEditor({
  segments,
  onSegmentsChange,
  initialStartMonth,
  loanType,
}: LoanSegmentEditorProps) {
  const handleAddSegment = () => {
    const lastSegment = segments[segments.length - 1]
    const newStartMonth = lastSegment
      ? getSegmentEndMonth(lastSegment.startMonth, lastSegment.termYears)
      : initialStartMonth

    const newSegment: LoanSegment = {
      id: `segment-${Date.now()}`,
      startMonth: newStartMonth,
      termYears: 5,
      rate: 3.5,
      rateType: 'fixed',
    }
    onSegmentsChange([...segments, newSegment])
  }

  const handleUpdateSegment = (id: string, updates: Partial<LoanSegment>) => {
    onSegmentsChange(segments.map(segment => (segment.id === id ? { ...segment, ...updates } : segment)))
  }

  const handleDeleteSegment = (id: string) => {
    if (segments.length <= 1) return
    onSegmentsChange(segments.filter(segment => segment.id !== id))
  }

  // For HDB loans, show simplified single-rate view
  if (loanType === 'hdb') {
    const segment = segments[0]
    if (!segment) return null

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white/80">Loan Schedule</h4>
          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
            HDB FIXED
          </span>
        </div>

        <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
          {/* Start date and term */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-white/50 block mb-1">Start Date</label>
              <div className={cn(
                "w-full bg-white/10 text-sm text-white/50 rounded px-2 py-1.5 border border-white/10",
                "opacity-50 cursor-not-allowed"
              )}>
                {formatMonth(segment.startMonth)}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">Term (years)</label>
              <Input
                type="number"
                value={segment.termYears}
                onChange={(e) => handleUpdateSegment(segment.id, { termYears: parseInt(e.target.value) || 1 })}
                min={1}
                max={35}
                className="w-full bg-white/10 text-sm text-white rounded px-2 py-1.5 border-white/10 h-auto"
              />
            </div>
          </div>

          {/* HDB Rate (fixed at 2.6%) */}
          <div>
            <label className="text-xs text-white/50 block mb-1">Interest Rate (Fixed)</label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={segment.rate}
                onChange={(e) => handleUpdateSegment(segment.id, { rate: parseFloat(e.target.value) || 0 })}
                step={0.1}
                min={0}
                className="w-full bg-white/10 text-sm text-white rounded px-2 py-1.5 border-white/10 h-auto"
              />
              <span className="text-xs text-white/40">%</span>
            </div>
            <p className="text-xs text-white/40 mt-1">HDB concessionary rate: 2.6% p.a.</p>
          </div>

          {/* Timeline indicator */}
          <div className="text-xs text-white/40 pt-1 border-t border-white/5">
            {formatMonth(segment.startMonth)} → {formatMonth(getSegmentEndMonth(segment.startMonth, segment.termYears))}
          </div>
        </div>
      </div>
    )
  }

  // For Bank loans, show full multi-tranche editor
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white/80">Loan Schedule</h4>
        <button
          type="button"
          onClick={handleAddSegment}
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Refinancing
        </button>
      </div>

      <div className="space-y-3">
        {segments.map((segment, index) => (
          <div
            key={segment.id}
            className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3"
          >
            {/* Segment header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                  index === 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-indigo-500/20 text-indigo-400"
                )}>
                  {index + 1}
                </span>
                <span className="text-sm text-white/80">
                  {index === 0 ? 'Initial Loan' : `Refinancing #${index}`}
                </span>
              </div>
              {segments.length > 1 && index > 0 && (
                <button
                  type="button"
                  onClick={() => handleDeleteSegment(segment.id)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white/40 hover:text-red-400" />
                </button>
              )}
            </div>

            {/* Start date and term */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-white/50 block mb-1">Start Date</label>
                {index === 0 ? (
                  <div className={cn(
                    "w-full bg-white/10 text-sm text-white/50 rounded px-2 py-1.5 border border-white/10",
                    "opacity-50 cursor-not-allowed"
                  )}>
                    {formatMonth(segment.startMonth)}
                  </div>
                ) : (
                  <MonthPicker
                    value={segment.startMonth}
                    onChange={(value) => handleUpdateSegment(segment.id, { startMonth: value })}
                    className="w-full"
                  />
                )}
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">Term (years)</label>
                <Input
                  type="number"
                  value={segment.termYears}
                  onChange={(e) => handleUpdateSegment(segment.id, { termYears: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={35}
                  className="w-full bg-white/10 text-sm text-white rounded px-2 py-1.5 border-white/10 h-auto"
                />
              </div>
            </div>

            {/* Rate type toggle and rate input */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-white/50 block mb-1">Rate Type</label>
                <div className="flex items-center gap-1 p-0.5 bg-white/[0.03] border border-white/[0.08] rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleUpdateSegment(segment.id, { rateType: 'fixed' })}
                    className={cn(
                      'flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all duration-150',
                      segment.rateType === 'fixed'
                        ? 'bg-white/[0.1] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    )}
                  >
                    Fixed
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSegment(segment.id, { rateType: 'floating' })}
                    className={cn(
                      'flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all duration-150',
                      segment.rateType === 'floating'
                        ? 'bg-white/[0.1] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    )}
                  >
                    Floating
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  {segment.rateType === 'fixed' ? 'Fixed Rate' : 'Floating Rate'}
                </label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={segment.rate}
                    onChange={(e) => handleUpdateSegment(segment.id, { rate: parseFloat(e.target.value) || 0 })}
                    step={0.1}
                    min={0}
                    className="w-full bg-white/10 text-sm text-white rounded px-2 py-1.5 border-white/10 h-auto"
                  />
                  <span className="text-xs text-white/40">%</span>
                </div>
              </div>
            </div>

            {/* Timeline indicator */}
            <div className="text-xs text-white/40 pt-1 border-t border-white/5">
              {formatMonth(segment.startMonth)} → {formatMonth(getSegmentEndMonth(segment.startMonth, segment.termYears))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
