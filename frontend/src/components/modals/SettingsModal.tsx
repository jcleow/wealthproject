import { useEffect, useState } from 'react'
import { Settings, TrendingUp, User } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { Modal } from '@/components/ui/Modal'
import { financialApi } from '@/services/financialApi'
import type { GrowthConfig, UserSettings, YearDisplayFormat } from '@/types/financial'
import { GrowthConfigCategoryLabels } from '@/types/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type SettingsSection = 'general' | 'growth-rates'

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const queryClient = useQueryClient()
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')

  // Growth configs state
  const [editedConfigs, setEditedConfigs] = useState<GrowthConfig[]>([])
  const [hasGrowthChanges, setHasGrowthChanges] = useState(false)

  // User settings state
  const [editedSettings, setEditedSettings] = useState<UserSettings>({ startingAge: 30, terminalAge: 65, yearDisplayFormat: 'year_number', timeResolution: 'yearly', autoExecuteTools: false })
  const [hasSettingsChanges, setHasSettingsChanges] = useState(false)

  // Queries
  const { data: configs, isLoading: isLoadingConfigs } = useQuery({
    queryKey: QUERY_KEYS.financial.growth,
    queryFn: () => financialApi.getGrowthConfigs(),
    enabled: isOpen,
  })

  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: QUERY_KEYS.settings.user,
    queryFn: () => financialApi.getUserSettings(),
    enabled: isOpen,
  })

  // Mutations
  const updateGrowthMutation = useMutation({
    mutationFn: (configs: GrowthConfig[]) => financialApi.updateGrowthConfigs(configs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.growth })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      setHasGrowthChanges(false)
      onClose()
    },
  })

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: UserSettings) => financialApi.updateUserSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings.user })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      setHasSettingsChanges(false)
      onClose()
    },
  })

  // Sync state with fetched data
  useEffect(() => {
    if (configs) {
      setEditedConfigs(configs)
      setHasGrowthChanges(false)
    }
  }, [configs])

  useEffect(() => {
    if (settings) {
      setEditedSettings(settings)
      setHasSettingsChanges(false)
    }
  }, [settings])

  const isPending = activeSection === 'growth-rates' ? updateGrowthMutation.isPending : updateSettingsMutation.isPending

  const handleRateChange = (category: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setEditedConfigs(prev =>
      prev.map(cfg =>
        cfg.category === category ? { ...cfg, annualRatePct: numValue } : cfg
      )
    )
    setHasGrowthChanges(true)
  }

  const handleStartingAgeChange = (value: string) => {
    // Allow empty string for editing, treat as 0 for calculations
    const numValue = value === '' ? 0 : parseInt(value, 10)
    if (!isNaN(numValue)) {
      setEditedSettings(prev => ({ ...prev, startingAge: numValue }))
      setHasSettingsChanges(true)
    }
  }

  const handleTerminalAgeChange = (value: string) => {
    // Allow empty string for editing, treat as 0 for calculations
    const numValue = value === '' ? 0 : parseInt(value, 10)
    if (!isNaN(numValue)) {
      setEditedSettings(prev => ({ ...prev, terminalAge: numValue }))
      setHasSettingsChanges(true)
    }
  }

  const handleYearDisplayFormatChange = (value: YearDisplayFormat) => {
    setEditedSettings(prev => ({ ...prev, yearDisplayFormat: value }))
    setHasSettingsChanges(true)
  }

  const handleAutoExecuteToolsChange = (enabled: boolean) => {
    setEditedSettings(prev => ({ ...prev, autoExecuteTools: enabled }))
    setHasSettingsChanges(true)
  }

  const handleSave = () => {
    if (activeSection === 'growth-rates' && hasGrowthChanges) {
      updateGrowthMutation.mutate(editedConfigs)
    } else if (activeSection === 'general' && hasSettingsChanges) {
      updateSettingsMutation.mutate(editedSettings)
    }
  }

  const handleReset = () => {
    if (activeSection === 'growth-rates' && configs) {
      setEditedConfigs(configs)
      setHasGrowthChanges(false)
    } else if (activeSection === 'general' && settings) {
      setEditedSettings(settings)
      setHasSettingsChanges(false)
    }
  }

  const hasChanges = activeSection === 'growth-rates' ? hasGrowthChanges : hasSettingsChanges
  const isLoading = activeSection === 'growth-rates' ? isLoadingConfigs : isLoadingSettings

  const sections: { id: SettingsSection; label: string; icon: typeof Settings }[] = [
    { id: 'general', label: 'General', icon: User },
    { id: 'growth-rates', label: 'Default Rates', icon: TrendingUp },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={isPending ? undefined : onClose}
      overlayClassName="bg-black/60"
      className="mx-4 flex h-[500px] w-full max-w-3xl overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a] shadow-2xl"
    >
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0 border-r border-white/[0.06] bg-[#0f0f0f]">
          <div className="flex items-center gap-2 border-b border-white/[0.06] p-4">
            <Settings className="h-5 w-5 text-slate-400" />
            <span className="font-semibold text-slate-200">Settings</span>
          </div>
          <nav className="p-2">
            {sections.map(section => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-200">
                {activeSection === 'general' ? 'General Settings' : 'Default Growth Rates'}
              </h2>
              <p className="text-sm text-slate-500">
                {activeSection === 'general'
                  ? 'Configure your personal settings'
                  : 'Set default rates for new items'}
              </p>
            </div>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
              onClick={onClose}
              title="Close"
              type="button"
            >
              ✕
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="text-center text-slate-400">Loading...</div>
            ) : activeSection === 'general' ? (
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
                    value={editedSettings.startingAge || ''}
                    onChange={e => handleStartingAgeChange(e.target.value)}
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
                    min={editedSettings.startingAge + 1}
                    max="120"
                    value={editedSettings.terminalAge || ''}
                    onChange={e => handleTerminalAgeChange(e.target.value)}
                    className="w-32 rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Planning years: {Math.max(0, editedSettings.terminalAge - editedSettings.startingAge)}
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
                    value={editedSettings.yearDisplayFormat}
                    onChange={e => handleYearDisplayFormatChange(e.target.value as YearDisplayFormat)}
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
                      onClick={() => handleAutoExecuteToolsChange(!editedSettings.autoExecuteTools)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editedSettings.autoExecuteTools ? 'bg-blue-600' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          editedSettings.autoExecuteTools ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {editedSettings.autoExecuteTools && (
                    <p className="mt-2 text-xs text-amber-400">
                      ⚠️ Actions will be executed immediately. Use with caution.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  These rates are used as defaults when creating new financial items.
                </p>
                <div className="space-y-2">
                  {editedConfigs.map(cfg => (
                    <div
                      key={cfg.category}
                      className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#111111] px-4 py-3"
                    >
                      <span className="text-sm text-slate-200">
                        {GrowthConfigCategoryLabels[cfg.category] ?? cfg.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          value={cfg.annualRatePct}
                          onChange={e => handleRateChange(cfg.category, e.target.value)}
                          className="w-20 rounded-md border border-white/[0.08] bg-[#1a1a1a] px-2 py-1 text-right text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-sm text-slate-400">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between border-t border-white/[0.06] px-6 py-4">
            <button
              className="px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-50"
              onClick={handleReset}
              disabled={!hasChanges || isPending}
              type="button"
            >
              Reset
            </button>
            <div className="flex gap-3">
              <button
                className="px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-200"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-400"
                onClick={handleSave}
                disabled={!hasChanges || isPending}
                type="button"
              >
                {isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
    </Modal>
  )
}

// Keep backward compatible export
export { SettingsModal as GrowthConfigModal }
