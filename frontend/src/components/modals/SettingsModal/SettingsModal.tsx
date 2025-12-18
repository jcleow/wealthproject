"use client"

import { Settings, TrendingUp, User } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

import { useSettingsForm, type SettingsSection } from './hooks'
import { GeneralSettings, GrowthRatesSettings } from './components'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const sections: { id: SettingsSection; label: string; icon: typeof Settings }[] = [
  { id: 'general', label: 'General', icon: User },
  { id: 'growth-rates', label: 'Default Rates', icon: TrendingUp },
]

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const form = useSettingsForm({ isOpen, onClose })

  return (
    <Modal
      isOpen={isOpen}
      onClose={form.isPending ? undefined : onClose}
      overlayClassName="bg-black/60"
      className={`flex overflow-hidden
h-[500px] w-full max-w-3xl
mx-4
rounded-xl border border-white/[0.08]
bg-[#0a0a0a]
shadow-2xl`}
    >
      {/* Sidebar */}
      <div className={`flex-shrink-0
w-48
border-r border-white/[0.06]
bg-[#0f0f0f]`}>
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
                onClick={() => form.setActiveSection(section.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  form.activeSection === section.id
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
        <div className={`flex items-center justify-between
px-6 py-4
border-b border-white/[0.06]`}>
          <div>
            <h2 className="text-lg font-semibold text-slate-200">
              {form.activeSection === 'general' ? 'General Settings' : 'Default Growth Rates'}
            </h2>
            <p className="text-sm text-slate-500">
              {form.activeSection === 'general'
                ? 'Configure your personal settings'
                : 'Set default rates for new items'}
            </p>
          </div>
          <button
            className={`flex items-center justify-center
h-8 w-8
rounded-full
hover:bg-white/5
text-slate-400 hover:text-slate-200
transition-colors`}
            onClick={onClose}
            title="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {form.isLoading ? (
            <div className="text-center text-slate-400">Loading...</div>
          ) : form.activeSection === 'general' ? (
            <GeneralSettings
              settings={form.editedSettings}
              onStartingAgeChange={form.handleStartingAgeChange}
              onTerminalAgeChange={form.handleTerminalAgeChange}
              onYearDisplayFormatChange={form.handleYearDisplayFormatChange}
              onAutoExecuteToolsChange={form.handleAutoExecuteToolsChange}
            />
          ) : (
            <GrowthRatesSettings
              configs={form.editedConfigs}
              onRateChange={form.handleRateChange}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t border-white/[0.06] px-6 py-4">
          <button
            className={`px-4 py-2
text-sm text-slate-400 hover:text-slate-200
disabled:opacity-50
transition-colors`}
            onClick={form.handleReset}
            disabled={!form.hasChanges || form.isPending}
            type="button"
          >
            Reset
          </button>
          <div className="flex gap-3">
            <button
              className={`px-4 py-2
text-sm text-slate-400 hover:text-slate-200
transition-colors`}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className={`px-4 py-2
rounded-lg
bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700
text-sm text-white disabled:text-slate-400
transition-colors`}
              onClick={form.handleSave}
              disabled={!form.hasChanges || form.isPending}
              type="button"
            >
              {form.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// Keep backward compatible export
export { SettingsModal as GrowthConfigModal }
