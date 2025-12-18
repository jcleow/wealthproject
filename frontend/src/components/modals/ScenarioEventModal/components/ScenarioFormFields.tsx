"use client"

import { MonthPicker } from '@/components/ui/MonthPicker'
import { IconPicker } from './IconPicker'
import type { ScenarioEventFormState } from '../hooks'

interface ScenarioFormFieldsProps {
  form: ScenarioEventFormState
  onFieldChange: <K extends keyof ScenarioEventFormState>(field: K, value: ScenarioEventFormState[K]) => void
  disabled?: boolean
  anchorYear?: number | null
  anchorMonth?: number | null
}

export function ScenarioFormFields({ form, onFieldChange, disabled, anchorYear, anchorMonth }: ScenarioFormFieldsProps) {
  // Build minDate and defaultViewDate from anchor values
  const minDate = anchorYear && anchorMonth
    ? `${anchorYear}-${String(anchorMonth).padStart(2, '0')}`
    : undefined
  const defaultViewDate = minDate

  return (
    <>
      {/* Form grid */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="text-sm font-medium text-slate-300">Name</span>
          <input
            value={form.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            className={`w-full
px-3 py-2.5
rounded-lg border border-white/[0.08] focus:border-blue-500/50 focus:outline-none
bg-white/[0.03]
text-white placeholder:text-slate-500
disabled:opacity-50`}
            placeholder="e.g., Job Loss"
            disabled={disabled}
          />
        </label>

        <div className="space-y-1.5 text-sm">
          <span className="text-sm font-medium text-slate-300">Occurs on (month)</span>
          <MonthPicker
            value={form.occursOn}
            onChange={(value) => onFieldChange('occursOn', value)}
            placeholder="Select month"
            disabled={disabled}
            className="w-full"
            minDate={minDate}
            defaultViewDate={defaultViewDate}
          />
        </div>

        <IconPicker
          iconName={form.displayIcon}
          iconColor={form.iconColor}
          searchQuery={form.iconSearch}
          onIconChange={(name) => onFieldChange('displayIcon', name)}
          onColorChange={(color) => onFieldChange('iconColor', color)}
          onSearchChange={(query) => onFieldChange('iconSearch', query)}
          disabled={disabled}
        />

        <div className="md:col-span-2 space-y-1.5 text-sm">
          <span className="text-sm font-medium text-slate-300">Description</span>
          <textarea
            value={form.description}
            onChange={(e) => onFieldChange('description', e.target.value)}
            rows={1}
            className={`w-full
px-3 py-2.5
rounded-lg border border-white/[0.08] focus:border-blue-500/50 focus:outline-none
bg-white/[0.03]
text-white placeholder:text-slate-500
disabled:opacity-50
resize-none`}
            placeholder="What is this scenario about?"
            disabled={disabled}
          />
        </div>
      </div>
    </>
  )
}
