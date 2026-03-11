import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Car, ChevronDown, LayoutGrid, Loader2, Receipt, Blocks, Trash2, Bell, Wallet, Shield, LibraryBig } from 'lucide-react'
import { ColorSchemeToggle } from '@/components/ui/ColorSchemeToggle'

import { useFinancialData } from '@/hooks/useFinancialData'
import { useScenarioEvents } from '@/hooks/useScenarioEvents'
import { useTimeline } from '@/hooks/useTimeline'
import { useLoadSampleDataMutation } from '@/hooks/queries/useLoadSampleDataMutation'
import { propertyApi } from '@/api/financial'
import { ScenarioEventModal } from '../modals/ScenarioEventModal/ScenarioEventModal'
import { ProfileSelectionModal } from '../modals/ProfileSelectionModal'
import { NetWorthProjection } from './NetWorthProjection'
import { UserMenu } from '../auth/UserMenu'
import { useTimelineStore, useFeatureModulesStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import type { ScenarioEvent } from '@/types/scenario'
import clsx from 'clsx'
import { useThemeClasses } from '@/lib/theme'

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
    openInsurancePlanner,
    openVehiclePlanner,
    openLayoutModal,
  } = useFeatureModulesStore(
    useShallow((s) => ({
      openCPFView: s.openCPFView,
      openPropertyPlanner: s.openPropertyPlanner,
      openInsurancePlanner: s.openInsurancePlanner,
      openVehiclePlanner: s.openVehiclePlanner,
      openLayoutModal: s.openLayoutModal,
    }))
  )

  // Get theme classes for consistent styling
  const { classes, isMonet } = useThemeClasses()

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
    <div
      className={clsx(
        'flex flex-col h-full min-h-0 w-full min-w-0 bg-transparent transition-colors duration-300',
        classes.text.primary
      )}
    >
      {/* Compact Header - hidden when chartOnly */}
      {!chartOnly && (
      <header className="relative z-[100] flex items-center justify-between h-14 px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            {/* <h2 className="text-lg font-medium tracking-tight text-slate-100">Workspace</h2> */}
          </div>
        </div>

        {/* Glass pill control group */}
        <div className={clsx(
          "flex items-center gap-3 px-3 py-1.5 rounded-full transition-colors duration-300",
          classes.toolbar.container,
        )}>
          <div className="hidden items-center gap-1 md:flex">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className={clsx(classes.toolbarButton.base, classes.toolbarButton.default)}
              title="Load a profile template"
              type="button"
              disabled={loadProfileMutation.isPending}
            >
              {loadProfileMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LibraryBig className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={handleClearAllData}
              className={clsx(classes.toolbarButton.base, classes.toolbarButton.danger)}
              title="Delete all data"
              type="button"
              disabled={isClearing}
            >
              {isClearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className={classes.toolbar.verticalDivider} />

          <div className="relative z-[100]" ref={moduleMenuRef}>
            <button
              onClick={() => setIsModuleMenuOpen((prev) => !prev)}
              className={clsx(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg font-medium text-[11px] transition",
                classes.toolbarButton.active,
              )}
              type="button"
            >
              <Blocks className={clsx("h-3 w-3", classes.icon.primary)} />
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
              <div
                className={clsx("absolute right-0 z-[300] w-64 mt-2 overflow-hidden", classes.dropdown.container)}
                style={{ isolation: 'isolate' }}
              >
                {/* Property Planner */}
                <button
                  onClick={() => {
                    setIsModuleMenuOpen(false)
                    openPropertyPlanner()
                  }}
                  className={clsx(classes.menuItem.base, classes.menuItem.withBorder, classes.menuItem.hover)}
                  type="button"
                >
                  <span className={clsx(classes.iconBadge.base, classes.iconBadge.violet)}>
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="space-y-0.5">
                    <div className="font-medium">Property</div>
                    <p className={classes.menuText.secondary}>Create and compare property purchase scenarios.</p>
                  </div>
                </button>
                {/* CPF Simulation */}
                <button
                  onClick={() => {
                    setIsModuleMenuOpen(false)
                    openCPFView()
                  }}
                  className={clsx(classes.menuItem.base, classes.menuItem.withBorder, classes.menuItem.hoverSage)}
                  type="button"
                >
                  <span className={clsx(classes.iconBadge.base, classes.iconBadge.emerald)}>
                    <Wallet className="h-4 w-4" />
                  </span>
                  <div className="space-y-0.5">
                    <div className="font-medium">CPF</div>
                    <p className={classes.menuText.secondary}>Simulate balances, investments, and retirement.</p>
                  </div>
                </button>
                {/* Insurance Planner */}
                <button
                  onClick={() => {
                    setIsModuleMenuOpen(false)
                    openInsurancePlanner()
                  }}
                  className={clsx(classes.menuItem.base, classes.menuItem.withBorder, classes.menuItem.hover)}
                  type="button"
                >
                  <span className={clsx(classes.iconBadge.base, classes.iconBadge.rose)}>
                    <Shield className="h-4 w-4" />
                  </span>
                  <div className="space-y-0.5">
                    <div className="font-medium">Insurance</div>
                    <p className={classes.menuText.secondary}>Analyze coverage gaps and plan your protection.</p>
                  </div>
                </button>
                {/* Vehicle */}
                <button
                  onClick={() => {
                    setIsModuleMenuOpen(false)
                    openVehiclePlanner()
                  }}
                  className={clsx(classes.menuItem.base, classes.menuItem.withBorder, classes.menuItem.hover)}
                  type="button"
                >
                  <span className={clsx(classes.iconBadge.base, classes.iconBadge.amber)}>
                    <Car className="h-4 w-4" />
                  </span>
                  <div className="space-y-0.5">
                    <div className="font-medium">Vehicle <span className={clsx('text-[10px] font-normal', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>(Preview)</span></div>
                    <p className={classes.menuText.secondary}>Calculate total cost of vehicle ownership in SG.</p>
                  </div>
                </button>
                <div className={classes.menuItem.disabled}>
                  <div className="flex items-start w-full gap-3 px-4 py-3 text-left text-sm">
                    <span className={clsx(classes.iconBadge.base, classes.iconBadge.disabled)}>
                      <Receipt className="h-4 w-4" />
                    </span>
                    <div className="space-y-0.5">
                      <div className={clsx("font-medium", classes.menuText.disabled)}>Tax Projections</div>
                      <p className={classes.menuText.disabledSecondary}>Coming soon</p>
                    </div>
                  </div>
                </div>
              </div>
              </>
            )}
          </div>

          <div className={classes.toolbar.verticalDivider} />

          {/* Layout toggle */}
          <button
            type="button"
            onClick={openLayoutModal}
            className={clsx(classes.toolbarButton.base, classes.toolbarButton.default)}
            title="Change layout"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>

          {/* Color scheme toggle */}
          <ColorSchemeToggle />

          {/* Notification bell */}
          <button
            type="button"
            className={clsx(classes.toolbarButton.base, classes.toolbarButton.default)}
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
              "relative h-full rounded-2xl transition-all overflow-hidden",
              classes.card.base,
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
