'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Shield, Loader2, MoreHorizontal, Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Eye, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Landmark, X, Filter } from 'lucide-react'
import { AddPolicyModal } from '../modals/AddPolicyModal'
import { PolicyDetailModal } from '../modals/PolicyDetailModal'
import { useColorScheme } from '@/stores'
import { getInsuranceTheme } from '@/lib/insurance-theme'
import {
  useInsurancePoliciesQuery,
  usePaginatedInsurancePoliciesQuery,
  useCreateInsurancePolicyMutation,
  useUpdateInsurancePolicyMutation,
  useDeleteInsurancePolicyMutation,
} from '@/hooks/queries/useInsurancePoliciesQuery'
import type { InsurancePolicyCreateInput, InsurancePolicyRecord } from '@/api/financial/insurance'
import { INSURANCE_TYPOGRAPHY as T } from '@/components/insurance/shared/insurance-typography'
import { usePersonsQuery } from '@/hooks/queries/usePersonsQuery'
import { calculateMediSaveSplit, getMediSavePayability, getCpfAccountLabel } from '@/lib/medisave-utils'
import type { Person } from '@/types/person'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Helpers
// ─────────────────────────────────────────────────────────────────────────────

const providerLabels: Record<string, string> = {
  aia: 'AIA',
  prudential: 'Prudential',
  ntuc: 'NTUC Income',
  great_eastern: 'Great Eastern',
  manulife: 'Manulife',
  aviva: 'Aviva (Singlife)',
  tokio_marine: 'Tokio Marine',
  fwd: 'FWD',
  cpf: 'CPF Board',
  other: 'Other',
}

const INSURER_COLORS = [
  '#E05A63', '#F04858', '#4A90D9', '#E8A64C', '#45B08C',
  '#9B6BB4', '#D97B4A', '#5A9BD4', '#C75C8A', '#6BB5A0',
]

function getInsurerColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return INSURER_COLORS[Math.abs(hash) % INSURER_COLORS.length]
}

function getInsurerAbbreviation(name: string | null): string {
  if (!name) return '—'
  const known: Record<string, string> = {
    'AIA': 'AIA', 'Prudential': 'PRU', 'NTUC Income': 'NTUC',
    'Great Eastern': 'GE', 'Manulife': 'MAN', 'Aviva (Singlife)': 'AVV',
    'Tokio Marine': 'TM', 'FWD': 'FWD', 'CPF Board': 'CPF',
  }
  if (known[name]) return known[name]
  return name.slice(0, 3).toUpperCase()
}

function formatAmount(amount: number): string {
  const rounded = Math.round(amount)
  if (rounded >= 1_000_000) return `$${(rounded / 1_000_000).toFixed(1)}M`
  return `$${rounded.toLocaleString('en-US')}`
}

function formatPremiumWithFrequency(amount: number, frequency: string): string {
  const formatted = formatAmount(amount)
  const suffix = frequency === 'monthly' ? '/mo' : frequency === 'quarterly' ? '/qtr' : '/yr'
  return `${formatted}${suffix}`
}

function annualizePremium(amount: number, frequency: string): number {
  if (frequency === 'monthly') return amount * 12
  if (frequency === 'quarterly') return amount * 4
  return amount
}

function formatCategoryLabel(category: string, subcategory: string | null): string {
  const labels: Record<string, string> = {
    life: 'Life, TPD',
    health: 'Hospitalization',
    critical_illness: 'Critical Illness',
    long_term_care: 'Long-Term Care',
    personal_accident: 'Personal Accident',
    hospitalization: 'Hospitalization',
    disability: 'Disability',
    accident: 'Personal Accident',
  }
  if (subcategory) {
    const subLabels: Record<string, string> = {
      term_life: 'Life, TPD',
      whole_life: 'Life, TPD',
      ilp: 'Life, ILP',
      isp: 'Hospitalization',
      medishield: 'Hospitalization',
      early_ci: 'Critical Illness, Early CI',
      late_ci: 'Critical Illness',
      multi_pay: 'Critical Illness',
      careshield: 'Long-Term Care',
      ltc_supplement: 'Long-Term Care',
      pa: 'Personal Accident',
    }
    if (subLabels[subcategory]) return subLabels[subcategory]
  }
  return labels[category] ?? category
}

function formatRenewalDate(startDate: string, endDate: string | null, renewalDate: string | null): string {
  const dateToFormat = renewalDate ?? endDate
  if (!dateToFormat) {
    const start = new Date(startDate)
    const renewal = new Date(start)
    renewal.setFullYear(renewal.getFullYear() + 1)
    return renewal.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  return new Date(dateToFormat).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function getWardClass(policy: InsurancePolicyRecord): string | null {
  if (policy.category !== 'health' && policy.category !== 'hospitalization') return null
  if (policy.notes) {
    try {
      const parsed = JSON.parse(policy.notes)
      if (parsed.wardClass) return parsed.wardClass
    } catch {
      /* fall through */
    }
  }
  return null
}

function formatWardClass(wardClass: string): string {
  return `Class ${wardClass}`
}

function formatSubtitle(policy: InsurancePolicyRecord): string {
  const parts: string[] = []
  if (policy.subcategory) {
    parts.push(
      policy.subcategory
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    )
  } else {
    parts.push(policy.category)
  }
  if (policy.policyNumber) parts.push(`#${policy.policyNumber}`)
  return parts.join(' \u00b7 ')
}

// ─────────────────────────────────────────────────────────────────────────────
// Column header style
// ─────────────────────────────────────────────────────────────────────────────

const columnHeaderClass = 'shrink-0 font-mono text-[9px] font-medium uppercase tracking-wider'

// ─────────────────────────────────────────────────────────────────────────────
// Sort types & sortable header
// ─────────────────────────────────────────────────────────────────────────────

type SortField = 'coverage' | 'sumAssured' | 'wardClass' | 'premium' | 'renewal' | 'startDate' | 'endDate' | 'status'
type SortDirection = 'asc' | 'desc'

interface SortState {
  field: SortField | null
  direction: SortDirection
}

function SortableColumnHeader({
  label,
  field,
  sortState,
  onSort,
  width,
  theme,
}: {
  label: string
  field: SortField
  sortState: SortState
  onSort: (field: SortField) => void
  width: string
  theme: ReturnType<typeof getInsuranceTheme>
}) {
  const isActive = sortState.field === field
  const SortIcon = isActive
    ? sortState.direction === 'asc' ? ArrowUp : ArrowDown
    : ArrowUpDown

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`${width} flex items-center gap-1 ${columnHeaderClass} transition-colors duration-150`}
      style={{ color: isActive ? theme.textSecondary : theme.textMuted }}
    >
      <span>{label}</span>
      <SortIcon className="h-2.5 w-2.5" style={{ opacity: isActive ? 1 : 0.4 }} />
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Annual Premium Breakdown Panel
// ─────────────────────────────────────────────────────────────────────────────

function AnnualPremiumBreakdownPanel({
  policies,
  persons,
  theme,
  onClose,
}: {
  policies: InsurancePolicyRecord[]
  persons: Person[]
  theme: ReturnType<typeof getInsuranceTheme>
  onClose: () => void
}) {
  const activePolicies = policies.filter((p) => p.isActive)

  // Group policies by person
  const personGroups = useMemo(() => {
    const groups: { person: Person | null; policies: InsurancePolicyRecord[]; age: number }[] = []
    const byPerson = new Map<string | null, InsurancePolicyRecord[]>()
    for (const policy of activePolicies) {
      const key = policy.personId
      if (!byPerson.has(key)) byPerson.set(key, [])
      byPerson.get(key)!.push(policy)
    }
    for (const [personId, personPolicies] of byPerson) {
      const person = personId ? persons.find((p) => p.id === personId) ?? null : null
      const age = person?.dateOfBirth
        ? Math.floor((Date.now() - new Date(person.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 30
      groups.push({ person, policies: personPolicies, age })
    }
    return groups
  }, [activePolicies, persons])

  if (activePolicies.length === 0) {
    return (
      <div
        className="rounded-sm p-6"
        style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className={T.cardLabel} style={{ color: theme.textMuted }}>
            ANNUAL PREMIUM BREAKDOWN
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors duration-150 hover:bg-white/[0.05]"
            style={{ color: theme.textMuted }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <p className={cn(T.bodyText, 'text-center py-6')} style={{ color: theme.textMuted }}>
          No active policies found
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-sm"
      style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
    >
      <div className="flex items-center justify-between p-6 pb-0">
        <span className={T.cardLabel} style={{ color: theme.textMuted }}>
          ANNUAL PREMIUM BREAKDOWN
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors duration-150 hover:bg-white/[0.05]"
          style={{ color: theme.textMuted }}
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {personGroups.map(({ person, policies: personPolicies, age }) => {
        const split = calculateMediSaveSplit(personPolicies, age)
        const awlPercent = split.awlLimit > 0
          ? Math.min(100, Math.round((split.awlUsed / split.awlLimit) * 100))
          : 0

        return (
          <div key={person?.id ?? 'unassigned'}>
            {/* Person label (only show if multiple groups) */}
            {personGroups.length > 1 && (
              <div className="px-6 pt-4 pb-1">
                <span className="text-xs font-medium" style={{ color: theme.textSecondary }}>
                  {person?.name ?? 'Unassigned'}
                </span>
              </div>
            )}

            <div className="mx-6 mt-3 mb-0 h-px" style={{ background: theme.cardBorder }} />

            {/* Header row */}
            <div className="flex items-center gap-3 px-6 py-2.5">
              <span className={cn(T.legendText, 'flex-1')} style={{ color: theme.textMuted }}>Policy</span>
              <span className={cn(T.legendText, 'w-16 text-right')} style={{ color: theme.textMuted }}>Annual</span>
              <span className={cn(T.legendText, 'w-16 text-center')} style={{ color: theme.textMuted }}>Source</span>
              <span className={cn(T.legendText, 'w-16 text-right')} style={{ color: theme.textMuted }}>MediSave</span>
              <span className={cn(T.legendText, 'w-16 text-right')} style={{ color: theme.textMuted }}>Cash</span>
            </div>

            {/* Policy rows */}
            <div className="px-6 pb-2">
              {split.breakdown.map((row) => {
                const badgeBg = row.payability === 'full'
                  ? 'rgba(34, 197, 94, 0.10)'
                  : row.payability === 'partial'
                    ? 'rgba(245, 158, 11, 0.10)'
                    : 'rgba(113, 113, 122, 0.10)'
                const badgeColor = row.payability === 'full'
                  ? '#22C55E'
                  : row.payability === 'partial'
                    ? '#F59E0B'
                    : theme.textMuted
                const badgeLabel = row.payability === 'full'
                  ? (() => {
                      const policy = personPolicies.find(p => p.id === row.policyId)
                      return getCpfAccountLabel(policy?.governmentScheme ?? null)
                    })()
                  : row.payability === 'partial'
                    ? 'Mixed'
                    : 'Cash'

                return (
                  <div
                    key={row.policyId}
                    className="flex items-center gap-3 py-2.5"
                    style={{ borderTop: `1px solid ${theme.cardBorder}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <span className={cn(T.bodyText, 'truncate block')} style={{ color: theme.textPrimary }}>
                        {row.policyName}
                      </span>
                    </div>
                    <span className={cn(T.bodyText, 'w-16 text-right font-mono tabular-nums')} style={{ color: theme.textPrimary }}>
                      {formatCurrency(row.annualPremium)}
                    </span>
                    <div className="w-16 flex justify-center">
                      <span
                        className="inline-flex items-center gap-0.5 rounded px-1.5 py-px text-[9px] font-semibold"
                        style={{ background: badgeBg, color: badgeColor }}
                      >
                        <Landmark className="h-2 w-2" />
                        {badgeLabel}
                      </span>
                    </div>
                    <span
                      className={cn(T.bodyText, 'w-16 text-right font-mono tabular-nums')}
                      style={{ color: row.medisavePortion > 0 ? '#22C55E' : theme.textMuted }}
                    >
                      {row.medisavePortion > 0 ? formatCurrency(row.medisavePortion) : '\u2014'}
                    </span>
                    <span
                      className={cn(T.bodyText, 'w-16 text-right font-mono tabular-nums')}
                      style={{ color: row.cashPortion > 0 ? theme.textPrimary : theme.textMuted }}
                    >
                      {row.cashPortion > 0 ? formatCurrency(row.cashPortion) : '\u2014'}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Totals divider */}
            <div className="mx-6 h-px" style={{ background: theme.cardBorder }} />

            {/* Totals row */}
            <div className="flex items-center gap-3 px-6 py-3">
              <span className={cn(T.bodyText, 'flex-1 font-semibold')} style={{ color: theme.textPrimary }}>
                Total
              </span>
              <span className={cn(T.bodyText, 'w-16 text-right font-mono tabular-nums font-semibold')} style={{ color: theme.textPrimary }}>
                {formatCurrency(split.totalAnnualPremium)}
              </span>
              <div className="w-16" />
              <span className={cn(T.bodyText, 'w-16 text-right font-mono tabular-nums font-semibold')} style={{ color: '#22C55E' }}>
                {split.medisavePayable > 0 ? formatCurrency(split.medisavePayable) : '\u2014'}
              </span>
              <span className={cn(T.bodyText, 'w-16 text-right font-mono tabular-nums font-semibold')} style={{ color: theme.textPrimary }}>
                {formatCurrency(split.cashPayable)}
              </span>
            </div>

            {/* AWL Usage Bar */}
            {split.awlLimit > 0 && (
              <div className="px-6 pb-5 pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={T.legendText} style={{ color: theme.textMuted }}>
                    MediSave AWL Usage
                  </span>
                  <span className={T.legendText} style={{ color: theme.textMuted }}>
                    {formatCurrency(split.awlUsed)} / {formatCurrency(split.awlLimit)}
                  </span>
                </div>
                <div
                  className="h-1.5 w-full rounded-full overflow-hidden"
                  style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${awlPercent}%`,
                      background: awlPercent >= 100 ? '#F59E0B' : '#22C55E',
                    }}
                  />
                </div>
                {split.awlRemaining > 0 && (
                  <span className={cn(T.legendText, 'mt-1 block')} style={{ color: theme.textMuted }}>
                    {formatCurrency(split.awlRemaining)} remaining
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary Cards
// ─────────────────────────────────────────────────────────────────────────────

function SummaryCards({
  policies,
  theme,
  onViewBreakdown,
  isBreakdownOpen,
}: {
  policies: InsurancePolicyRecord[]
  theme: ReturnType<typeof getInsuranceTheme>
  onViewBreakdown: () => void
  isBreakdownOpen: boolean
}) {
  const activePolicies = policies.filter((p) => p.isActive)
  const uniqueInsurers = new Set(activePolicies.map((p) => p.insurerName).filter(Boolean))
  const totalAnnualPremium = activePolicies.reduce(
    (sum, p) => sum + annualizePremium(p.premiumAmount, p.premiumFrequency),
    0
  )

  const now = new Date()
  let nearestRenewal: { date: string; policyName: string } | null = null
  for (const policy of activePolicies) {
    const renewalStr = policy.renewalDate ?? policy.endDate
    if (renewalStr) {
      const renewalDate = new Date(renewalStr)
      if (renewalDate > now && (!nearestRenewal || renewalDate < new Date(nearestRenewal.date))) {
        nearestRenewal = { date: renewalStr, policyName: policy.name }
      }
    }
  }

  const summaryItems = [
    {
      label: 'ACTIVE POLICIES',
      value: activePolicies.length.toString(),
      description:
        uniqueInsurers.size > 0
          ? `Across ${uniqueInsurers.size} insurer${uniqueInsurers.size === 1 ? '' : 's'}`
          : 'No active policies',
    },
    {
      label: 'ANNUAL PREMIUM',
      value: formatAmount(totalAnnualPremium),
      description:
        totalAnnualPremium > 0
          ? `${Math.round((totalAnnualPremium / 12) * 100) / 100 >= 1 ? formatAmount(Math.round(totalAnnualPremium / 12)) + '/mo avg' : 'No premiums'}`
          : 'No premiums',
      hasAction: true,
    },
    {
      label: 'NEXT RENEWAL',
      value: nearestRenewal
        ? new Date(nearestRenewal.date).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          })
        : 'N/A',
      description: nearestRenewal?.policyName ?? 'No upcoming renewals',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-5">
      {summaryItems.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1.5 p-5"
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
          }}
        >
          <span className={T.cardLabel} style={{ color: theme.textMuted }}>
            {item.label}
          </span>
          <span className="text-2xl font-semibold" style={{ color: theme.textPrimary }}>
            {item.value}
          </span>
          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: theme.textMuted }}>
              {item.description}
            </span>
            {item.hasAction && (
              <button
                type="button"
                onClick={onViewBreakdown}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-all duration-150 hover:bg-white/[0.05]"
                style={{ color: theme.textSecondary, border: `1px solid ${theme.cardBorder}` }}
              >
                {isBreakdownOpen ? <ChevronUp className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                {isBreakdownOpen ? 'Hide' : 'View'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Beneficiary Filter Dropdown (inline in table header)
// ─────────────────────────────────────────────────────────────────────────────

function BeneficiaryFilter({
  persons,
  selectedIds,
  onToggle,
  theme,
}: {
  persons: Person[]
  selectedIds: Set<string>
  onToggle: (personId: string) => void
  theme: ReturnType<typeof getInsuranceTheme>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropdownPos({ top: rect.bottom + 6, left: rect.left })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    updatePosition()

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, updatePosition])

  return (
    <div className="w-[90px] shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 ${columnHeaderClass}`}
        style={{ color: theme.textMuted }}
      >
        <span>Beneficiary</span>
        <ChevronDown
          className="h-2.5 w-2.5 transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-50 min-w-[220px] rounded-lg py-2 shadow-xl"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              background: '#111113',
              border: `1px solid ${theme.cardBorder}`,
            }}
          >
            {persons.map((person) => {
              const isSelected = selectedIds.has(person.id)
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => onToggle(person.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 transition-colors hover:bg-white/[0.04]"
                >
                  <div
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
                    style={{
                      background: isSelected ? '#F0F0F0' : 'transparent',
                      border: `1.5px solid ${isSelected ? '#F0F0F0' : '#52525B'}`,
                    }}
                  >
                    {isSelected && (
                      <Check className="h-2.5 w-2.5" style={{ color: '#111113' }} />
                    )}
                  </div>
                  <div
                    className="h-[22px] w-[22px] shrink-0 rounded-full"
                    style={{ backgroundColor: person.displayColor || '#64748b' }}
                  />
                  <div className="flex flex-col gap-px text-left">
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: theme.textPrimary }}
                    >
                      {person.name}
                    </span>
                    {person.relationship && (
                      <span className="text-[10px]" style={{ color: theme.textMuted }}>
                        {person.relationship === 'self'
                          ? 'You'
                          : person.relationship.charAt(0).toUpperCase() +
                            person.relationship.slice(1)}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}

            {persons.length === 0 && (
              <div
                className="px-3 py-3 text-center text-xs"
                style={{ color: theme.textMuted }}
              >
                No persons added yet
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coverage Column Filter (multi-checkbox dropdown on column header)
// ─────────────────────────────────────────────────────────────────────────────

const COVERAGE_CATEGORIES = [
  { value: 'life', label: 'Life / TPD' },
  { value: 'hospitalization', label: 'Hospitalization' },
  { value: 'critical_illness', label: 'Critical Illness' },
  { value: 'disability', label: 'Disability' },
  { value: 'accident', label: 'Personal Accident' },
  { value: 'custom', label: 'Custom' },
] as const

function CoverageColumnFilter({
  selectedCategories,
  onToggle,
  sortState,
  onSort,
  theme,
}: {
  selectedCategories: Set<string>
  onToggle: (category: string) => void
  sortState: SortState
  onSort: (field: SortField) => void
  theme: ReturnType<typeof getInsuranceTheme>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropdownPos({ top: rect.bottom + 6, left: rect.left })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    updatePosition()

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, updatePosition])

  const isSortActive = sortState.field === 'coverage'
  const SortIcon = isSortActive
    ? sortState.direction === 'asc' ? ArrowUp : ArrowDown
    : ArrowUpDown
  const hasFilter = selectedCategories.size > 0

  return (
    <div className="w-[110px] shrink-0">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSort('coverage')}
          className={`flex items-center gap-1 ${columnHeaderClass} transition-colors duration-150`}
          style={{ color: isSortActive ? theme.textSecondary : theme.textMuted }}
        >
          <span>Coverage</span>
          <SortIcon className="h-2.5 w-2.5" style={{ opacity: isSortActive ? 1 : 0.4 }} />
        </button>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center transition-colors"
        >
          <Filter
            className="h-2.5 w-2.5"
            style={{ color: hasFilter ? theme.textPrimary : theme.textMuted, opacity: hasFilter ? 1 : 0.5 }}
          />
        </button>
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-50 min-w-[200px] rounded-lg py-2 shadow-xl"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              background: '#111113',
              border: `1px solid ${theme.cardBorder}`,
            }}
          >
            {COVERAGE_CATEGORIES.map((cat) => {
              const isSelected = selectedCategories.has(cat.value)
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => onToggle(cat.value)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 transition-colors hover:bg-white/[0.04]"
                >
                  <div
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
                    style={{
                      background: isSelected ? '#F0F0F0' : 'transparent',
                      border: `1.5px solid ${isSelected ? '#F0F0F0' : '#52525B'}`,
                    }}
                  >
                    {isSelected && (
                      <Check className="h-2.5 w-2.5" style={{ color: '#111113' }} />
                    )}
                  </div>
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: theme.textPrimary }}
                  >
                    {cat.label}
                  </span>
                </button>
              )
            })}

            {selectedCategories.size > 0 && (
              <>
                <div className="my-1 h-px w-full" style={{ background: 'rgba(255, 255, 255, 0.06)' }} />
                <button
                  type="button"
                  onClick={() => {
                    selectedCategories.forEach((cat) => onToggle(cat))
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[10px] transition-colors hover:bg-white/[0.04]"
                  style={{ color: theme.textMuted }}
                >
                  Clear all
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Type Helper
// ─────────────────────────────────────────────────────────────────────────────

function getPaymentBadge(policy: InsurancePolicyRecord): { label: string; color: string; bg: string } {
  const payability = getMediSavePayability(policy)
  if (payability === 'full') return { label: 'MediSave', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.08)' }
  if (payability === 'partial') return { label: 'Mixed', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)' }
  return { label: 'Cash', color: '#A1A1AA', bg: 'rgba(255, 255, 255, 0.06)' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Policy Table
// ─────────────────────────────────────────────────────────────────────────────

function PolicyTable({
  policies,
  persons,
  selectedPersonIds,
  onTogglePerson,
  selectedCategories,
  onToggleCategory,
  personColorMap,
  sortState,
  onSort,
  theme,
  onEdit,
  onDelete,
  onViewPolicy,
}: {
  policies: InsurancePolicyRecord[]
  persons: Person[]
  selectedPersonIds: Set<string>
  onTogglePerson: (id: string) => void
  selectedCategories: Set<string>
  onToggleCategory: (category: string) => void
  personColorMap: Record<string, string>
  sortState: SortState
  onSort: (field: SortField) => void
  theme: ReturnType<typeof getInsuranceTheme>
  onEdit: (policy: InsurancePolicyRecord) => void
  onDelete: (id: string) => void
  onViewPolicy: (policy: InsurancePolicyRecord) => void
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  return (
    <div
      className="overflow-hidden rounded-sm"
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
      }}
    >
      {/* ── Table Header ── */}
      <div
        className="flex items-center gap-3 px-5 py-2.5"
        style={{ borderBottom: `1px solid ${theme.cardBorder}` }}
      >
        <span className={`w-[200px] ${columnHeaderClass}`} style={{ color: theme.textMuted }}>
          Policy
        </span>

        <BeneficiaryFilter
          persons={persons}
          selectedIds={selectedPersonIds}
          onToggle={onTogglePerson}
          theme={theme}
        />

        <CoverageColumnFilter
          selectedCategories={selectedCategories}
          onToggle={onToggleCategory}
          sortState={sortState}
          onSort={onSort}
          theme={theme}
        />
        <SortableColumnHeader label="Sum Assured" field="sumAssured" sortState={sortState} onSort={onSort} width="w-[90px]" theme={theme} />
        <SortableColumnHeader label="Ward Class" field="wardClass" sortState={sortState} onSort={onSort} width="w-[65px]" theme={theme} />
        <SortableColumnHeader label="Premium" field="premium" sortState={sortState} onSort={onSort} width="w-[75px]" theme={theme} />
        <span className={`w-[70px] ${columnHeaderClass}`} style={{ color: theme.textMuted }}>Payment</span>
        <SortableColumnHeader label="Renewal" field="renewal" sortState={sortState} onSort={onSort} width="w-[75px]" theme={theme} />
        <SortableColumnHeader label="Start Date" field="startDate" sortState={sortState} onSort={onSort} width="w-[75px]" theme={theme} />
        <SortableColumnHeader label="End Date" field="endDate" sortState={sortState} onSort={onSort} width="w-[75px]" theme={theme} />
        <SortableColumnHeader label="Status" field="status" sortState={sortState} onSort={onSort} width="w-[55px]" theme={theme} />
        <div className="flex-1" />
      </div>

      {/* ── Policy Rows ── */}
      {policies.map((policy, index) => {
        const insurerName = policy.insurerName ?? 'Unknown'
        const insurerAbbr = getInsurerAbbreviation(policy.insurerName)
        const insurerColor = getInsurerColor(insurerName)
        const categoryLabel = formatCategoryLabel(policy.category, policy.subcategory)
        const renewalDate = formatRenewalDate(policy.startDate, policy.endDate, policy.renewalDate)
        const personColor = policy.personId ? personColorMap[policy.personId] : '#64748b'
        const personName = policy.personName
        const personFirstName = personName?.split(' ')[0] ?? ''
        const isLastRow = index === policies.length - 1
        const isMenuOpen = openMenuId === policy.id
        const subtitle = formatSubtitle(policy)
        const wardClass = getWardClass(policy)

        return (
          <div
            key={policy.id}
            className="flex items-center gap-3 px-5 py-3"
            style={{
              borderBottom: isLastRow ? 'none' : `1px solid ${theme.cardBorder}`,
            }}
          >
            {/* Policy name + insurer logo */}
            <div className="flex w-[200px] shrink-0 items-center gap-2.5">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                style={{
                  background: theme.surfaceBg,
                  border: `1px solid ${theme.cardBorder}`,
                }}
              >
                <span className="text-[8px] font-bold" style={{ color: insurerColor }}>
                  {insurerAbbr}
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-px">
                <button
                  type="button"
                  onClick={() => onViewPolicy(policy)}
                  className="truncate text-left text-[13px] font-medium hover:underline cursor-pointer transition-all duration-150"
                  style={{ color: theme.textPrimary }}
                >
                  {policy.name}
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[10px]" style={{ color: theme.textMuted }}>
                    {subtitle}
                  </span>
                  {(() => {
                    const payability = getMediSavePayability(policy)
                    if (payability === 'none') return null
                    const isFull = payability === 'full'
                    const label = isFull
                      ? getCpfAccountLabel(policy.governmentScheme ?? null)
                      : 'MediSave/Cash'
                    const badgeBg = isFull ? 'rgba(34, 197, 94, 0.10)' : 'rgba(245, 158, 11, 0.10)'
                    const badgeColor = isFull ? '#22C55E' : '#F59E0B'
                    return (
                      <span
                        className="inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-px text-[8px] font-semibold"
                        style={{ background: badgeBg, color: badgeColor }}
                      >
                        <Landmark className="h-2 w-2" />
                        {label}
                      </span>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* Beneficiary */}
            <div className="flex w-[90px] shrink-0 items-center gap-1.5">
              {personName ? (
                <>
                  <div
                    className="h-5 w-5 shrink-0 rounded-full"
                    style={{ backgroundColor: personColor }}
                  />
                  <span
                    className="truncate text-[11px]"
                    style={{ color: theme.textSecondary }}
                  >
                    {personFirstName}
                  </span>
                </>
              ) : (
                <span className="text-[11px]" style={{ color: theme.textMuted }}>
                  —
                </span>
              )}
            </div>

            {/* Coverage */}
            <span
              className="w-[110px] shrink-0 text-xs"
              style={{ color: theme.textSecondary }}
            >
              {categoryLabel}
            </span>

            {/* Sum Assured */}
            <span
              className="w-[90px] shrink-0 text-xs font-medium"
              style={{ color: theme.textPrimary }}
            >
              {formatAmount(policy.coverageAmount)}
            </span>

            {/* Ward Class */}
            <span
              className="w-[65px] shrink-0 text-xs"
              style={{ color: wardClass ? theme.textSecondary : theme.textMuted }}
            >
              {wardClass ? formatWardClass(wardClass) : '—'}
            </span>

            {/* Premium */}
            <span
              className="w-[75px] shrink-0 text-xs font-medium"
              style={{ color: theme.textPrimary }}
            >
              {formatPremiumWithFrequency(policy.premiumAmount, policy.premiumFrequency)}
            </span>

            {/* Payment Type */}
            {(() => {
              const badge = getPaymentBadge(policy)
              return (
                <div className="w-[70px] shrink-0">
                  <span
                    className="inline-flex rounded px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {badge.label}
                  </span>
                </div>
              )
            })()}

            {/* Renewal */}
            <span
              className="w-[75px] shrink-0 text-xs"
              style={{ color: theme.textSecondary }}
            >
              {renewalDate}
            </span>

            {/* Start Date */}
            <span
              className="w-[75px] shrink-0 text-xs"
              style={{ color: theme.textSecondary }}
            >
              {new Date(policy.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>

            {/* End Date */}
            <span
              className="w-[75px] shrink-0 text-xs"
              style={{ color: policy.endDate ? theme.textSecondary : theme.textMuted }}
            >
              {policy.endDate
                ? new Date(policy.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : '—'}
            </span>

            {/* Status badge */}
            <div className="w-[55px] shrink-0">
              {policy.isActive && (
                <div
                  className="flex justify-center rounded px-2 py-0.5"
                  style={{ background: 'rgba(34, 197, 94, 0.08)' }}
                >
                  <span className="text-[10px] font-semibold" style={{ color: '#22C55E' }}>
                    Active
                  </span>
                </div>
              )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Actions menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenuId(isMenuOpen ? null : policy.id)}
                className="flex h-7 w-[30px] items-center justify-center rounded-md transition-colors"
                style={{ border: `1px solid ${theme.cardBorder}` }}
              >
                <MoreHorizontal
                  className="h-3.5 w-3.5"
                  style={{ color: theme.textSecondary }}
                />
              </button>
              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setOpenMenuId(null)}
                  />
                  <div
                    className="absolute right-0 top-full z-20 mt-1 w-[180px] rounded-lg py-1.5 shadow-xl"
                    style={{
                      background: '#111113',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onViewPolicy(policy)
                        setOpenMenuId(null)
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-white/[0.04]"
                      style={{ color: theme.textPrimary }}
                    >
                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                      View Policy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onEdit(policy)
                        setOpenMenuId(null)
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-white/[0.04]"
                      style={{ color: theme.textPrimary }}
                    >
                      <Pencil className="h-3.5 w-3.5 text-slate-500" />
                      Edit Policy
                    </button>
                    <div
                      className="my-1 h-px w-full"
                      style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(policy.id)
                        setOpenMenuId(null)
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-red-500/10"
                      style={{ color: '#F04858' }}
                    >
                      <Trash2 className="h-3.5 w-3.5" style={{ color: '#F04858' }} />
                      Delete Policy
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })}

      {/* Empty state inside table */}
      {policies.length === 0 && (
        <div className="py-8 text-center text-sm" style={{ color: theme.textMuted }}>
          No policies match the selected filter
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

// Maps frontend SortField names to backend API sortBy values
const SORT_FIELD_MAP: Record<SortField, string> = {
  coverage: 'category',
  sumAssured: 'coverageAmount',
  wardClass: 'subcategory',
  premium: 'annualPremium',
  renewal: 'renewalDate',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'isActive',
}

export function PoliciesTab({ addPolicyTrigger = 0 }: { addPolicyTrigger?: number }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Open modal when parent triggers "Add Policy" from the header
  useEffect(() => {
    if (addPolicyTrigger > 0) setIsModalOpen(true)
  }, [addPolicyTrigger])
  const [editingPolicy, setEditingPolicy] = useState<InsurancePolicyRecord | null>(null)
  const [viewingPolicy, setViewingPolicy] = useState<InsurancePolicyRecord | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [sortState, setSortState] = useState<SortState>({ field: null, direction: 'asc' })
  const colorScheme = useColorScheme()
  const theme = getInsuranceTheme(colorScheme)
  const isMonet = colorScheme === 'monet'

  const handleSort = useCallback((field: SortField) => {
    setSortState((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { field, direction: 'asc' }
    })
    setCurrentPage(0)
  }, [])

  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string>>(new Set())
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())

  const selectedPersonIdsArray = useMemo(
    () => (selectedPersonIds.size > 0 ? Array.from(selectedPersonIds) : undefined),
    [selectedPersonIds]
  )

  const selectedCategoriesArray = useMemo(
    () => (selectedCategories.size > 0 ? Array.from(selectedCategories) : undefined),
    [selectedCategories]
  )

  const paginationOffset = currentPage * PAGE_SIZE
  const { data: paginatedResult, isLoading } = usePaginatedInsurancePoliciesQuery({
    limit: PAGE_SIZE,
    offset: paginationOffset,
    sortBy: sortState.field ? SORT_FIELD_MAP[sortState.field] : undefined,
    sortDir: sortState.field ? sortState.direction : undefined,
    personIds: selectedPersonIdsArray,
    categories: selectedCategoriesArray,
  })
  const policies = paginatedResult?.data ?? []
  const totalPolicies = paginatedResult?.total ?? 0
  const totalPages = Math.ceil(totalPolicies / PAGE_SIZE)

  const createMutation = useCreateInsurancePolicyMutation()
  const updateMutation = useUpdateInsurancePolicyMutation()
  const deleteMutation = useDeleteInsurancePolicyMutation()

  // All policies (non-paginated) for premium breakdown — only fetched when panel is open
  const { data: allPolicies } = useInsurancePoliciesQuery({ enabled: showBreakdown })

  const { data: personsData } = usePersonsQuery()
  const persons = useMemo(() => personsData ?? [], [personsData])

  const personColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const person of persons) {
      map[person.id] = person.displayColor || '#64748b'
    }
    return map
  }, [persons])

  const handleTogglePerson = (personId: string) => {
    setSelectedPersonIds((prev) => {
      const next = new Set(prev)
      if (next.has(personId)) next.delete(personId)
      else next.add(personId)
      return next
    })
    setCurrentPage(0)
  }

  const handleToggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
    setCurrentPage(0)
  }


  const handleEdit = (policy: InsurancePolicyRecord) => {
    setEditingPolicy(policy)
    setIsModalOpen(true)
  }

  const handleSave = (formData: {
    editingId?: string
    category: string
    type: string
    provider: string
    policyName: string
    sumAssured: number
    premiumAmount: number
    premiumFrequency: 'monthly' | 'annually'
    startDate: string
    endDate: string
    deathBenefit?: number
    tpdBenefit?: number
    criticalIllnessRider?: boolean
    wardClass?: string
    annualLimit?: number
    ispRider?: boolean
    deductible?: string
    criticalIllnessBenefit?: number
    earlyCiCoverage?: boolean
    multiPayCoverage?: boolean
    governmentScheme?: string
    payoutAmount?: number
    payoutFrequency?: string
    dailyHospitalCash?: boolean
    medicalExpenses?: number
    notes: string
  }) => {
    const structuredNotes: Record<string, unknown> = {}
    if (formData.wardClass) structuredNotes.wardClass = formData.wardClass
    if (formData.annualLimit) structuredNotes.annualLimit = formData.annualLimit
    if (formData.ispRider !== undefined) structuredNotes.ispRider = formData.ispRider
    if (formData.deductible) structuredNotes.deductible = formData.deductible
    if (formData.earlyCiCoverage !== undefined)
      structuredNotes.earlyCiCoverage = formData.earlyCiCoverage
    if (formData.multiPayCoverage !== undefined)
      structuredNotes.multiPayCoverage = formData.multiPayCoverage
    if (formData.medicalExpenses) structuredNotes.medicalExpenses = formData.medicalExpenses

    const hasStructuredNotes = Object.keys(structuredNotes).length > 0
    const notesPayload = hasStructuredNotes
      ? JSON.stringify({ ...structuredNotes, userNotes: formData.notes || undefined })
      : formData.notes || undefined

    const payload: InsurancePolicyCreateInput = {
      name:
        formData.policyName ||
        `${formData.type
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())} Policy`,
      category: formData.category,
      subcategory: formData.type,
      coverageAmount: formData.sumAssured.toString(),
      premiumAmount: formData.premiumAmount.toString(),
      premiumFrequency: formData.premiumFrequency,
      startDate: formData.startDate || new Date().toISOString().split('T')[0],
      endDate: formData.endDate || undefined,
      insurerName: providerLabels[formData.provider] ?? formData.provider,
      deathBenefit: formData.deathBenefit?.toString(),
      tpdBenefit: formData.tpdBenefit?.toString(),
      criticalIllnessBenefit: formData.criticalIllnessBenefit?.toString(),
      dailyHospitalCash: formData.dailyHospitalCash ? '100' : undefined,
      governmentScheme: formData.governmentScheme,
      payoutAmount: formData.payoutAmount?.toString(),
      payoutFrequency: formData.payoutFrequency,
      notes: notesPayload,
    }
    if (formData.editingId) {
      updateMutation.mutate({ id: formData.editingId, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const hasPolicies = totalPolicies > 0

  // Pagination display values
  const rangeStart = totalPolicies > 0 ? paginationOffset + 1 : 0
  const rangeEnd = Math.min(paginationOffset + PAGE_SIZE, totalPolicies)
  const isFirstPage = currentPage === 0
  const isLastPage = currentPage >= totalPages - 1

  return (
    <div className="space-y-6 p-8">
      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: theme.textMuted }} />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !hasPolicies && (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-16 backdrop-blur-sm"
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
          }}
        >
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{
              background: theme.surfaceBg,
              border: `1px solid ${theme.cardBorder}`,
            }}
          >
            <Shield className="h-10 w-10" style={{ color: theme.textMuted }} />
          </div>
          <h3
            className="mt-5 text-sm font-semibold"
            style={{
              color: theme.textPrimary,
              fontFamily: isMonet ? "'Cormorant Garamond', Georgia, serif" : 'inherit',
            }}
          >
            No policies yet
          </h3>
          <p
            className="mt-2 max-w-xs text-center text-sm"
            style={{ color: theme.textSecondary }}
          >
            Add your insurance policies to track coverage and analyze gaps in your protection
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-6 flex items-center gap-2 rounded px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:brightness-110"
            style={{ background: '#C53D43' }}
          >
            <Plus className="h-4 w-4" />
            Add Your First Policy
          </button>
        </div>
      )}

      {/* Summary Cards + Policy Table */}
      {!isLoading && hasPolicies && (
        <>
          <SummaryCards
            policies={policies}
            theme={theme}
            onViewBreakdown={() => setShowBreakdown((prev) => !prev)}
            isBreakdownOpen={showBreakdown}
          />

          {showBreakdown && allPolicies && (
            <AnnualPremiumBreakdownPanel
              policies={allPolicies}
              persons={persons}
              theme={theme}
              onClose={() => setShowBreakdown(false)}
            />
          )}

          <PolicyTable
            policies={policies}
            persons={persons}
            selectedPersonIds={selectedPersonIds}
            onTogglePerson={handleTogglePerson}
            selectedCategories={selectedCategories}
            onToggleCategory={handleToggleCategory}
            personColorMap={personColorMap}
            sortState={sortState}
            onSort={handleSort}
            theme={theme}
            onEdit={handleEdit}
            onDelete={(id) => deleteMutation.mutate(id)}
            onViewPolicy={(policy) => setViewingPolicy(policy)}
          />

          {/* Pagination Controls — always visible */}
          <div
            className="flex items-center justify-between rounded-sm px-5 py-3"
            style={{
              background: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
            }}
          >
            <span className="text-xs" style={{ color: theme.textMuted }}>
              {totalPolicies === 0
                ? 'No policies'
                : `Showing ${rangeStart}–${rangeEnd} of ${totalPolicies} ${totalPolicies === 1 ? 'policy' : 'policies'}`}
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isFirstPage}
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                className="flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  color: theme.textSecondary,
                  border: `1px solid ${theme.cardBorder}`,
                  background: theme.surfaceBg,
                }}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>

              <span className="text-xs font-medium" style={{ color: theme.textSecondary }}>
                Page {currentPage + 1} of {Math.max(1, totalPages)}
              </span>

              <button
                type="button"
                disabled={isLastPage || totalPages <= 1}
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                className="flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  color: theme.textSecondary,
                  border: `1px solid ${theme.cardBorder}`,
                  background: theme.surfaceBg,
                }}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </>
      )}

      <AddPolicyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingPolicy(null)
        }}
        onSave={handleSave}
        editingPolicy={editingPolicy}
      />

      <PolicyDetailModal
        isOpen={viewingPolicy !== null}
        onClose={() => setViewingPolicy(null)}
        policy={viewingPolicy}
        personColor={viewingPolicy?.personId ? personColorMap[viewingPolicy.personId] : undefined}
        onEdit={(policy) => {
          setViewingPolicy(null)
          handleEdit(policy)
        }}
        onDelete={(policy) => {
          setViewingPolicy(null)
          deleteMutation.mutate(policy.id)
        }}
      />
    </div>
  )
}
