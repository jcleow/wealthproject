import { useState } from 'react'
import { Building2, Loader2, RefreshCw, Sparkles, Trash2 } from 'lucide-react'

import { useFinancialData } from '@/hooks/useFinancialData'
import { financialApi } from '@/services/financialApi'
import { PropertyPlannerModal } from '../modals/PropertyPlannerModal'
import { NetWorthProjection } from './NetWorthProjection'

export function FinancialWorkspace() {
  const [isPropertyPlannerOpen, setIsPropertyPlannerOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const { deleteAllFinancialData, loadSampleData, refresh } = useFinancialData()

  const handleAction = (label: string) => {
    console.log(`${label} clicked`)
  }

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

  const handleRefresh = () => {
    console.log('Refresh clicked')
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
            onClick={handleRefresh}
            className="rounded-full bg-white/10 p-2 text-gray-400 transition hover:bg-white/20 hover:text-white"
            title="Refresh financial data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 p-6 min-h-[400px]">
        <NetWorthProjection />
      </div>

      <PropertyPlannerModal
        isOpen={isPropertyPlannerOpen}
        onClose={() => setIsPropertyPlannerOpen(false)}
      />
    </div>
  )
}
