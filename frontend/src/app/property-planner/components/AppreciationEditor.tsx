'use client'

import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { AppreciationPeriod } from '../types'

interface AppreciationEditorProps {
  periods: AppreciationPeriod[]
  onPeriodsChange: (periods: AppreciationPeriod[]) => void
}

/**
 * AppreciationEditor - A component for managing property appreciation periods.
 * Allows users to define different appreciation rates for different year ranges.
 */
export function AppreciationEditor({
  periods,
  onPeriodsChange,
}: AppreciationEditorProps) {
  const handleAddPeriod = () => {
    const lastPeriod = periods[periods.length - 1]
    const newStartYear = lastPeriod ? (lastPeriod.endYear ?? lastPeriod.startYear) + 1 : 1

    // Update the previous period's endYear if it was null
    const updatedPeriods = periods.map((period, index) =>
      index === periods.length - 1 && period.endYear === null
        ? { ...period, endYear: newStartYear - 1 }
        : period
    )

    const newPeriod: AppreciationPeriod = {
      id: `period-${Date.now()}`,
      startYear: newStartYear,
      endYear: null, // "onwards"
      rate: 3,
    }
    onPeriodsChange([...updatedPeriods, newPeriod])
  }

  const handleUpdatePeriod = (id: string, updates: Partial<AppreciationPeriod>) => {
    onPeriodsChange(periods.map(period => (period.id === id ? { ...period, ...updates } : period)))
  }

  const handleDeletePeriod = (id: string) => {
    const index = periods.findIndex(period => period.id === id)
    if (index === -1 || periods.length <= 1) return

    const newPeriods = periods.filter(period => period.id !== id)

    // If deleting non-last period, adjust subsequent periods
    if (index < newPeriods.length) {
      const prevPeriod = index > 0 ? newPeriods[index - 1] : null
      if (prevPeriod) {
        newPeriods[index] = {
          ...newPeriods[index],
          startYear: (prevPeriod.endYear ?? prevPeriod.startYear) + 1,
        }
      }
    }

    // Make the last period's endYear null (onwards)
    if (newPeriods.length > 0) {
      newPeriods[newPeriods.length - 1] = {
        ...newPeriods[newPeriods.length - 1],
        endYear: null,
      }
    }

    onPeriodsChange(newPeriods)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white/80">Property Appreciation</h4>
        <button
          type="button"
          onClick={handleAddPeriod}
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Period
        </button>
      </div>

      <div className="space-y-2">
        {periods.map((period) => (
          <div
            key={period.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10"
          >
            {/* Year range */}
            <span className="text-xs text-white/50 w-8">Year</span>
            <Input
              type="number"
              value={period.startYear}
              onChange={(e) => handleUpdatePeriod(period.id, { startYear: parseInt(e.target.value) || 1 })}
              min={1}
              className="w-12 bg-white/10 text-sm text-white text-center rounded px-1 py-1 border-white/10 h-auto"
            />
            <span className="text-white/30">-</span>
            {period.endYear !== null ? (
              <Input
                type="number"
                value={period.endYear}
                onChange={(e) => handleUpdatePeriod(period.id, { endYear: parseInt(e.target.value) || period.startYear })}
                min={period.startYear}
                className="w-12 bg-white/10 text-sm text-white text-center rounded px-1 py-1 border-white/10 h-auto"
              />
            ) : (
              <span className="w-12 text-xs text-white/40 text-center">onwards</span>
            )}

            {/* Rate input */}
            <div className="flex items-center gap-1 ml-auto">
              <Input
                type="number"
                value={period.rate}
                onChange={(e) => handleUpdatePeriod(period.id, { rate: parseFloat(e.target.value) || 0 })}
                step={0.1}
                className="w-14 bg-white/10 text-sm text-white text-right rounded px-2 py-1 border-white/10 h-auto"
              />
              <span className="text-white/50 text-xs">%/yr</span>
            </div>

            {/* Delete button (not for first/only period) */}
            {periods.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeletePeriod(period.id)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white/40 hover:text-red-400" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
