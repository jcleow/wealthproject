"use client"

import { MonthPicker } from '@/components/ui/MonthPicker'
import { IconPicker } from './IconPicker'
import type { ScenarioEventFormState } from '../hooks'

interface ScenarioFormFieldsProps {
  form: ScenarioEventFormState
  onFieldChange: <K extends keyof ScenarioEventFormState>(field: K, value: ScenarioEventFormState[K]) => void
  disabled?: boolean
}

export function ScenarioFormFields({ form, onFieldChange, disabled }: ScenarioFormFieldsProps) {
  return (
    <>
      {/* Include toggle */}
      <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <div className="text-sm text-slate-300">Include in projections</div>
        <button
          type="button"
          onClick={() => onFieldChange('isIncluded', !form.isIncluded)}
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
            form.isIncluded
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-white/[0.08] bg-white/[0.03] text-slate-400'
          }`}
        >
          <span className={`flex h-4 w-8 items-center rounded-full p-[2px] transition-all ${form.isIncluded ? 'bg-emerald-500/60 justify-end' : 'bg-white/10 justify-start'}`}>
            <span className={`h-3 w-3 rounded-full ${form.isIncluded ? 'bg-white' : 'bg-slate-400'}`} />
          </span>
          {form.isIncluded ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      {/* Form grid */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="text-sm font-medium text-slate-300">Name</span>
          <input
            value={form.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
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
            rows={2}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none resize-none disabled:opacity-50"
            placeholder="What is this scenario about?"
            disabled={disabled}
          />
        </div>
      </div>
    </>
  )
}
