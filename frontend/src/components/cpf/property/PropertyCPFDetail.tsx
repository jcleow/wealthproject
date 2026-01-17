'use client'

import { useMemo } from 'react'
import { Edit3 } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
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
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    return Math.max(months, 1)
  }, [purchaseDate, sg.saleExpectedDate])

  const holdingYears = Math.ceil(holdingMonths / 12)

  // Calculate per-borrower CPF usage with accurate compound interest from backend
  const { borrower1, borrower2 } = useMemo(() => {
    // Get per-borrower raw data from scenario
    const b1DownpaymentOa = parseFloat(sg.borrower1DownpaymentCpfOa || '0')
    const b1MonthlyOa = parseFloat(sg.borrower1MonthlyCpfOa || '0')
    const b1TotalUsed = b1DownpaymentOa + (b1MonthlyOa * holdingMonths)

    const isJoint = sg.borrowerType === 'joint' && sg.borrower2CpfAccountId
    const b2DownpaymentOa = isJoint ? parseFloat(sg.borrower2DownpaymentCpfOa || '0') : 0
    const b2MonthlyOa = isJoint ? parseFloat(sg.borrower2MonthlyCpfOa || '0') : 0
    const b2TotalUsed = b2DownpaymentOa + (b2MonthlyOa * holdingMonths)

    // Get total accrued interest from backend (accurate compound interest)
    const totalAccruedInterest = housingUsage?.usage?.accruedInterest?.totalAccrued
      ? parseFloat(housingUsage.usage.accruedInterest.totalAccrued)
      : null

    // Calculate proportional interest for each borrower
    const combinedTotal = b1TotalUsed + b2TotalUsed
    const b1Ratio = combinedTotal > 0 ? b1TotalUsed / combinedTotal : 1
    const b2Ratio = combinedTotal > 0 ? b2TotalUsed / combinedTotal : 0

    // Use backend interest if available, otherwise fall back to simple calculation
    const b1Interest = totalAccruedInterest !== null
      ? totalAccruedInterest * b1Ratio
      : b1TotalUsed * 0.025 * (holdingMonths / 12)
    const b2Interest = totalAccruedInterest !== null
      ? totalAccruedInterest * b2Ratio
      : b2TotalUsed * 0.025 * (holdingMonths / 12)

    const borrower1Data = sg.borrower1CpfAccountId ? {
      name: accountMap.get(sg.borrower1CpfAccountId)?.personName || 'Borrower 1',
      downpaymentCpfOa: b1DownpaymentOa,
      monthlyCpfOa: b1MonthlyOa,
      totalCpfUsed: b1TotalUsed,
      accruedInterest: b1Interest,
    } : null

    const borrower2Data = isJoint ? {
      name: accountMap.get(sg.borrower2CpfAccountId!)?.personName || 'Borrower 2',
      downpaymentCpfOa: b2DownpaymentOa,
      monthlyCpfOa: b2MonthlyOa,
      totalCpfUsed: b2TotalUsed,
      accruedInterest: b2Interest,
    } : null

    return { borrower1: borrower1Data, borrower2: borrower2Data }
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
