"use client"

import type { UserSettings, YearDisplayFormat } from '@/types/financial'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { ToggleSwitch } from '@/components/ui/ToggleSwitch'

interface GeneralSettingsProps {
  settings: UserSettings
  onStartingAgeChange: (value: string) => void
  onTerminalAgeChange: (value: string) => void
  onYearDisplayFormatChange: (value: YearDisplayFormat) => void
  onAutoExecuteToolsChange: (enabled: boolean) => void
  onGroupItemsByCategoryChange: (enabled: boolean) => void
  onChartPictureInPictureChange: (enabled: boolean) => void
}

export function GeneralSettings({
  settings,
  onStartingAgeChange,
  onTerminalAgeChange,
  onYearDisplayFormatChange,
  onAutoExecuteToolsChange,
  onGroupItemsByCategoryChange,
  onChartPictureInPictureChange,
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
        <CustomSelect
          value={settings.yearDisplayFormat}
          onChange={(val) => onYearDisplayFormatChange(val as YearDisplayFormat)}
          className="w-64"
          options={[
            { value: 'year_number', label: 'Year Number (Year 0, Year 1...)' },
            { value: 'actual_year', label: `Actual Year (${new Date().getFullYear()}, ${new Date().getFullYear() + 1}...)` },
          ]}
        />
      </div>

      <div className="pt-4 border-t border-white/[0.06]">
        <ToggleSwitch
          checked={settings.groupItemsByCategory}
          onChange={onGroupItemsByCategoryChange}
          label="Group Items by Category"
          description="Organize financial items into collapsible category sections"
        />
      </div>

      <div className="pt-4 border-t border-white/[0.06]">
        <ToggleSwitch
          checked={settings.chartPictureInPicture}
          onChange={onChartPictureInPictureChange}
          label="Chart Picture-in-Picture"
          description="Show a mini floating chart when scrolling past the main chart"
        />
      </div>

      <div className="pt-4 border-t border-white/[0.06]">
        <ToggleSwitch
          checked={settings.autoExecuteTools}
          onChange={onAutoExecuteToolsChange}
          label="Auto-Execute AI Actions"
          description="Execute AI-suggested changes immediately without confirmation"
        />
        {settings.autoExecuteTools && (
          <p className="mt-2 text-xs text-amber-400">
            ⚠️ Actions will be executed immediately. Use with caution.
          </p>
        )}
      </div>
    </div>
  )
}
