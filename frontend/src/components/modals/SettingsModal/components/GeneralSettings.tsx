"use client"

import type { UserSettings, YearDisplayFormat } from '@/types/financial'

interface GeneralSettingsProps {
  settings: UserSettings
  onStartingAgeChange: (value: string) => void
  onTerminalAgeChange: (value: string) => void
  onYearDisplayFormatChange: (value: YearDisplayFormat) => void
  onAutoExecuteToolsChange: (enabled: boolean) => void
  onGroupItemsByCategoryChange: (enabled: boolean) => void
}

export function GeneralSettings({
  settings,
  onStartingAgeChange,
  onTerminalAgeChange,
  onYearDisplayFormatChange,
  onAutoExecuteToolsChange,
  onGroupItemsByCategoryChange,
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
          className={`w-32
px-3 py-2 placeholder-slate-500
rounded-lg border border-white/[0.08] focus:border-blue-500 focus:outline-none
bg-[#1a1a1a]
text-slate-200`}
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
          className={`w-32
px-3 py-2 placeholder-slate-500
rounded-lg border border-white/[0.08] focus:border-blue-500 focus:outline-none
bg-[#1a1a1a]
text-slate-200`}
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
          className={`w-64
px-3 py-2
rounded-lg border border-white/[0.08] focus:border-blue-500 focus:outline-none
bg-[#1a1a1a]
text-slate-200`}
        >
          <option value="year_number">Year Number (Year 0, Year 1...)</option>
          <option value="actual_year">Actual Year ({new Date().getFullYear()}, {new Date().getFullYear() + 1}...)</option>
        </select>
      </div>

      <div className="pt-4 border-t border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Group Items by Category
            </label>
            <p className="text-xs text-slate-500 mt-1">
              Organize financial items into collapsible category sections
            </p>
          </div>
          <button
            type="button"
            onClick={() => onGroupItemsByCategoryChange(!settings.groupItemsByCategory)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.groupItemsByCategory ? 'bg-blue-600' : 'bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.groupItemsByCategory ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
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
