import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Car, ChevronDown, LayoutGrid, Loader2, Receipt, Search, Sparkles, Trash2, Bell, Wallet, Shield, Sun, Moon } from 'lucide-react'

import { useFinancialData } from '@/hooks/useFinancialData'
import { useScenarioEvents } from '@/hooks/useScenarioEvents'
import { useTimeline } from '@/hooks/useTimeline'
import { useLoadSampleDataMutation } from '@/hooks/queries/useLoadSampleDataMutation'
import { propertyApi } from '@/api/financial'
import { ScenarioEventModal } from '../modals/ScenarioEventModal/ScenarioEventModal'
import { ProfileSelectionModal } from '../modals/ProfileSelectionModal'
import { NetWorthProjection } from './NetWorthProjection'
import { UserMenu } from '../auth/UserMenu'
import { useTimelineStore, useFeatureModulesStore, useColorScheme, useColorSchemeActions } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import type { ScenarioEvent } from '@/types/scenario'
import clsx from 'clsx'

interface FinancialWorkspaceProps {
  // onPropertyScenarioEdit is kept as prop because it's specific to chart interactions
  onPropertyScenarioEdit?: (scenarioId: string) => void
  // Display mode
  headerOnly?: boolean
  chartOnly?: boolean
}

// Stable empty Set to use as default (avoids creating new Set on each render)
const EMPTY_OVERRIDE_YEARS = new Set<number>()

export function FinancialWorkspace({
  onPropertyScenarioEdit,
  headerOnly = false,
  chartOnly = false,
}: FinancialWorkspaceProps) {
  // Get timeline selection state from Zustand store (batched with shallow comparison)
  const { setSelectedYear, setSelectedMonth } = useTimelineStore(
    useShallow((s) => ({
      setSelectedYear: s.setSelectedYear,
      setSelectedMonth: s.setSelectedMonth,
    }))
  )

  // Get feature module actions from Zustand store (batched with shallow comparison)
  const {
    openCPFView,
    openPropertyPlanner,
    openTaxPlanner,
    openInsurancePlanner,
    openLayoutModal,
  } = useFeatureModulesStore(
    useShallow((s) => ({
      openCPFView: s.openCPFView,
      openPropertyPlanner: s.openPropertyPlanner,
      openTaxPlanner: s.openTaxPlanner,
      openInsurancePlanner: s.openInsurancePlanner,
      openLayoutModal: s.openLayoutModal,
    }))
  )

  // Get timeline data from hook (React Query)
  const timeline = useTimeline({ resolution: 'monthly' })
  const timelineYears = timeline.chartYears
  const timelineMonths = timeline.chartMonths
  const overrideYears = timeline.overrideYears
  const timelineError = timeline.timelineQuery.error instanceof Error
    ? timeline.timelineQuery.error.message
    : null

  // Use stable empty set as fallback
  const stableOverrideYears = useMemo(
    () => overrideYears ?? EMPTY_OVERRIDE_YEARS,
    [overrideYears]
  )

  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false)
  const [scenarioEventToEdit, setScenarioEventToEdit] = useState<ScenarioEvent | null>(null)
  const [isClearing, setIsClearing] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [loadingProfileId, setLoadingProfileId] = useState<string | null>(null)
  const [isModuleMenuOpen, setIsModuleMenuOpen] = useState(false)
  const { events: scenarioEvents } = useScenarioEvents()
  const { deleteAllFinancialData, refresh } = useFinancialData()
  const loadProfileMutation = useLoadSampleDataMutation()
  const moduleMenuRef = useRef<HTMLDivElement | null>(null)

  // Theme toggle
  const colorScheme = useColorScheme()
  const { toggleColorScheme } = useColorSchemeActions()
  const isMonet = colorScheme === 'monet'

  const clearPropertyData = async () => {
    if (typeof window === 'undefined') return
    const scenarioId = localStorage.getItem('property_planner_scenario_id')
    localStorage.removeItem('property_planner_draft')
    localStorage.removeItem('property_planner_scenario_id')

    if (scenarioId) {
      try {
        await propertyApi.deletePropertyScenario(scenarioId)
      } catch (error) {
        console.warn('Unable to delete property scenario', error)
      }
    }
  }

  const handleClearAllData = async () => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Delete all financial data and property scenarios for this user?')
      if (!confirmed) return
    }
    setIsClearing(true)
    try {
      await deleteAllFinancialData()
      await clearPropertyData()
      await refresh()
    } catch (error) {
      console.error('Failed to clear data', error)
      if (typeof window !== 'undefined') {
        window.alert('Unable to clear all data right now. Please try again.')
      }
    } finally {
      setIsClearing(false)
    }
  }

  const handleSelectProfile = async (profileId: string) => {
    setLoadingProfileId(profileId)
    try {
      await loadProfileMutation.mutateAsync(profileId)
      await refresh()
      setIsProfileModalOpen(false)
    } catch (error) {
      console.error('Failed to load profile:', profileId, error)
      if (typeof window !== 'undefined') {
        window.alert('Unable to load profile right now. Please try again.')
      }
      throw error // Re-throw so modal can handle it
    } finally {
      setLoadingProfileId(null)
    }
  }

  useEffect(() => {
    if (!isModuleMenuOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (moduleMenuRef.current && !moduleMenuRef.current.contains(event.target as Node)) {
        setIsModuleMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isModuleMenuOpen])

  // Listen for open-scenario-event from financial data cards
  useEffect(() => {
    const handleOpenScenarioEvent = (e: CustomEvent<ScenarioEvent>) => {
      if (e.detail?.id) {
        setScenarioEventToEdit(e.detail)
        setIsScenarioModalOpen(true)
      }
    }
    window.addEventListener('open-scenario-event', handleOpenScenarioEvent as EventListener)
    return () => window.removeEventListener('open-scenario-event', handleOpenScenarioEvent as EventListener)
  }, [])

  // Listen for open-property-scenario from financial data cards
  useEffect(() => {
    const handleOpenPropertyScenario = (e: CustomEvent<{ scenarioId: string }>) => {
      if (e.detail?.scenarioId && onPropertyScenarioEdit) {
        onPropertyScenarioEdit(e.detail.scenarioId)
      }
    }
    window.addEventListener('open-property-scenario', handleOpenPropertyScenario as EventListener)
    return () => window.removeEventListener('open-property-scenario', handleOpenPropertyScenario as EventListener)
  }, [onPropertyScenarioEdit])

  const handleCreateScenario = useCallback(() => {
    setScenarioEventToEdit(null)
    setIsScenarioModalOpen(true)
  }, [])

  const handleScenarioSelect = useCallback((event: ScenarioEvent) => {
    if (!event?.id) return
    setScenarioEventToEdit(event)
    setIsScenarioModalOpen(true)
  }, [])

  return (
    <div className={`flex flex-col
h-full min-h-0 w-full min-w-0
bg-transparent
text-slate-200`}>
      {/* Compact Header - hidden when chartOnly */}
      {!chartOnly && (
      <header className={`relative z-[100]
flex items-center justify-between
h-14
px-6
shrink-0`}>
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            {/* <h2 className="text-lg font-medium tracking-tight text-slate-100">Workspace</h2> */}
          </div>
        </div>

        {/* Glass pill control group */}
        <div className={clsx(
          "flex items-center gap-3",
          "px-3 py-1.5",
          "rounded-full",
          "backdrop-blur-sm",
          "transition-colors duration-200",
          isMonet
            ? "border border-[rgba(155,139,180,0.2)] bg-white/80"
            : "border border-white/[0.06] bg-white/[0.02]",
        )}>
          {/* Search */}
          <div className={clsx(
            "flex items-center gap-2 pr-3 border-r",
            isMonet ? "border-[rgba(155,139,180,0.15)]" : "border-white/[0.06]"
          )}>
            <Search className={clsx("h-3.5 w-3.5", isMonet ? "text-slate-500" : "text-slate-500")} />
            <input
              type="text"
              placeholder="Search..."
              className={clsx(
                "w-48 focus:outline-none bg-transparent text-[13px]",
                isMonet
                  ? "text-slate-700 placeholder-slate-400"
                  : "text-slate-300 placeholder-slate-600"
              )}
            />
          </div>

          <div className="hidden items-center gap-1 md:flex">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className={clsx(
                "flex items-center justify-center",
                "h-7 w-7",
                "rounded-full",
                "disabled:opacity-60",
                "transition",
                isMonet
                  ? "hover:bg-[rgba(155,139,180,0.1)] text-slate-500 hover:text-slate-700"
                  : "hover:bg-white/5 hover:text-slate-300 text-slate-500",
              )}
              title="Load a profile template"
              type="button"
              disabled={loadProfileMutation.isPending}
            >
              {loadProfileMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={handleClearAllData}
              className={clsx(
                "flex items-center justify-center",
                "h-7 w-7",
                "rounded-full",
                "disabled:opacity-60",
                "transition",
                isMonet
                  ? "hover:bg-[rgba(232,168,152,0.15)] text-[#c97d6d] hover:text-[#b86a5a]"
                  : "hover:bg-rose-500/10 hover:text-rose-300 text-rose-400/70",
              )}
              title="Delete all data"
              type="button"
              disabled={isClearing}
            >
              {isClearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className={clsx("h-4 w-px", isMonet ? "bg-[rgba(155,139,180,0.15)]" : "bg-white/[0.06]")} />

          <div className="relative z-[100]" ref={moduleMenuRef}>
            <button
              onClick={() => setIsModuleMenuOpen((prev) => !prev)}
              className={clsx(
                "flex items-center gap-1.5",
                "px-2 py-1",
                "rounded-lg",
                "font-medium text-[11px]",
                "transition",
                isMonet
                  ? "hover:bg-[rgba(155,139,180,0.1)] text-slate-500 hover:text-slate-700"
                  : "hover:bg-white/5 hover:text-slate-200 text-slate-400",
                "transition",
              )}
              type="button"
            >
              <Sparkles className="h-3 w-3 text-blue-400/70" />
              <span className="text-[13px] hidden md:inline">Modules</span>
              <ChevronDown className={`h-2.5 w-2.5 transition ${isModuleMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isModuleMenuOpen && (
              <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-[299]"
                onClick={() => setIsModuleMenuOpen(false)}
              />
              <div className={clsx(
                "absolute right-0 z-[300]",
                "w-64",
                "mt-2",
                "border border-white/[0.08] rounded-xl",
                "bg-[#0a0a0a]",
                "shadow-2xl",
                "overflow-hidden",
              )} style={{ isolation: 'isolate' }}>
                {/* Property Planner */}
                <button
                  onClick={() => {
                    setIsModuleMenuOpen(false)
                    openPropertyPlanner()
                  }}
                  className={clsx(
                    "flex items-start gap-3",
                    "w-full",
                    "px-4 py-3",
                    "border-b border-white/[0.04]",
                    "hover:bg-white/5",
                    "text-left text-slate-200 text-sm",
                    "transition",
                  )}
                  type="button"
                >
                  <span className={`mt-0.5 p-2
rounded-lg border border-violet-500/20
bg-violet-500/10
text-violet-400`}>
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="space-y-0.5">
                    <div className="font-medium">Property Planner</div>
                    <p className="text-xs text-slate-400">Create and compare property purchase scenarios.</p>
                  </div>
                </button>
                {/* CPF Simulation */}
                <button
                  onClick={() => {
                    setIsModuleMenuOpen(false)
                    openCPFView()
                  }}
                  className={clsx(
                    "flex items-start gap-3",
                    "w-full",
                    "px-4 py-3",
                    "border-b border-white/[0.04]",
                    "hover:bg-white/5",
                    "text-left text-slate-200 text-sm",
                    "transition",
                  )}
                  type="button"
                >
                  <span className={`mt-0.5 p-2
rounded-lg border border-emerald-500/20
bg-emerald-500/10
text-emerald-400`}>
                    <Wallet className="h-4 w-4" />
                  </span>
                  <div className="space-y-0.5">
                    <div className="font-medium">CPF</div>
                    <p className="text-xs text-slate-400">Simulate balances, investments, and retirement.</p>
                  </div>
                </button>
                {/* Coming Soon Modules */}
                <div className="cursor-not-allowed opacity-60">
                  <div className={`flex items-start
w-full
gap-3 px-4 py-3
text-left text-sm`}>
                    <span className={`mt-0.5 p-2
rounded-lg border border-white/[0.06]
bg-white/[0.02]
text-slate-500`}>
                      <Car className="h-4 w-4" />
                    </span>
                    <div className="space-y-0.5">
                      <div className="font-medium text-slate-400">Vehicle Purchase</div>
                      <p className="text-xs text-slate-500">Coming soon</p>
                    </div>
                  </div>
                </div>
                {/* Tax Module */}
                <button
                  onClick={() => {
                    setIsModuleMenuOpen(false)
                    openTaxPlanner()
                  }}
                  className={clsx(
                    "flex items-start gap-3",
                    "w-full",
                    "px-4 py-3",
                    "border-b border-white/[0.04]",
                    "hover:bg-white/5",
                    "text-left text-slate-200 text-sm",
                    "transition",
                  )}
                  type="button"
                >
                  <span className={`mt-0.5 p-2
rounded-lg border border-amber-500/20
bg-amber-500/10
text-amber-400`}>
                    <Receipt className="h-4 w-4" />
                  </span>
                  <div className="space-y-0.5">
                    <div className="font-medium">Tax Planner</div>
                    <p className="text-xs text-slate-400">Singapore tax calculations and scenario planning.</p>
                  </div>
                </button>
                {/* Insurance Planner */}
                <button
                  onClick={() => {
                    setIsModuleMenuOpen(false)
                    openInsurancePlanner()
                  }}
                  className={clsx(
                    "flex items-start gap-3",
                    "w-full",
                    "px-4 py-3",
                    "hover:bg-white/5",
                    "text-left text-slate-200 text-sm",
                    "transition",
                  )}
                  type="button"
                >
                  <span className={`mt-0.5 p-2
rounded-lg border border-purple-500/20
bg-purple-500/10
text-purple-400`}>
                    <Shield className="h-4 w-4" />
                  </span>
                  <div className="space-y-0.5">
                    <div className="font-medium">Insurance Planner</div>
                    <p className="text-xs text-slate-400">Analyze coverage gaps and plan your protection.</p>
                  </div>
                </button>
              </div>
              </>
            )}
          </div>

          <div className={clsx("h-4 w-px", isMonet ? "bg-[rgba(155,139,180,0.15)]" : "bg-white/[0.06]")} />

          {/* Layout toggle */}
          <button
            type="button"
            onClick={openLayoutModal}
            className={clsx(
              "flex items-center justify-center",
              "h-7 w-7",
              "rounded-full",
              isMonet
                ? "hover:bg-slate-200 text-slate-500"
                : "hover:bg-white/5 hover:text-slate-300 text-slate-500",
              "transition",
            )}
            title="Change layout"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleColorScheme}
            className={clsx(
              "flex items-center justify-center",
              "h-7 w-7",
              "rounded-full",
              "transition-all duration-200",
              isMonet
                ? "bg-amber-100 hover:bg-amber-200 text-amber-600"
                : "hover:bg-white/5 text-slate-500 hover:text-slate-300",
            )}
            title={isMonet ? 'Switch to dark mode' : 'Switch to light mode (Monet)'}
            aria-label={isMonet ? 'Switch to dark mode' : 'Switch to light mode'}
            data-testid="theme-toggle"
          >
            {isMonet ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Notification bell */}
          <button
            type="button"
            className={clsx(
              "flex items-center justify-center",
              "h-7 w-7",
              "rounded-full",
              "transition",
              isMonet
                ? "hover:bg-[rgba(155,139,180,0.1)] text-slate-500 hover:text-slate-700"
                : "hover:bg-white/5 hover:text-slate-300 text-slate-500",
            )}
          >
            <Bell className="h-3.5 w-3.5" />
          </button>

          <UserMenu />
        </div>
      </header>
      )}

      {/* Only show chart and timeline error when not in headerOnly mode */}
      {(chartOnly || !headerOnly) && (
        <>
          {timelineError && (
            <div className={clsx(
              "mt-4 mx-6 px-4 py-2",
              "border border-rose-500/20 rounded-lg",
              "bg-rose-500/5",
              "text-rose-300 text-xs",
            )}>
              Timeline unavailable: {timelineError}
            </div>
          )}

          {/* Chart Section */}
          <div className="flex-1 p-6">
            <section className={clsx(
              "relative",
              "h-full",
              "border border-white/[0.1] hover:border-white/[0.15] rounded-2xl",
              "bg-[#0a0a0a]/60",
              "transition-all",
              "overflow-hidden",
            )}>
              {/* Chart Container - NetWorthProjection has its own header */}
              <div className="h-full">
                <NetWorthProjection
                  chartTitle="Net Worth Projection"
                  timelineYears={timelineYears}
                  timelineMonths={timelineMonths}
                  overrideYears={stableOverrideYears}
                  scenarioEvents={scenarioEvents}
                  onAddScenario={handleCreateScenario}
                  onScenarioSelect={handleScenarioSelect}
                  onPropertyScenarioEdit={onPropertyScenarioEdit}
                />
              </div>
            </section>
          </div>
        </>
      )}

      {isScenarioModalOpen && (
        <ScenarioEventModal
          isOpen={isScenarioModalOpen}
          event={scenarioEventToEdit ?? undefined}
          onClose={() => {
            setIsScenarioModalOpen(false)
            setScenarioEventToEdit(null)
          }}
          onSaved={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('financial-data-refresh'))
            }
            setScenarioEventToEdit(null)
            setIsScenarioModalOpen(false)
          }}
          onJumpToDate={(year, month) => {
            setSelectedYear(year)
            setSelectedMonth(month)
            setIsScenarioModalOpen(false)
            setScenarioEventToEdit(null)
          }}
        />
      )}

      <ProfileSelectionModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSelectProfile={handleSelectProfile}
        isLoading={loadProfileMutation.isPending}
        loadingProfileId={loadingProfileId}
      />
    </div>
  )
}
