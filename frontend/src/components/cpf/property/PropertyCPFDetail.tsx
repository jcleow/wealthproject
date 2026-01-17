'use client'

import { useMemo } from 'react'
import { Edit3 } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import type { PropertyScenarioFull } from '@/types/propertyPlannerV2'
import type { CPFAccount } from '@/types/cpf'
import type { CPFBorrowerUsage } from '@/api/financial/cpf'
import { CPFUsageByPersonTable } from './CPFUsageByPersonTable'
import { useCpfHousingUsageQuery } from '@/hooks/queries/useCpfQuery'

interface PropertyCPFDetailProps {
  scenario: PropertyScenarioFull
  cpfAccounts: CPFAccount[] // Required by parent but data comes from backend
  onEditInPropertyPlanner?: () => void
}

/**
 * Transform backend CPFBorrowerUsage (string decimals) to UI format (numbers)
 */
function transformBorrowerUsage(backendData: CPFBorrowerUsage) {
  return {
    name: backendData.personName,
    downpaymentCpfOa: parseFloat(backendData.downpaymentOa),
    monthlyCpfOa: parseFloat(backendData.monthlyOa),
    totalCpfUsed: parseFloat(backendData.totalOaUsed),
    accruedInterest: parseFloat(backendData.accruedInterest),
  }
}

export function PropertyCPFDetail({
  scenario,
  cpfAccounts: _cpfAccounts, // Unused - data comes from backend
  onEditInPropertyPlanner,
}: PropertyCPFDetailProps) {
  const sg = scenario.propertySG

  // Fetch CPF housing usage from backend (all calculations done server-side)
  const { data: housingUsage } = useCpfHousingUsageQuery(scenario.scenario.id)

  if (!sg) {
    return (
      <div className="flex items-center justify-center h-full rounded-xl border border-gray-700 bg-gray-900/60">
        <p className="text-sm text-gray-400">No property details available.</p>
      </div>
    )
  }

  // Get holding period from backend response (or calculate fallback)
  const holdingMonths = housingUsage?.usage?.holdingMonths ?? 1
  const holdingYears = Math.ceil(holdingMonths / 12)

  // Transform backend borrower data to UI format (pure display - no calculations)
  const { borrower1, borrower2 } = useMemo(() => {
    const usage = housingUsage?.usage
    return {
      borrower1: usage?.borrower1 ? transformBorrowerUsage(usage.borrower1) : null,
      borrower2: usage?.borrower2 ? transformBorrowerUsage(usage.borrower2) : null,
    }
  }, [housingUsage])

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-white">{sg.name}</h3>
              <button
                type="button"
                onClick={onEditInPropertyPlanner}
                className="p-1 rounded text-gray-500 hover:text-white transition"
              >
                <Edit3 className="h-3 w-3" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatCurrency(parseFloat(sg.propertyPrice))} • {holdingYears} year holding
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Per-Person CPF Usage - Tabular Layout */}
        {borrower1 && (
          <div>
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              CPF Usage by Person
            </h4>
            <CPFUsageByPersonTable
              borrower1={borrower1}
              borrower2={borrower2}
              holdingMonths={holdingMonths}
              grants={scenario.grants}
            />
          </div>
        )}
      </div>
    </div>
  )
}
