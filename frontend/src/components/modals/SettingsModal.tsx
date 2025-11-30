import { useEffect, useState } from 'react'
import { Settings, TrendingUp, User } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { financialApi } from '@/services/financialApi'
import type { GrowthConfig, UserSettings, YearDisplayFormat } from '@/types/financial'
import { GrowthConfigCategoryLabels } from '@/types/financial'

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
  const [editedSettings, setEditedSettings] = useState<UserSettings>({ startingAge: 30, terminalAge: 65, yearDisplayFormat: 'year_number' })
  const [hasSettingsChanges, setHasSettingsChanges] = useState(false)

  // Queries
  const { data: configs, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['growth-configs'],
    queryFn: () => financialApi.getGrowthConfigs(),
    enabled: isOpen,
  })

  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['user-settings'],
    queryFn: () => financialApi.getUserSettings(),
    enabled: isOpen,
  })

  // Mutations
  const updateGrowthMutation = useMutation({
    mutationFn: (configs: GrowthConfig[]) => financialApi.updateGrowthConfigs(configs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['growth-configs'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      setHasGrowthChanges(false)
    },
  })

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: UserSettings) => financialApi.updateUserSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      setHasSettingsChanges(false)
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

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !updateGrowthMutation.isPending && !updateSettingsMutation.isPending) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, updateGrowthMutation.isPending, updateSettingsMutation.isPending, onClose])

  if (!isOpen) return null

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
  const isPending = activeSection === 'growth-rates' ? updateGrowthMutation.isPending : updateSettingsMutation.isPending
  const isLoading = activeSection === 'growth-rates' ? isLoadingConfigs : isLoadingSettings

  const sections: { id: SettingsSection; label: string; icon: typeof Settings }[] = [
    { id: 'general', label: 'General', icon: User },
    { id: 'growth-rates', label: 'Default Rates', icon: TrendingUp },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 flex h-[500px] w-full max-w-3xl overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0 border-r border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-2 border-b border-gray-700 p-4">
            <Settings className="h-5 w-5 text-gray-400" />
            <span className="font-semibold text-white">Settings</span>
          </div>
          <nav className="p-2">
            {sections.map(section => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
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
          <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {activeSection === 'general' ? 'General Settings' : 'Default Growth Rates'}
              </h2>
              <p className="text-sm text-gray-400">
                {activeSection === 'general'
                  ? 'Configure your personal settings'
                  : 'Set default rates for new items'}
              </p>
            </div>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
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
              <div className="text-center text-gray-400">Loading...</div>
            ) : activeSection === 'general' ? (
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Starting Age
                  </label>
                  <p className="mb-3 text-xs text-gray-500">
                    Your current age, used to calculate timeline years
                  </p>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={editedSettings.startingAge || ''}
                    onChange={e => handleStartingAgeChange(e.target.value)}
                    className="w-32 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Terminal Age
                  </label>
                  <p className="mb-3 text-xs text-gray-500">
                    Planning horizon end age (e.g., retirement age)
                  </p>
                  <input
                    type="number"
                    min={editedSettings.startingAge + 1}
                    max="120"
                    value={editedSettings.terminalAge || ''}
                    onChange={e => handleTerminalAgeChange(e.target.value)}
                    className="w-32 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Planning years: {Math.max(0, editedSettings.terminalAge - editedSettings.startingAge)}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Year Display Format
                  </label>
                  <p className="mb-3 text-xs text-gray-500">
                    How years are displayed in the timeline
                  </p>
                  <select
                    value={editedSettings.yearDisplayFormat}
                    onChange={e => handleYearDisplayFormatChange(e.target.value as YearDisplayFormat)}
                    className="w-64 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="year_number">Year Number (Year 0, Year 1...)</option>
                    <option value="actual_year">Actual Year ({new Date().getFullYear()}, {new Date().getFullYear() + 1}...)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  These rates are used as defaults when creating new financial items.
                </p>
                <div className="space-y-2">
                  {editedConfigs.map(cfg => (
                    <div
                      key={cfg.category}
                      className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-4 py-3"
                    >
                      <span className="text-sm text-white">
                        {GrowthConfigCategoryLabels[cfg.category] ?? cfg.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          value={cfg.annualRatePct}
                          onChange={e => handleRateChange(cfg.category, e.target.value)}
                          className="w-20 rounded-md border border-gray-600 bg-gray-700 px-2 py-1 text-right text-sm text-white focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-sm text-gray-400">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between border-t border-gray-700 px-6 py-4">
            <button
              className="px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white disabled:opacity-50"
              onClick={handleReset}
              disabled={!hasChanges || isPending}
              type="button"
            >
              Reset
            </button>
            <div className="flex gap-3">
              <button
                className="px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:bg-gray-600"
                onClick={handleSave}
                disabled={!hasChanges || isPending}
                type="button"
              >
                {isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Keep backward compatible export
export { SettingsModal as GrowthConfigModal }
