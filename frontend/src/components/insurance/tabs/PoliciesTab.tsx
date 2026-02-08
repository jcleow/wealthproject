'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Shield, Loader2, MoreHorizontal, Check, ChevronDown } from 'lucide-react'
import { AddPolicyModal } from '../modals/AddPolicyModal'
import { useColorScheme } from '@/stores'
import { getInsuranceTheme } from '@/lib/insurance-theme'
import {
  useInsurancePoliciesQuery,
  useCreateInsurancePolicyMutation,
  useUpdateInsurancePolicyMutation,
  useDeleteInsurancePolicyMutation,
} from '@/hooks/queries/useInsurancePoliciesQuery'
import type { InsurancePolicyCreateInput, InsurancePolicyRecord } from '@/api/financial/insurance'
import { INSURANCE_TYPOGRAPHY as T } from '@/components/insurance/shared/insurance-typography'
import { usePersonsQuery } from '@/hooks/queries/usePersonsQuery'
import type { Person } from '@/types/person'

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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatSumOrClass(policy: InsurancePolicyRecord): string {
  if (policy.category === 'health' || policy.category === 'hospitalization') {
    if (policy.notes) {
      try {
        const parsed = JSON.parse(policy.notes)
        if (parsed.wardClass) return `Class ${parsed.wardClass}`
      } catch {
        /* fall through to default */
      }
    }
  }
  return formatAmount(policy.coverageAmount)
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
// Summary Cards
// ─────────────────────────────────────────────────────────────────────────────

function SummaryCards({
  policies,
  theme,
}: {
  policies: InsurancePolicyRecord[]
  theme: ReturnType<typeof getInsuranceTheme>
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
          <span className="text-[11px]" style={{ color: theme.textMuted }}>
            {item.description}
          </span>
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
    <div className="w-[100px] shrink-0">
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
              backdropFilter: 'blur(16px)',
            }}
          >
            {persons.map((person) => {
              const isSelected = selectedIds.has(person.id)
              const initials = getInitials(person.name)
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
                    className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: person.displayColor || '#64748b' }}
                  >
                    <span className="text-[8px] font-semibold text-white">{initials}</span>
                  </div>
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
// Policy Table
// ─────────────────────────────────────────────────────────────────────────────

function PolicyTable({
  policies,
  persons,
  selectedPersonIds,
  onTogglePerson,
  personColorMap,
  theme,
  onEdit,
  onDelete,
}: {
  policies: InsurancePolicyRecord[]
  persons: Person[]
  selectedPersonIds: Set<string>
  onTogglePerson: (id: string) => void
  personColorMap: Record<string, string>
  theme: ReturnType<typeof getInsuranceTheme>
  onEdit: (policy: InsurancePolicyRecord) => void
  onDelete: (id: string) => void
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
        <span className={`w-[220px] ${columnHeaderClass}`} style={{ color: theme.textMuted }}>
          Policy
        </span>

        <BeneficiaryFilter
          persons={persons}
          selectedIds={selectedPersonIds}
          onToggle={onTogglePerson}
          theme={theme}
        />

        <span className={`w-[110px] ${columnHeaderClass}`} style={{ color: theme.textMuted }}>
          Coverage
        </span>
        <span className={`w-[100px] ${columnHeaderClass}`} style={{ color: theme.textMuted }}>
          Sum / Class
        </span>
        <span className={`w-[85px] ${columnHeaderClass}`} style={{ color: theme.textMuted }}>
          Premium
        </span>
        <span className={`w-[80px] ${columnHeaderClass}`} style={{ color: theme.textMuted }}>
          Renewal
        </span>
        <span className={`w-[60px] ${columnHeaderClass}`} style={{ color: theme.textMuted }}>
          Status
        </span>
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
        const personInitials = personName ? getInitials(personName) : ''
        const personFirstName = personName?.split(' ')[0] ?? ''
        const isLastRow = index === policies.length - 1
        const isMenuOpen = openMenuId === policy.id
        const subtitle = formatSubtitle(policy)

        return (
          <div
            key={policy.id}
            className="flex items-center gap-3 px-5 py-3"
            style={{
              borderBottom: isLastRow ? 'none' : `1px solid ${theme.cardBorder}`,
            }}
          >
            {/* Policy name + insurer logo */}
            <div className="flex w-[220px] shrink-0 items-center gap-2.5">
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
                <span
                  className="truncate text-[13px] font-medium"
                  style={{ color: theme.textPrimary }}
                >
                  {policy.name}
                </span>
                <span className="truncate text-[10px]" style={{ color: theme.textMuted }}>
                  {subtitle}
                </span>
              </div>
            </div>

            {/* Beneficiary */}
            <div className="flex w-[100px] shrink-0 items-center gap-1.5">
              {personName ? (
                <>
                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: personColor }}
                  >
                    <span className="text-[7px] font-semibold text-white">{personInitials}</span>
                  </div>
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

            {/* Sum / Class */}
            <span
              className="w-[100px] shrink-0 text-xs font-medium"
              style={{ color: theme.textPrimary }}
            >
              {formatSumOrClass(policy)}
            </span>

            {/* Premium */}
            <span
              className="w-[85px] shrink-0 text-xs font-medium"
              style={{ color: theme.textPrimary }}
            >
              {formatPremiumWithFrequency(policy.premiumAmount, policy.premiumFrequency)}
            </span>

            {/* Renewal */}
            <span
              className="w-[80px] shrink-0 text-xs"
              style={{ color: theme.textSecondary }}
            >
              {renewalDate}
            </span>

            {/* Status badge */}
            <div className="w-[60px] shrink-0">
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
                    className="absolute right-0 top-full z-20 mt-1 min-w-[120px] rounded-lg py-1 shadow-xl"
                    style={{
                      background: theme.panelBg,
                      border: `1px solid ${theme.cardBorder}`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onEdit(policy)
                        setOpenMenuId(null)
                      }}
                      className="w-full px-3 py-2 text-left text-xs transition-colors hover:bg-white/5"
                      style={{ color: theme.textPrimary }}
                    >
                      Edit Policy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(policy.id)
                        setOpenMenuId(null)
                      }}
                      className="w-full px-3 py-2 text-left text-xs transition-colors hover:bg-red-500/10"
                      style={{ color: '#F04858' }}
                    >
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

export function PoliciesTab() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<InsurancePolicyRecord | null>(null)
  const colorScheme = useColorScheme()
  const theme = getInsuranceTheme(colorScheme)
  const isMonet = colorScheme === 'monet'

  const { data: policies, isLoading } = useInsurancePoliciesQuery()
  const createMutation = useCreateInsurancePolicyMutation()
  const updateMutation = useUpdateInsurancePolicyMutation()
  const deleteMutation = useDeleteInsurancePolicyMutation()

  const { data: personsData } = usePersonsQuery()
  const persons = useMemo(() => personsData ?? [], [personsData])
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string>>(new Set())

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
    monthlyPremium: number
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
      premiumAmount: formData.monthlyPremium.toString(),
      premiumFrequency: 'monthly',
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

  const activePolicies = useMemo(
    () => (policies ?? []).filter((p) => p.isActive),
    [policies]
  )

  const filteredPolicies = useMemo(() => {
    if (selectedPersonIds.size === 0) return activePolicies
    return activePolicies.filter((p) => p.personId && selectedPersonIds.has(p.personId))
  }, [activePolicies, selectedPersonIds])

  const hasPolicies = activePolicies.length > 0

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-semibold"
          style={{
            color: theme.textPrimary,
            fontFamily: isMonet ? "'Cormorant Garamond', Georgia, serif" : 'inherit',
          }}
        >
          Insurance Planner
        </h2>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded px-3.5 py-2 text-sm font-medium text-white transition-all duration-200 hover:brightness-110"
          style={{ background: '#C53D43' }}
        >
          <Plus className="h-4 w-4" />
          Add Policy
        </button>
      </div>

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
          <SummaryCards policies={filteredPolicies} theme={theme} />

          <PolicyTable
            policies={filteredPolicies}
            persons={persons}
            selectedPersonIds={selectedPersonIds}
            onTogglePerson={handleTogglePerson}
            personColorMap={personColorMap}
            theme={theme}
            onEdit={handleEdit}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
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
    </div>
  )
}
