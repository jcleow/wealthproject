import { useEffect, useRef, useState } from 'react'
import { Building2, Car, ChevronDown, Loader2, Receipt, Search, Sparkles, Trash2, Bell, Wallet } from 'lucide-react'

import { useFinancialDataContext } from '@/contexts/FinancialDataContext'
import { useScenarioEvents } from '@/hooks/useScenarioEvents'
import { assetsApi, liabilitiesApi, propertyApi } from '@/api/financial'
import { PropertyPlannerModal } from '../modals/PropertyPlannerModal/PropertyPlannerModal'
import { ScenarioEventModal } from '../modals/ScenarioEventModal/ScenarioEventModal'
import { NetWorthProjection } from './NetWorthProjection'
import { UserMenu } from '../auth/UserMenu'
import type { TimelineYear, TimelineMonth, TimeResolution } from '@/types/timeline'
import type { ScenarioEvent } from '@/types/scenario'
import type { ZoomLevel } from '@/components/timeline/ZoomControls'

interface FinancialWorkspaceProps {
  selectedYear: number
  onSelectYear: (year: number) => void
  timelineYears?: TimelineYear[]
  timelineMonths?: TimelineMonth[]
  resolution?: TimeResolution
  zoomLevel?: ZoomLevel
  onZoomLevelChange?: (level: ZoomLevel) => void
  overrideYears?: Set<number>
  timelineError?: string | null
  onOpenCPF?: () => void
}

export function FinancialWorkspace({
  selectedYear,
  onSelectYear,
  timelineYears,
  timelineMonths,
  resolution = 'yearly',
  zoomLevel = 'yearly',
  onZoomLevelChange,
  overrideYears = new Set<number>(),
  timelineError = null,
  onOpenCPF,
}: FinancialWorkspaceProps) {
  const [isPropertyPlannerOpen, setIsPropertyPlannerOpen] = useState(false)
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

  const handlePropertyPlanner = () => {
    setIsPropertyPlannerOpen(true)
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

  const handleCreateScenario = () => {
    setScenarioEventToEdit(null)
    setIsScenarioModalOpen(true)
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-transparent text-slate-200">
      {/* Compact Header */}
      <header className="relative z-[100] flex h-14 shrink-0 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            {/* <h2 className="text-lg font-medium tracking-tight text-slate-100">Workspace</h2> */}
          </div>
        </div>

        {/* Glass pill control group */}
        <div className="flex items-center gap-3 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 backdrop-blur-sm">
          {/* Search */}
          <div className="flex items-center gap-2 border-r border-white/[0.06] pr-3">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              className="w-48 bg-transparent text-[13px] text-slate-300 placeholder-slate-600 focus:outline-none"
            />
          </div>

          <div className="hidden items-center gap-1 md:flex">
            <button
              onClick={handleLoadDefaults}
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/5 hover:text-slate-300 disabled:opacity-60"
              title="Load defaults"
              type="button"
              disabled={isSeeding}
            >
              {isSeeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={handleClearAllData}
              className="flex h-7 w-7 items-center justify-center rounded-full text-rose-400/70 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-60"
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
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
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
              <div className="absolute right-0 z-[100] mt-2 w-64 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a] shadow-2xl" style={{ isolation: 'isolate' }}>
                <button
                  onClick={() => {
                    setIsModuleMenuOpen(false)
                    handlePropertyPlanner()
                  }}
                  className="flex w-full items-start gap-3 border-b border-white/[0.04] px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-white/5"
                  type="button"
                >
                  <span className="mt-0.5 rounded-lg border border-blue-500/20 bg-blue-500/10 p-2 text-blue-400">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="space-y-0.5">
                    <div className="font-medium">Property Planner</div>
                    <p className="text-xs text-slate-400">Model affordability, mortgages, and cash flow.</p>
                  </div>
                </button>
                {/* CPF Simulation */}
                <button
                  onClick={() => {
                    setIsModuleMenuOpen(false)
                    onOpenCPF?.()
                  }}
                  className="flex w-full items-start gap-3 border-b border-white/[0.04] px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-white/5"
                  type="button"
                >
                  <span className="mt-0.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-400">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <div className="space-y-0.5">
                    <div className="font-medium">CPF</div>
                    <p className="text-xs text-slate-400">Simulate balances, investments, and retirement.</p>
                  </div>
                </button>
                {/* Coming Soon Modules */}
                <div className="cursor-not-allowed opacity-60">
                  <div className="flex w-full items-start gap-3 px-4 py-3 text-left text-sm">
                    <span className="mt-0.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-slate-500">
                      <Car className="h-4 w-4" />
                    </span>
                    <div className="space-y-0.5">
                      <div className="font-medium text-slate-400">Vehicle Purchase</div>
                      <p className="text-xs text-slate-500">Coming soon</p>
                    </div>
                  </div>
                </div>
                <div className="cursor-not-allowed opacity-60">
                  <div className="flex w-full items-start gap-3 px-4 py-3 text-left text-sm">
                    <span className="mt-0.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-slate-500">
                      <Receipt className="h-4 w-4" />
                    </span>
                    <div className="space-y-0.5">
                      <div className="font-medium text-slate-400">Tax Module</div>
                      <p className="text-xs text-slate-500">Coming soon</p>
                    </div>
                  </div>                                    
                </div>
                <div className="cursor-not-allowed opacity-60">
                  <div className="flex w-full items-start gap-3 px-4 py-3 text-left text-sm">
                    <span className="mt-0.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-slate-500">
                      <Receipt className="h-4 w-4" />
                    </span>
                    <div className="space-y-0.5">
                      <div className="font-medium text-slate-400">Insurance Coverage</div>
                      <p className="text-xs text-slate-500">Coming soon</p>
                    </div>
                  </div>                                    
                </div>
              </div>
              </>
            )}
          </div>

          <div className="h-4 w-px bg-white/[0.06]" />

          {/* Notification bell */}
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
          >
            <Bell className="h-3.5 w-3.5" />
          </button>

          <UserMenu />
        </div>
      </header>

      {timelineError && (
        <div className="mx-6 mt-4 rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-2 text-xs text-rose-300">
          Timeline unavailable: {timelineError}
        </div>
      )}

      {/* Chart Section */}
      <div className="flex-1 p-6">
        <section className="relative h-full overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0a0a0a]/60 transition-all hover:border-white/[0.15]">
          {/* Chart Container - NetWorthProjection has its own header */}
          <div className="h-full">
            <NetWorthProjection
              chartTitle="Net Worth Projection"
              timelineYears={timelineYears}
              timelineMonths={timelineMonths}
              resolution={resolution}
              zoomLevel={zoomLevel}
              onZoomLevelChange={onZoomLevelChange}
              overrideYears={overrideYears}
              selectedYear={selectedYear}
              scenarioEvents={scenarioEvents}
              onAddScenario={handleCreateScenario}
              onScenarioSelect={async (event) => {
                if (!event?.id) return
                setScenarioEventToEdit(event)
                setIsScenarioModalOpen(true)
              }}
              onSelectYear={(year) => {
                onSelectYear(year)
                const target = document.getElementById('financial-data-section')
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            />
          </div>
        </section>
      </div>

      <PropertyPlannerModal
        isOpen={isPropertyPlannerOpen}
        onClose={() => setIsPropertyPlannerOpen(false)}
      />
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
        />
      )}
    </div>
  )
}
