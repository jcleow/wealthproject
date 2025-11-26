import { useState } from 'react'
import { Building2, Loader2, PlusCircle, Sparkles, Trash2 } from 'lucide-react'

import { useFinancialData } from '@/hooks/useFinancialData'
import { useScenarioEvents } from '@/hooks/useScenarioEvents'
import { financialApi } from '@/services/financialApi'
import { TimelineEditDrawer } from '../financial/TimelineEditDrawer'
import { PropertyPlannerModal } from '../modals/PropertyPlannerModal'
import { ScenarioEventModal } from '../modals/ScenarioEventModal'
import { NetWorthProjection } from './NetWorthProjection'
import type { TimelineEditRequest, TimelineYear } from '@/types/timeline'
import type { ScenarioEvent } from '@/types/scenario'

interface FinancialWorkspaceProps {
  selectedYear: number
  onSelectYear: (year: number) => void
  timelineYears?: TimelineYear[]
  timelineYear?: TimelineYear
  overrideYears?: Set<number>
  onSaveTimelineEdits: (payload: TimelineEditRequest) => Promise<void>
  isTimelineLoading?: boolean
  isSavingTimeline?: boolean
  timelineError?: string | null
}

export function FinancialWorkspace({
  selectedYear,
  onSelectYear,
  timelineYears,
  timelineYear,
  overrideYears = new Set<number>(),
  onSaveTimelineEdits,
  isTimelineLoading = false,
  isSavingTimeline = false,
  timelineError = null,
}: FinancialWorkspaceProps) {
  const [isPropertyPlannerOpen, setIsPropertyPlannerOpen] = useState(false)
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false)
  const [scenarioEventToEdit, setScenarioEventToEdit] = useState<ScenarioEvent | null>(null)
  const [isClearing, setIsClearing] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [isTimelineDrawerOpen, setIsTimelineDrawerOpen] = useState(false)
  const { events: scenarioEvents } = useScenarioEvents()
  const { deleteAllFinancialData, loadSampleData, refresh } = useFinancialData()

  const clearPropertyData = async () => {
    if (typeof window === 'undefined') return
    const scenarioId = localStorage.getItem('property_planner_scenario_id')
    localStorage.removeItem('property_planner_draft')
    localStorage.removeItem('property_planner_scenario_id')

    if (scenarioId) {
      try {
        await financialApi.deletePropertyScenario(scenarioId)
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
      const existingAssets = await financialApi.listAssets()
      const existingLiabilities = await financialApi.listLiabilities()
      const propertyAsset = existingAssets.find((a) => a.name === 'Sample Condo') ?? existingAssets.find((a) => a.category === 'property')
      const propertyLiability = existingLiabilities.find((l) => l.name === 'Sample Condo Mortgage') ?? existingLiabilities.find((l) => l.category === 'property')
      if (!propertyAsset || !propertyLiability) return null

      const scenario = await financialApi.createPropertyScenario({
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

  const handleCreateScenario = () => {
    setScenarioEventToEdit(null)
    setIsScenarioModalOpen(true)
  }

  const handleSaveTimelineEdits = async (payload: TimelineEditRequest) => {
    try {
      await onSaveTimelineEdits(payload)
      setIsTimelineDrawerOpen(false)
    } catch (error) {
      console.error('Failed to save timeline edits', error)
      if (typeof window !== 'undefined') {
        window.alert('Unable to save timeline edits right now.')
      }
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col border-0 bg-midnight-900 text-white">
      <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-2xl font-semibold text-white">Financial Workspace</h3>
          <p className="text-sm text-gray-400">
            Track projections, run scenarios, and launch planning tools.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateScenario}
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            type="button"
          >
            <PlusCircle className="h-4 w-4 text-emerald-200" />
            Create Scenario
          </button>
          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={handleLoadDefaults}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
              title="Load defaults"
              type="button"
              disabled={isSeeding}
            >
              {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </button>
            <button
              onClick={handleClearAllData}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-600/10 text-rose-100 transition hover:bg-rose-600/20 hover:text-white disabled:opacity-60"
              title="Delete all data"
              type="button"
              disabled={isClearing}
            >
              {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
          <button
            onClick={handlePropertyPlanner}
            className="flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            type="button"
          >
            <Sparkles className="h-4 w-4 text-blue-200" />
            <span className="hidden md:inline">Property Planner</span>
            <span className="flex items-center gap-1 rounded-full bg-black/30 px-2 py-1 text-xs text-blue-100">
              <Building2 className="h-3 w-3" />
              HDB (BTO / Resale)
            </span>
          </button>
          <button
            onClick={() => setIsTimelineDrawerOpen(true)}
            className="rounded-full bg-blue-600/80 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
            title="Edit selected year"
            disabled={isTimelineLoading}
          >
            {isSavingTimeline ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Edit year'}
          </button>
        </div>
      </div>
      {timelineError && (
        <div className="mx-6 mb-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">
          Timeline unavailable: {timelineError}
        </div>
      )}
      <div className="p-6 h-[50vh] min-h-[400px] flex-none">
        <NetWorthProjection
          timelineYears={timelineYears}
          overrideYears={overrideYears}
          selectedYear={selectedYear}
          scenarioEvents={scenarioEvents}
          onScenarioSelect={(event) => {
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
      <TimelineEditDrawer
        isOpen={isTimelineDrawerOpen}
        onClose={() => setIsTimelineDrawerOpen(false)}
        year={selectedYear}
        timelineYear={timelineYear}
        onSave={handleSaveTimelineEdits}
        saving={isSavingTimeline}
      />
    </div>
  )
}
