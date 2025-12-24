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
 * Allows users to plan multiple loan periods with different rates.
 */
export function LoanSegmentEditor({
  segments,
  onSegmentsChange,
  initialStartMonth,
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
      fixedYears: 2,
      fixedRate: 3.5,
      floatingRate: 4.0,
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

            {/* Fixed period and rates */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-white/50 block mb-1">Fixed Period</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={segment.fixedYears}
                    onChange={(e) => handleUpdateSegment(segment.id, { fixedYears: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={segment.termYears}
                    className="w-full bg-white/10 text-sm text-white rounded px-2 py-1.5 border-white/10 h-auto"
                  />
                  <span className="text-xs text-white/40">yr</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">Fixed Rate</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={segment.fixedRate}
                    onChange={(e) => handleUpdateSegment(segment.id, { fixedRate: parseFloat(e.target.value) || 0 })}
                    step={0.1}
                    min={0}
                    className="w-full bg-white/10 text-sm text-white rounded px-2 py-1.5 border-white/10 h-auto"
                  />
                  <span className="text-xs text-white/40">%</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">Floating Rate</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={segment.floatingRate}
                    onChange={(e) => handleUpdateSegment(segment.id, { floatingRate: parseFloat(e.target.value) || 0 })}
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
