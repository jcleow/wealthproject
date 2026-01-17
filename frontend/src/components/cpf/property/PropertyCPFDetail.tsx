'use client'

import { useMemo } from 'react'
import { Edit3 } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import {
  calculateBorrowerCPFUsage,
  calculateHoldingMonths,
  extractBackendTotalInterest,
} from '@/lib/cpf'
import type { PropertyScenarioFull } from '@/types/propertyPlannerV2'
import type { CPFAccount } from '@/types/cpf'
import { CPFUsageByPersonTable } from './CPFUsageByPersonTable'
import { useCpfHousingUsageQuery } from '@/hooks/queries/useCpfQuery'

interface PropertyCPFDetailProps {
  scenario: PropertyScenarioFull
  cpfAccounts: CPFAccount[]
  onEditInPropertyPlanner?: () => void
}

export function PropertyCPFDetail({
  scenario,
  cpfAccounts,
  onEditInPropertyPlanner,
}: PropertyCPFDetailProps) {
  const sg = scenario.propertySG

  // Fetch CPF housing usage from backend (accurate compound interest)
  const { data: housingUsage } = useCpfHousingUsageQuery(scenario.scenario.id)

  if (!sg) {
    return (
      <div className="flex items-center justify-center h-full rounded-xl border border-gray-700 bg-gray-900/60">
        <p className="text-sm text-gray-400">No property details available.</p>
      </div>
    )
  }

  // Build CPF account lookup map
  const accountMap = useMemo(
    () => new Map(cpfAccounts.map(a => [a.id, a])),
    [cpfAccounts]
  )

  // Calculate holding period
  const purchaseDate = sg.btoKeyCollectionDate || scenario.scenario.createdAt
  const holdingMonths = useMemo(() => {
    const start = new Date(purchaseDate)
    const end = sg.saleExpectedDate ? new Date(sg.saleExpectedDate) : new Date()
    return calculateHoldingMonths(start, end)
  }, [purchaseDate, sg.saleExpectedDate])

  const holdingYears = Math.ceil(holdingMonths / 12)

  // Calculate per-borrower CPF usage with accurate compound interest from backend
  const { borrower1, borrower2 } = useMemo(() => {
    const backendTotalInterest = extractBackendTotalInterest(housingUsage)

    return calculateBorrowerCPFUsage({
      borrower1CpfAccountId: sg.borrower1CpfAccountId,
      borrower1DownpaymentCpfOa: sg.borrower1DownpaymentCpfOa,
      borrower1MonthlyCpfOa: sg.borrower1MonthlyCpfOa,
      borrowerType: sg.borrowerType,
      borrower2CpfAccountId: sg.borrower2CpfAccountId,
      borrower2DownpaymentCpfOa: sg.borrower2DownpaymentCpfOa,
      borrower2MonthlyCpfOa: sg.borrower2MonthlyCpfOa,
      holdingMonths,
      accountMap,
      backendTotalInterest,
    })
  }, [sg, accountMap, holdingMonths, housingUsage])

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
