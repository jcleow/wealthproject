'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { PropertySGGrant } from '@/types/propertyPlannerV2'

// ============================================
// TYPES
// ============================================

interface BorrowerData {
  name: string
  downpaymentCpfOa: number
  monthlyCpfOa: number
  totalCpfUsed: number
  accruedInterest: number
}

interface CPFUsageByPersonTableProps {
  title?: string
  borrower1: BorrowerData
  borrower2?: BorrowerData | null
  holdingMonths: number
  grants?: PropertySGGrant[]
}

/** Common props shared by most section components */
interface SectionBaseProps {
  gridCols: string
  borrower1: BorrowerData
  borrower2?: BorrowerData | null
}

// ============================================
// TABLE HEADER
// ============================================

function TableHeader({ gridCols, borrower1, borrower2 }: SectionBaseProps) {
  return (
    <div className={cn('grid', gridCols)}>
      <div className="p-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          CPF Contribution By Person
        </span>
      </div>
      <div className="p-3 text-right">
        <span className="text-sm font-medium text-white">
          {borrower1.name || 'Borrower 1'}
        </span>
      </div>
      {borrower2 && (
        <div className="p-3 text-right">
          <span className="text-sm font-medium text-white">
            {borrower2.name || 'Borrower 2'}
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================
// DOWN PAYMENT SECTION
// ============================================

function DownpaymentSection({ gridCols, borrower1, borrower2 }: SectionBaseProps) {
  return (
    <div>
      <div className={cn('grid', gridCols)}>
        <div className="p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Down Payment</p>
        </div>
        <div />
        {borrower2 && <div />}
      </div>
      <div className={cn('grid', gridCols)}>
        <div className="px-3 pb-3">
          <span className="text-sm text-gray-400 pl-3">CPF OA</span>
        </div>
        <div className="px-3 pb-3 text-right">
          <span className="text-sm text-white font-mono tabular-nums">
            {formatCurrency(borrower1.downpaymentCpfOa)}
          </span>
        </div>
        {borrower2 && (
          <div className="px-3 pb-3 text-right">
            <span className="text-sm text-white font-mono tabular-nums">
              {formatCurrency(borrower2.downpaymentCpfOa)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// HOUSING GRANTS SECTION
// ============================================

interface HousingGrantsSectionProps extends SectionBaseProps {
  grants?: PropertySGGrant[]
}

function HousingGrantsSection({ gridCols, borrower2, grants = [] }: HousingGrantsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const safeGrants = grants ?? []
  const totalGrants = safeGrants.reduce((sum, g) => sum + parseFloat(g.amount || '0'), 0)
  const hasSecondBorrower = !!borrower2
  // Split 50/50 between borrowers, or full amount for single borrower
  const grantPerPerson = hasSecondBorrower ? totalGrants / 2 : totalGrants

  if (safeGrants.length === 0) {
    return (
      <div className={cn('grid', gridCols)}>
        <div className="p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Housing Grants</p>
        </div>
        <div className="p-3 text-right">
          <span className="text-sm text-gray-500 font-mono tabular-nums">$0</span>
        </div>
        {borrower2 && (
          <div className="p-3 text-right">
            <span className="text-sm text-gray-500 font-mono tabular-nums">$0</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn('grid w-full text-left hover:bg-white/[0.02] transition-colors', gridCols)}
      >
        <div className="p-3 flex items-center gap-1.5">
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
          )}
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Housing Grants ({safeGrants.length})
          </p>
          {hasSecondBorrower && (
            <span className="group relative">
              <Info className="h-3 w-3 text-gray-600 cursor-help" />
              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-gray-300 border border-white/10 z-10">
                Grants assumed split 50/50 between owners
              </span>
            </span>
          )}
        </div>
        <div className="p-3 text-right">
          <span className="text-sm text-white font-mono tabular-nums">
            {formatCurrency(grantPerPerson)}
          </span>
        </div>
        {borrower2 && (
          <div className="p-3 text-right">
            <span className="text-sm text-white font-mono tabular-nums">
              {formatCurrency(grantPerPerson)}
            </span>
          </div>
        )}
      </button>

      {isExpanded && (
        <div className="bg-white/[0.01]">
          {safeGrants.map((grant, index) => {
            const grantAmount = parseFloat(grant.amount || '0')
            const grantPerPersonAmount = hasSecondBorrower ? grantAmount / 2 : grantAmount
            return (
              <div key={grant.id || index} className={cn('grid', gridCols)}>
                <div className="px-3 py-2">
                  <span className="text-sm text-gray-400 pl-6">{grant.name}</span>
                </div>
                <div className="px-3 py-2 text-right">
                  <span className="text-sm text-gray-300 font-mono tabular-nums">
                    {formatCurrency(grantPerPersonAmount)}
                  </span>
                </div>
                {borrower2 && (
                  <div className="px-3 py-2 text-right">
                    <span className="text-sm text-gray-300 font-mono tabular-nums">
                      {formatCurrency(grantPerPersonAmount)}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================
// MONTHLY SECTION
// ============================================

interface MonthlySectionProps extends SectionBaseProps {
  holdingMonths: number
}

function MonthlySection({ gridCols, borrower1, borrower2, holdingMonths }: MonthlySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasSecondBorrower = !!borrower2

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn('grid w-full text-left hover:bg-white/[0.02] transition-colors', gridCols)}
      >
        <div className="p-3 flex items-center gap-1.5">
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
          )}
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Monthly ({holdingMonths} mo)
          </p>
        </div>
        <div className="p-3 text-right">
          <span className="text-sm text-white font-mono tabular-nums">
            {formatCurrency(borrower1.monthlyCpfOa * holdingMonths)}
          </span>
        </div>
        {hasSecondBorrower && borrower2 && (
          <div className="p-3 text-right">
            <span className="text-sm text-white font-mono tabular-nums">
              {formatCurrency(borrower2.monthlyCpfOa * holdingMonths)}
            </span>
          </div>
        )}
      </button>

      {isExpanded && (
        <div className="bg-white/[0.01]">
          <div className={cn('grid', gridCols)}>
            <div className="px-3 py-2">
              <span className="text-sm text-gray-400 pl-6">CPF OA rate</span>
            </div>
            <div className="px-3 py-2 text-right">
              <span className="text-sm text-gray-300 font-mono tabular-nums">
                {formatCurrency(borrower1.monthlyCpfOa)}/mo
              </span>
            </div>
            {hasSecondBorrower && borrower2 && (
              <div className="px-3 py-2 text-right">
                <span className="text-sm text-gray-300 font-mono tabular-nums">
                  {formatCurrency(borrower2.monthlyCpfOa)}/mo
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// TOTALS SECTION
// ============================================

function TotalsSection({ gridCols, borrower1, borrower2 }: SectionBaseProps) {
  const hasSecondBorrower = !!borrower2

  return (
    <div>
      <div className={cn('grid', gridCols)}>
        <div className="p-3">
          <span className="text-sm text-gray-300">Total CPF Used</span>
        </div>
        <div className="p-3 text-right">
          <span className="text-sm text-white font-mono tabular-nums">
            {formatCurrency(borrower1.totalCpfUsed)}
          </span>
        </div>
        {hasSecondBorrower && borrower2 && (
          <div className="p-3 text-right">
            <span className="text-sm text-white font-mono tabular-nums">
              {formatCurrency(borrower2.totalCpfUsed)}
            </span>
          </div>
        )}
      </div>
      <div className={cn('grid', gridCols)}>
        <div className="px-3 pb-3">
          <span className="text-sm text-amber-400">Accrued Interest</span>
        </div>
        <div className="px-3 pb-3 text-right">
          <span className="text-sm text-amber-400 font-mono tabular-nums">
            {formatCurrency(borrower1.accruedInterest)}
          </span>
        </div>
        {hasSecondBorrower && borrower2 && (
          <div className="px-3 pb-3 text-right">
            <span className="text-sm text-amber-400 font-mono tabular-nums">
              {formatCurrency(borrower2.accruedInterest)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// REFUND SECTION
// ============================================

function RefundSection({ gridCols, borrower1, borrower2 }: SectionBaseProps) {
  const hasSecondBorrower = !!borrower2

  return (
    <div className={cn('grid', gridCols)}>
      <div className="p-3">
        <span className="text-sm text-gray-300">Refund to OA upon sale</span>
      </div>
      <div className="p-3 text-right">
        <span className="text-sm text-white font-mono tabular-nums">
          {formatCurrency(borrower1.totalCpfUsed + borrower1.accruedInterest)}
        </span>
      </div>
      {hasSecondBorrower && borrower2 && (
        <div className="p-3 text-right">
          <span className="text-sm text-white font-mono tabular-nums">
            {formatCurrency(borrower2.totalCpfUsed + borrower2.accruedInterest)}
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * CPFPropertyContributionByPersonTable - Reusable tabular display of CPF usage by person
 * Used in both PropertyCPFDetail and CPFTabContent for consistency
 *
 * Housing grants are split 50/50 between joint owners (shown in each person's column)
 */
export function CPFPropertyContributionByPersonTable({
  title,
  borrower1,
  borrower2,
  holdingMonths,
  grants = [],
}: CPFUsageByPersonTableProps) {
  const hasSecondBorrower = !!borrower2

  // Grid columns: label | borrower1 | borrower2?
  const gridCols = hasSecondBorrower
    ? 'grid-cols-[1fr_120px_120px]'
    : 'grid-cols-[1fr_120px]'

  const sectionProps = { gridCols, borrower1, borrower2 }

  return (
      <>
      <TableHeader {...sectionProps} />
      <DownpaymentSection {...sectionProps} />
      <HousingGrantsSection {...sectionProps} grants={grants} />
      <MonthlySection {...sectionProps} holdingMonths={holdingMonths} />
      <TotalsSection {...sectionProps} />
      <RefundSection {...sectionProps} />
      </>
  )
}
