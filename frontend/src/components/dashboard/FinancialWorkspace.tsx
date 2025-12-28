import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Car, ChevronDown, LayoutGrid, Loader2, Receipt, Search, Sparkles, Trash2, Bell, Wallet, Shield } from 'lucide-react'

import { useFinancialDataContext } from '@/contexts/FinancialDataContext'
import { useScenarioEvents } from '@/hooks/useScenarioEvents'
import { assetsApi, liabilitiesApi, propertyApi } from '@/api/financial'
import { ScenarioEventModal } from '../modals/ScenarioEventModal/ScenarioEventModal'
import { NetWorthProjection } from './NetWorthProjection'
import { UserMenu } from '../auth/UserMenu'
import type { TimelineYear, TimelineMonth, TimeResolution } from '@/types/timeline'
import type { ScenarioEvent } from '@/types/scenario'
import type { ZoomLevel } from '@/components/timeline/ZoomControls'
import clsx from 'clsx'

interface FinancialWorkspaceProps {
  selectedYear: number
  onSelectYear: (year: number) => void
  onSelectMonth?: (month: number) => void
  timelineYears?: TimelineYear[]
  timelineMonths?: TimelineMonth[]
  resolution?: TimeResolution
  zoomLevel?: ZoomLevel
  onZoomLevelChange?: (level: ZoomLevel) => void
  overrideYears?: Set<number>
  timelineError?: string | null
  onOpenCPF?: () => void
  onOpenPropertyPlanner?: () => void
  onOpenTax?: () => void
  onOpenInsurance?: () => void
  anchorYear?: number | null
  anchorMonth?: number | null
  headerOnly?: boolean
  onOpenLayoutModal?: () => void
}

// Stable empty Set to use as default (avoids creating new Set on each render)
const EMPTY_OVERRIDE_YEARS = new Set<number>()

export function FinancialWorkspace({
  selectedYear,
  onSelectYear,
  onSelectMonth,
  timelineYears,
  timelineMonths,
  resolution = 'yearly',
  zoomLevel = 'yearly',
  onZoomLevelChange,
  overrideYears,
  timelineError = null,
  onOpenCPF,
  onOpenPropertyPlanner,
  onOpenTax,
  onOpenInsurance,
  anchorYear,
  anchorMonth,
  headerOnly = false,
  onOpenLayoutModal,
}: FinancialWorkspaceProps) {
  // Use stable empty set as fallback
  const stableOverrideYears = useMemo(
    () => overrideYears ?? EMPTY_OVERRIDE_YEARS,
    [overrideYears]
  )

  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false)
  const [scenarioEventToEdit, setScenarioEventToEdit] = useState<ScenarioEvent | null>(null)
  const [isClearing, setIsClearing] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [isModuleMenuOpen, setIsModuleMenuOpen] = useState(false)
  const { events: scenarioEvents } = useScenarioEvents()
  const { deleteAllFinancialData, loadSampleData, refresh } = useFinancialDataContext()
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

  const seedPropertyScenario = async () => {
    try {
      const assetsResult = await assetsApi.listAssets({ limit: -1 })
      const liabilitiesResult = await liabilitiesApi.listLiabilities({ limit: -1 })
      const propertyAsset = assetsResult.data.find((a) => a.name === 'Sample Condo') ?? assetsResult.data.find((a) => a.category === 'property')
      const propertyLiability = liabilitiesResult.data.find((l) => l.name === 'Sample Condo Mortgage') ?? liabilitiesResult.data.find((l) => l.category === 'property')
      if (!propertyAsset || !propertyLiability) return null

      const scenario = await propertyApi.createPropertyScenario({
        propertyType: 'condo',
        headline: propertyAsset.name || 'Property scenario',
        propertyPrice: Math.max(1, propertyAsset.currentValue || 750000),
        downPayment: 200000,
        loanAmount: Math.max(1, propertyLiability.currentBalance || 550000),
        interestRate: Math.max(0.01, propertyLiability.interestRateApr || 3.2),
        loanTenure: 25,
        notes: 'Sample scenario for testing',
        assetId: propertyAsset.id,
        liabilityId: propertyLiability.id,
      })
      if (scenario?.id && typeof window !== 'undefined') {
        localStorage.setItem('property_planner_scenario_id', scenario.id)
        localStorage.setItem('property_planner_draft', JSON.stringify({
          propertyType: 'condo',
          loanAmount: scenario.loanAmount,
          loanTermYears: scenario.loanTenure,
          borrowerType: 'single',
          loanStartMonth: '2024-06',
          fixedYears: 5,
          fixedRate: scenario.interestRate,
          floatingRate: scenario.interestRate,
          householdIncome: 8200,
          otherDebt: 1200,
        }))
      }
      return scenario
    } catch (error) {
      console.warn('Unable to seed property scenario', error)
      return null
    }
  }

  const handleLoadDefaults = async () => {
    setIsSeeding(true)
    try {
      await loadSampleData()
      await seedPropertyScenario()
      await refresh()
    } catch (error) {
      console.error('Failed to load sample data', error)
      if (typeof window !== 'undefined') {
        window.alert('Unable to load sample data right now. Please try again.')
      }
    } finally {
      setIsSeeding(false)
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
      {/* Compact Header */}
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
          "border border-white/[0.06] rounded-full",
          "bg-white/[0.02]",
          "backdrop-blur-sm",
        )}>
          {/* Search */}
          <div className="flex items-center gap-2 border-r border-white/[0.06] pr-3">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              className={`w-48
placeholder-slate-600
focus:outline-none
bg-transparent
text-[13px] text-slate-300`}
            />
          </div>

          <div className="hidden items-center gap-1 md:flex">
            <button
              onClick={handleLoadDefaults}
              className={clsx(
                "flex items-center justify-center",
                "h-7 w-7",
                "rounded-full",
                "hover:bg-white/5",
                "hover:text-slate-300 text-slate-500",
                "disabled:opacity-60",
                "transition",
              )}
              title="Load defaults"
              type="button"
              disabled={isSeeding}
            >
              {isSeeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={handleClearAllData}
              className={clsx(
                "flex items-center justify-center",
                "h-7 w-7",
                "rounded-full",
                "hover:bg-rose-500/10",
                "hover:text-rose-300 text-rose-400/70",
                "disabled:opacity-60",
                "transition",
              )}
              title="Delete all data"
              type="button"
              disabled={isClearing}
            >
              {isClearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="h-4 w-px bg-white/[0.06]" />

          <div className="relative z-[100]" ref={moduleMenuRef}>
            <button
              onClick={() => setIsModuleMenuOpen((prev) => !prev)}
              className={clsx(
                "flex items-center gap-1.5",
                "px-2 py-1",
                "rounded-lg",
                "hover:bg-white/5",
                "font-medium hover:text-slate-200 text-[11px] text-slate-400",
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
                className="fixed inset-0 z-[99]"
                onClick={() => setIsModuleMenuOpen(false)}
              />
              <div className={clsx(
                "absolute right-0 z-[100]",
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
                    onOpenPropertyPlanner?.()
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
                    onOpenCPF?.()
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
                    onOpenTax?.()
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
                    onOpenInsurance?.()
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

          <div className="h-4 w-px bg-white/[0.06]" />

          {/* Layout toggle */}
          {onOpenLayoutModal && (
            <button
              type="button"
              onClick={onOpenLayoutModal}
              className={clsx(
                "flex items-center justify-center",
                "h-7 w-7",
                "rounded-full",
                "hover:bg-white/5",
                "hover:text-slate-300 text-slate-500",
                "transition",
              )}
              title="Change layout"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Notification bell */}
          <button
            type="button"
            className={clsx(
              "flex items-center justify-center",
              "h-7 w-7",
              "rounded-full",
              "hover:bg-white/5",
              "hover:text-slate-300 text-slate-500",
              "transition",
            )}
          >
            <Bell className="h-3.5 w-3.5" />
          </button>

          <UserMenu />
        </div>
      </header>

      {/* Only show chart and timeline error when not in headerOnly mode */}
      {!headerOnly && (
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
                  resolution={resolution}
                  zoomLevel={zoomLevel}
                  onZoomLevelChange={onZoomLevelChange}
                  overrideYears={stableOverrideYears}
                  selectedYear={selectedYear}
                  scenarioEvents={scenarioEvents}
                  onAddScenario={handleCreateScenario}
                  onScenarioSelect={handleScenarioSelect}
                  onSelectYear={onSelectYear}
                  onSelectMonth={onSelectMonth}
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
          anchorYear={anchorYear}
          anchorMonth={anchorMonth}
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
            onSelectYear(year)
            onSelectMonth?.(month)
            setIsScenarioModalOpen(false)
            setScenarioEventToEdit(null)
          }}
        />
      )}
    </div>
  )
}
