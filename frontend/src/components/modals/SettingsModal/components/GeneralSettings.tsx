"use client"

import type { UserSettings, YearDisplayFormat } from '@/types/financial'

interface GeneralSettingsProps {
  settings: UserSettings
  onStartingAgeChange: (value: string) => void
  onTerminalAgeChange: (value: string) => void
  onYearDisplayFormatChange: (value: YearDisplayFormat) => void
  onAutoExecuteToolsChange: (enabled: boolean) => void
}

export function GeneralSettings({
  settings,
  onStartingAgeChange,
  onTerminalAgeChange,
  onYearDisplayFormatChange,
  onAutoExecuteToolsChange,
}: GeneralSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Starting Age
        </label>
        <p className="mb-3 text-xs text-slate-500">
          Your current age, used to calculate timeline years
        </p>
        <input
          type="number"
          min="0"
          max="120"
          value={settings.startingAge || ''}
          onChange={e => onStartingAgeChange(e.target.value)}
          className="w-32 rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Terminal Age
        </label>
        <p className="mb-3 text-xs text-slate-500">
          Planning horizon end age (e.g., retirement age)
        </p>
        <input
          type="number"
          min={settings.startingAge + 1}
          max="120"
          value={settings.terminalAge || ''}
          onChange={e => onTerminalAgeChange(e.target.value)}
          className="w-32 rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-2 text-xs text-slate-500">
          Planning years: {Math.max(0, settings.terminalAge - settings.startingAge)}
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Year Display Format
        </label>
        <p className="mb-3 text-xs text-slate-500">
          How years are displayed in the timeline
        </p>
        <select
          value={settings.yearDisplayFormat}
          onChange={e => onYearDisplayFormatChange(e.target.value as YearDisplayFormat)}
          className="w-64 rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="year_number">Year Number (Year 0, Year 1...)</option>
          <option value="actual_year">Actual Year ({new Date().getFullYear()}, {new Date().getFullYear() + 1}...)</option>
        </select>
      </div>

      <div className="pt-4 border-t border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Auto-Execute AI Actions
            </label>
            <p className="text-xs text-slate-500 mt-1">
              Execute AI-suggested changes immediately without confirmation
            </p>
          </div>
          <button
            type="button"
            onClick={() => onAutoExecuteToolsChange(!settings.autoExecuteTools)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.autoExecuteTools ? 'bg-blue-600' : 'bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.autoExecuteTools ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {settings.autoExecuteTools && (
          <p className="mt-2 text-xs text-amber-400">
            ⚠️ Actions will be executed immediately. Use with caution.
          </p>
        )}
      </div>
    </div>
  )
}
