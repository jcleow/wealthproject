'use client'

import { useMemo } from 'react'
import { Home, Building2, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import type { PropertyScenarioFull } from '@/types/propertyPlannerV2'
import type { CPFAccount } from '@/types/cpf'

interface CPFPropertyCardProps {
  scenario: PropertyScenarioFull
  cpfAccounts: CPFAccount[]
  isDraft?: boolean
  onViewDetails?: () => void
}

// Property type badge colors
const PROPERTY_TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  hdb: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  private: { bg: 'bg-violet-500/15', text: 'text-violet-400' },
  ec: { bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
}

// Property subtype labels
const SUBTYPE_LABELS: Record<string, string> = {
  bto: 'BTO',
  resale: 'Resale',
  ec: 'EC',
  new: 'New Launch',
}

export function CPFPropertyCard({ scenario, cpfAccounts, isDraft = false, onViewDetails }: CPFPropertyCardProps) {
  const sg = scenario.propertySG
  if (!sg) return null

  // Build CPF account lookup map
  const accountMap = useMemo(
    () => new Map(cpfAccounts.map(a => [a.id, a])),
    [cpfAccounts]
  )

  // Calculate per-borrower CPF usage
  const holdingMonths = 60 // TODO: Calculate from actual dates

  const borrower1 = useMemo(() => {
    if (!sg.borrower1CpfAccountId) return null
    const account = accountMap.get(sg.borrower1CpfAccountId)
    const downpayment = parseFloat(sg.borrower1DownpaymentCpfOa || '0')
    const monthly = parseFloat(sg.borrower1MonthlyCpfOa || '0')
    const total = downpayment + (monthly * holdingMonths)
    return {
      name: account?.personName || 'Borrower 1',
      cpfUsed: total,
    }
  }, [sg, accountMap, holdingMonths])

  const borrower2 = useMemo(() => {
    if (sg.borrowerType !== 'joint' || !sg.borrower2CpfAccountId) return null
    const account = accountMap.get(sg.borrower2CpfAccountId)
    const downpayment = parseFloat(sg.borrower2DownpaymentCpfOa || '0')
    const monthly = parseFloat(sg.borrower2MonthlyCpfOa || '0')
    const total = downpayment + (monthly * holdingMonths)
    return {
      name: account?.personName || 'Borrower 2',
      cpfUsed: total,
    }
  }, [sg, accountMap, holdingMonths])

  // Total CPF used
  const totalCpfUsed = (borrower1?.cpfUsed || 0) + (borrower2?.cpfUsed || 0)

  // Simplified accrued interest (2.5% p.a. simple for display)
  const accruedInterest = totalCpfUsed * 0.025 * (holdingMonths / 12)

  // Total grants
  const totalGrants = scenario.grants?.reduce((sum, g) => sum + parseFloat(g.amount || '0'), 0) || 0
  const grantNames = scenario.grants?.map(g => g.name).filter(Boolean).join(' + ') || '-'

  // Must refund at sale
  const mustRefund = totalCpfUsed + accruedInterest

  // Property type styling
  const typeStyle = PROPERTY_TYPE_STYLES[sg.propertyType] || PROPERTY_TYPE_STYLES.private
  const subtypeLabel = SUBTYPE_LABELS[sg.propertySubtype] || sg.propertySubtype

  // Property icon
  const PropertyIcon = sg.propertyType === 'hdb' ? Home : Building2

  return (
    <div
      className={`
        rounded-xl border p-4 transition-all duration-200
        ${isDraft
          ? 'border-amber-500/20 bg-amber-500/[0.02] hover:bg-amber-500/[0.04]'
          : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isDraft ? 'bg-amber-500/15' : 'bg-slate-700/50'}`}>
            <PropertyIcon className={`h-5 w-5 ${isDraft ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">{sg.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${typeStyle.bg} ${typeStyle.text}`}>
                {sg.propertyType}
              </span>
              <span className="text-xs text-slate-500">{subtypeLabel}</span>
              {isDraft && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-400">
                  Draft
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onViewDetails}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.05] transition"
        >
          View Details
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* CPF Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* CPF Used */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">CPF Used</p>
          <p className="text-base font-semibold text-white font-mono tabular-nums">
            {formatCurrency(totalCpfUsed)}
          </p>
          <div className="mt-1 space-y-0.5">
            {borrower1 && (
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-slate-600">▪</span>
                <span className="text-slate-500">{borrower1.name}:</span>
                <span className="text-slate-400 font-mono tabular-nums">{formatCurrency(borrower1.cpfUsed)}</span>
              </div>
            )}
            {borrower2 && (
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-slate-600">▪</span>
                <span className="text-slate-500">{borrower2.name}:</span>
                <span className="text-slate-400 font-mono tabular-nums">{formatCurrency(borrower2.cpfUsed)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Accrued Interest */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Accrued Interest</p>
          <p className="text-base font-semibold text-amber-400 font-mono tabular-nums">
            {formatCurrency(accruedInterest)}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">(2.5% p.a.)</p>
        </div>

        {/* Grants */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Grants</p>
          <p className="text-base font-semibold text-emerald-400 font-mono tabular-nums">
            {totalGrants > 0 ? formatCurrency(totalGrants) : '-'}
          </p>
          {totalGrants > 0 && (
            <p className="mt-1 text-[10px] text-slate-500 truncate">{grantNames}</p>
          )}
          {totalGrants === 0 && sg.propertyType === 'private' && (
            <p className="mt-1 text-[10px] text-slate-600">(Private - no HDB grants)</p>
          )}
        </div>
      </div>

      {/* Footer - Must Refund */}
      <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
        <span className="text-xs text-slate-500">Must refund at sale:</span>
        <span className="text-sm font-medium text-white font-mono tabular-nums">
          {formatCurrency(mustRefund)}
        </span>
      </div>
    </div>
  )
}
