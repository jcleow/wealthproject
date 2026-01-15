'use client'

import { useState, useMemo } from 'react'
import { Home, Plus, LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

import { usePropertyPlannerV2ScenariosQuery } from '@/hooks/queries/usePropertyPlannerV2Query'
import { useCpfAccountsQuery } from '@/hooks/queries/useCpfQuery'
import { PropertyScenarioList } from './PropertyScenarioList'
import { PropertyCPFDetail } from './PropertyCPFDetail'
import { AggregateBar } from './AggregateBar'
import { CPFPropertyCard } from './CPFPropertyCard'
import type { PropertyScenarioFull } from '@/types/propertyPlannerV2'

type ViewMode = 'overview' | 'list'

interface CPFPropertyOverviewProps {
  onOpenPropertyPlanner?: (scenarioId?: string, initialTab?: string) => void
}

/**
 * Compute aggregate CPF stats across all active property scenarios
 */
function useAggregateStats(scenarios: PropertyScenarioFull[], cpfAccounts: { id: string; oaBalance: number; personName?: string }[]) {
  return useMemo(() => {
    const activeScenarios = scenarios.filter(s => s.propertySG?.isIncluded)

    // Build a map of CPF account ID to person name and OA balance
    const accountMap = new Map(cpfAccounts.map(a => [a.id, { name: a.personName || 'Unknown', oaBalance: a.oaBalance }]))

    // Aggregate per-person CPF usage
    const perPersonUsage = new Map<string, { name: string; cpfUsed: number; accruedInterest: number }>()

    let totalCpfUsed = 0
    let totalAccruedInterest = 0
    let totalGrants = 0

    for (const scenario of activeScenarios) {
      const sg = scenario.propertySG
      if (!sg) continue

      // Calculate grants
      const scenarioGrants = scenario.grants?.reduce((sum, g) => sum + parseFloat(g.amount || '0'), 0) || 0
      totalGrants += scenarioGrants

      // Calculate holding period from creation date
      const purchaseDate = sg.btoKeyCollectionDate || scenario.scenario.createdAt
      const start = new Date(purchaseDate)
      const end = sg.saleExpectedDate ? new Date(sg.saleExpectedDate) : new Date()
      const holdingMonths = Math.max((end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()), 1)

      // Borrower 1 CPF usage
      const b1CpfAccountId = sg.borrower1CpfAccountId
      const b1Downpayment = parseFloat(sg.borrower1DownpaymentCpfOa || '0')
      const b1Monthly = parseFloat(sg.borrower1MonthlyCpfOa || '0')
      const b1Total = b1Downpayment + (b1Monthly * holdingMonths)
      const b1Interest = b1Total * 0.025 * (holdingMonths / 12)

      if (b1CpfAccountId) {
        const existing = perPersonUsage.get(b1CpfAccountId) || {
          name: accountMap.get(b1CpfAccountId)?.name || 'Borrower 1',
          cpfUsed: 0,
          accruedInterest: 0
        }
        existing.cpfUsed += b1Total
        existing.accruedInterest += b1Interest
        perPersonUsage.set(b1CpfAccountId, existing)
        totalCpfUsed += b1Total
        totalAccruedInterest += b1Interest
      }

      // Borrower 2 CPF usage (if joint)
      if (sg.borrowerType === 'joint' && sg.borrower2CpfAccountId) {
        const b2CpfAccountId = sg.borrower2CpfAccountId
        const b2Downpayment = parseFloat(sg.borrower2DownpaymentCpfOa || '0')
        const b2Monthly = parseFloat(sg.borrower2MonthlyCpfOa || '0')
        const b2Total = b2Downpayment + (b2Monthly * holdingMonths)
        const b2Interest = b2Total * 0.025 * (holdingMonths / 12)

        const existing = perPersonUsage.get(b2CpfAccountId) || {
          name: accountMap.get(b2CpfAccountId)?.name || 'Borrower 2',
          cpfUsed: 0,
          accruedInterest: 0
        }
        existing.cpfUsed += b2Total
        existing.accruedInterest += b2Interest
        perPersonUsage.set(b2CpfAccountId, existing)
        totalCpfUsed += b2Total
        totalAccruedInterest += b2Interest
      }
    }

    // Calculate total OA balance
    const totalOaBalance = cpfAccounts.reduce((sum, a) => sum + a.oaBalance, 0)

    return {
      activeCount: activeScenarios.length,
      draftCount: scenarios.length - activeScenarios.length,
      totalCpfUsed,
      totalAccruedInterest,
      totalGrants,
      mustRefundAtSale: totalCpfUsed + totalAccruedInterest,
      oaBalanceAvailable: totalOaBalance,
      perPersonUsage: Array.from(perPersonUsage.entries()).map(([id, data]) => ({
        id,
        ...data
      }))
    }
  }, [scenarios, cpfAccounts])
}

export function CPFPropertyOverview({ onOpenPropertyPlanner }: CPFPropertyOverviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)

  // Fetch property scenarios
  const { data: scenarios = [], isLoading: scenariosLoading } = usePropertyPlannerV2ScenariosQuery()

  // Fetch CPF accounts for person names and OA balances
  const { data: cpfAccounts = [], isLoading: accountsLoading } = useCpfAccountsQuery()

  // Compute aggregate stats
  const stats = useAggregateStats(
    scenarios,
    cpfAccounts.map(a => ({ id: a.id, oaBalance: a.oaBalance, personName: a.personName }))
  )

  // Split scenarios into active and draft
  const activeScenarios = useMemo(
    () => scenarios.filter(s => s.propertySG?.isIncluded),
    [scenarios]
  )
  const draftScenarios = useMemo(
    () => scenarios.filter(s => !s.propertySG?.isIncluded),
    [scenarios]
  )

  // Get the selected scenario
  const selectedScenario = useMemo(
    () => scenarios.find(s => s.scenario.id === selectedScenarioId) || null,
    [scenarios, selectedScenarioId]
  )

  // Auto-select first active scenario if none selected
  useMemo(() => {
    if (!selectedScenarioId && activeScenarios.length > 0) {
      setSelectedScenarioId(activeScenarios[0].scenario.id)
    }
  }, [selectedScenarioId, activeScenarios])

  const isLoading = scenariosLoading || accountsLoading

  if (isLoading) {
    return (
      <div className="flex h-full gap-4">
        <div className="w-[35%] space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-900/60 border border-gray-700" />
          ))}
        </div>
        <div className="flex-1 h-96 animate-pulse rounded-xl bg-gray-900/60 border border-gray-700" />
      </div>
    )
  }

  // Empty state
  if (scenarios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-800 mb-4">
          <Home className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No Property Scenarios Yet</h3>
        <p className="text-sm text-gray-300 max-w-md mb-6">
          Create a property scenario in the Property Planner to see how it affects your CPF usage and retirement planning.
        </p>
        <button
          type="button"
          onClick={() => onOpenPropertyPlanner?.()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition"
        >
          <Plus className="h-4 w-4" />
          Open Property Planner
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with View Mode Toggle */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-medium text-gray-200">CPF Property Overview</h2>

        {/* View Mode Toggle */}
        <div className="inline-flex rounded-lg bg-gray-800 p-0.5 border border-gray-700">
          <button
            type="button"
            onClick={() => setViewMode('overview')}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
              viewMode === 'overview'
                ? "bg-gray-700 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Overview
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
              viewMode === 'list'
                ? "bg-gray-700 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            )}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
        </div>
      </div>

      {viewMode === 'overview' ? (
        <>
          {/* Top Aggregate Bar */}
          <AggregateBar stats={stats} />

          {/* Main Two-Panel Layout */}
          <div className="flex flex-1 gap-4 min-h-0 mt-4">
            {/* Left Panel - Property List (35%) */}
            <div className="w-[35%] flex-shrink-0 overflow-y-auto">
              <PropertyScenarioList
                activeScenarios={activeScenarios}
                draftScenarios={draftScenarios}
                selectedScenarioId={selectedScenarioId}
                onSelectScenario={setSelectedScenarioId}
                onOpenPropertyPlanner={onOpenPropertyPlanner}
              />
            </div>

            {/* Right Panel - Selected Property Detail (65%) */}
            <div className="flex-1 overflow-y-auto">
              {selectedScenario ? (
                <PropertyCPFDetail
                  scenario={selectedScenario}
                  cpfAccounts={cpfAccounts}
                  onEditInPropertyPlanner={() => onOpenPropertyPlanner?.(selectedScenario.scenario.id)}
                />
              ) : (
                <div className="flex items-center justify-center h-full rounded-xl border border-gray-700 bg-gray-900/60">
                  <p className="text-sm text-gray-400">Select a property to view CPF details</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* List View - All properties in a single column */
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Add Property Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onOpenPropertyPlanner?.()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Property
            </button>
          </div>

          {/* Active Properties */}
          {activeScenarios.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
                Active Properties ({activeScenarios.length})
              </h3>
              {activeScenarios.map(scenario => (
                <CPFPropertyCard
                  key={scenario.scenario.id}
                  scenario={scenario}
                  cpfAccounts={cpfAccounts}
                  onViewDetails={() => onOpenPropertyPlanner?.(scenario.scenario.id, 'cpf')}
                />
              ))}
            </div>
          )}

          {/* Draft Properties */}
          {draftScenarios.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
                Draft Properties ({draftScenarios.length})
              </h3>
              {draftScenarios.map(scenario => (
                <CPFPropertyCard
                  key={scenario.scenario.id}
                  scenario={scenario}
                  cpfAccounts={cpfAccounts}
                  isDraft
                  onViewDetails={() => onOpenPropertyPlanner?.(scenario.scenario.id, 'cpf')}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {scenarios.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">No properties yet. Add one to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
