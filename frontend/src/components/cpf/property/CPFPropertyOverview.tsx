'use client'

import { useState, useMemo } from 'react'
import { Home, Plus } from 'lucide-react'
import { useQueries } from '@tanstack/react-query'

import { usePropertyPlannerV2ScenariosQuery } from '@/hooks/queries/usePropertyPlannerV2Query'
import { useCpfAccountsQuery, CPF_HOUSING_USAGE_QUERY_KEY } from '@/hooks/queries/useCpfQuery'
import { cpfApi } from '@/api/financial/cpf'
import { PropertyScenarioList } from './PropertyScenarioList'
import { PropertyCPFDetail } from './PropertyCPFDetail'
import { AggregateBar } from './AggregateBar'
import type { PropertyScenarioFull } from '@/types/propertyPlannerV2'
import type { CPFHousingUsageFullResponse } from '@/api/financial/cpf'

interface CPFPropertyOverviewProps {
  onOpenPropertyPlanner?: (scenarioId?: string, initialTab?: string) => void
}

/**
 * Compute aggregate CPF stats across all active property scenarios.
 * Uses backend housing usage data when available for accurate compound interest.
 */
function useAggregateStats(
  scenarios: PropertyScenarioFull[],
  cpfAccounts: { id: string; oaBalance: number; personName?: string }[],
  housingUsageData: Map<string, CPFHousingUsageFullResponse | null>
) {
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

      // Get backend housing usage data for this scenario (accurate compound interest)
      const housingUsage = housingUsageData.get(scenario.scenario.id)
      const backendTotalInterest = housingUsage?.usage?.accruedInterest?.totalAccrued
        ? parseFloat(housingUsage.usage.accruedInterest.totalAccrued)
        : null

      // Borrower 1 CPF usage
      const b1CpfAccountId = sg.borrower1CpfAccountId
      const b1Downpayment = parseFloat(sg.borrower1DownpaymentCpfOa || '0')
      const b1Monthly = parseFloat(sg.borrower1MonthlyCpfOa || '0')
      const b1Total = b1Downpayment + (b1Monthly * holdingMonths)

      // Borrower 2 CPF usage
      const isJoint = sg.borrowerType === 'joint' && sg.borrower2CpfAccountId
      const b2CpfAccountId = sg.borrower2CpfAccountId
      const b2Downpayment = isJoint ? parseFloat(sg.borrower2DownpaymentCpfOa || '0') : 0
      const b2Monthly = isJoint ? parseFloat(sg.borrower2MonthlyCpfOa || '0') : 0
      const b2Total = b2Downpayment + (b2Monthly * holdingMonths)

      // Calculate proportional interest for each borrower
      const combinedTotal = b1Total + b2Total
      const b1Ratio = combinedTotal > 0 ? b1Total / combinedTotal : 1
      const b2Ratio = combinedTotal > 0 ? b2Total / combinedTotal : 0

      // Use backend interest if available, otherwise fall back to simple calculation
      const b1Interest = backendTotalInterest !== null
        ? backendTotalInterest * b1Ratio
        : b1Total * 0.025 * (holdingMonths / 12)
      const b2Interest = backendTotalInterest !== null
        ? backendTotalInterest * b2Ratio
        : b2Total * 0.025 * (holdingMonths / 12)

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

      if (isJoint && b2CpfAccountId) {
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
  }, [scenarios, cpfAccounts, housingUsageData])
}

export function CPFPropertyOverview({ onOpenPropertyPlanner }: CPFPropertyOverviewProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)

  // Fetch property scenarios
  const { data: scenarios = [], isLoading: scenariosLoading } = usePropertyPlannerV2ScenariosQuery()

  // Fetch CPF accounts for person names and OA balances
  const { data: cpfAccounts = [], isLoading: accountsLoading } = useCpfAccountsQuery()

  // Get active scenarios for housing usage queries
  const activeScenarios = useMemo(
    () => scenarios.filter(s => s.propertySG?.isIncluded),
    [scenarios]
  )

  // Fetch CPF housing usage for each active scenario in parallel (accurate compound interest)
  const housingUsageQueries = useQueries({
    queries: activeScenarios.map(scenario => ({
      queryKey: CPF_HOUSING_USAGE_QUERY_KEY(scenario.scenario.id),
      queryFn: () => cpfApi.getCPFHousingUsage(scenario.scenario.id),
      staleTime: 30_000,
    })),
  })

  // Build a map of scenario ID -> housing usage data
  const housingUsageData = useMemo(() => {
    const map = new Map<string, CPFHousingUsageFullResponse | null>()
    activeScenarios.forEach((scenario, index) => {
      const query = housingUsageQueries[index]
      if (query?.isSuccess && query.data) {
        map.set(scenario.scenario.id, query.data)
      }
    })
    return map
  }, [activeScenarios, housingUsageQueries])

  // Compute aggregate stats using backend housing usage data
  const stats = useAggregateStats(
    scenarios,
    cpfAccounts.map(a => ({ id: a.id, oaBalance: a.oaBalance, personName: a.personName })),
    housingUsageData
  )

  // Split scenarios into draft (activeScenarios already computed above)
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
            <div key={i} className="h-24 animate-pulse rounded-xl border border-white/[0.06]" />
          ))}
        </div>
        <div className="flex-1 h-96 animate-pulse rounded-xl border border-white/[0.06]" />
      </div>
    )
  }

  // Empty state
  if (scenarios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] mb-4">
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
            <div className="flex items-center justify-center h-full rounded-xl border border-white/[0.06]">
              <p className="text-sm text-gray-400">Select a property to view CPF details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
