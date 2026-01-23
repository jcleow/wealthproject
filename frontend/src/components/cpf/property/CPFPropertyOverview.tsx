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
import { useTheme } from '@/lib/theme'
import type { PropertyScenarioFull } from '@/types/propertyPlannerV2'
import type { CPFHousingUsageFullResponse } from '@/api/financial/cpf'

interface CPFPropertyOverviewProps {
  onOpenPropertyPlanner?: (scenarioId?: string, initialTab?: string) => void
}

/**
 * Compute aggregate CPF stats across all active property scenarios.
 * Pure aggregation of backend data - no calculations, just summing.
 */
function useAggregateStats(
  scenarios: PropertyScenarioFull[],
  cpfAccounts: { id: string; oaBalance: number; personName?: string }[],
  housingUsageData: Map<string, CPFHousingUsageFullResponse | null>
) {
  return useMemo(() => {
    const activeScenarios = scenarios.filter(s => s.propertySG?.isIncluded)

    // Aggregate per-person CPF usage from backend data
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

      // Get backend housing usage data for this scenario
      const housingUsage = housingUsageData.get(scenario.scenario.id)
      const usage = housingUsage?.usage

      // Aggregate borrower 1 from backend data
      if (usage?.borrower1 && sg.borrower1CpfAccountId) {
        const b1 = usage.borrower1
        const b1CpfUsed = parseFloat(b1.totalOaUsed)
        const b1Interest = parseFloat(b1.accruedInterest)

        const existing = perPersonUsage.get(sg.borrower1CpfAccountId) || {
          name: b1.personName || 'Borrower 1',
          cpfUsed: 0,
          accruedInterest: 0
        }
        existing.cpfUsed += b1CpfUsed
        existing.accruedInterest += b1Interest
        perPersonUsage.set(sg.borrower1CpfAccountId, existing)
        totalCpfUsed += b1CpfUsed
        totalAccruedInterest += b1Interest
      }

      // Aggregate borrower 2 from backend data (joint ownership only)
      if (usage?.borrower2 && sg.borrower2CpfAccountId) {
        const b2 = usage.borrower2
        const b2CpfUsed = parseFloat(b2.totalOaUsed)
        const b2Interest = parseFloat(b2.accruedInterest)

        const existing = perPersonUsage.get(sg.borrower2CpfAccountId) || {
          name: b2.personName || 'Borrower 2',
          cpfUsed: 0,
          accruedInterest: 0
        }
        existing.cpfUsed += b2CpfUsed
        existing.accruedInterest += b2Interest
        perPersonUsage.set(sg.borrower2CpfAccountId, existing)
        totalCpfUsed += b2CpfUsed
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
  const { theme, isMonet } = useTheme()

  // Fetch property scenarios
  const { data: scenariosData, isLoading: scenariosLoading } = usePropertyPlannerV2ScenariosQuery()
  const scenarios = scenariosData ?? []

  // Fetch CPF accounts for person names and OA balances
  const { data: cpfAccountsData, isLoading: accountsLoading } = useCpfAccountsQuery()
  const cpfAccounts = cpfAccountsData ?? []

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
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl"
              style={{ border: `1px solid ${theme.cardBorder}` }}
            />
          ))}
        </div>
        <div
          className="flex-1 h-96 animate-pulse rounded-xl"
          style={{ border: `1px solid ${theme.cardBorder}` }}
        />
      </div>
    )
  }

  // Empty state
  if (scenarios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
          style={{ border: `1px solid ${theme.cardBorder}` }}
        >
          <Home className="h-8 w-8" style={{ color: theme.textMuted }} />
        </div>
        <h3 className="text-lg font-medium mb-2" style={{ color: theme.textPrimary }}>
          No Property Scenarios Yet
        </h3>
        <p className="text-sm max-w-md mb-6" style={{ color: theme.textSecondary }}>
          Create a property scenario in the Property Planner to see how it affects your CPF usage and retirement planning.
        </p>
        <button
          type="button"
          onClick={() => onOpenPropertyPlanner?.()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition"
          style={{
            background: isMonet ? `${theme.sage}20` : 'rgba(16, 185, 129, 0.15)',
            color: theme.sage,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isMonet ? `${theme.sage}30` : 'rgba(16, 185, 129, 0.25)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isMonet ? `${theme.sage}20` : 'rgba(16, 185, 129, 0.15)'
          }}
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
            <div
              className="flex items-center justify-center h-full rounded-xl"
              style={{ border: `1px solid ${theme.cardBorder}` }}
            >
              <p className="text-sm" style={{ color: theme.textMuted }}>
                Select a property to view CPF details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
