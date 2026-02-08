'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Plus, Shield, Loader2, MoreHorizontal, Check, ChevronDown, Users } from 'lucide-react'
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
// Constants
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

// Insurer abbreviation colors (deterministic from name)
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
  // Known abbreviations
  const known: Record<string, string> = {
    'AIA': 'AIA', 'Prudential': 'PRU', 'NTUC Income': 'NTUC',
    'Great Eastern': 'GE', 'Manulife': 'MAN', 'Aviva (Singlife)': 'AVV',
    'Tokio Marine': 'TM', 'FWD': 'FWD', 'CPF Board': 'CPF',
  }
  if (known[name]) return known[name]
  // Fallback: first 2-3 chars uppercase
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
    // Default: 1 year from start
    const start = new Date(startDate)
    const renewal = new Date(start)
    renewal.setFullYear(renewal.getFullYear() + 1)
    return renewal.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  return new Date(dateToFormat).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// ─────────────────────────────────────────────────────────────────────────────
// Person Multi-Select Filter
// ─────────────────────────────────────────────────────────────────────────────

function PersonMultiSelect({
  persons,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
  theme,
}: {
  persons: Person[]
  selectedIds: Set<string>
  onToggle: (personId: string) => void
  onSelectAll: () => void
  onClearAll: () => void
  theme: ReturnType<typeof getInsuranceTheme>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const allSelected = persons.length > 0 && selectedIds.size === persons.length
  const noneSelected = selectedIds.size === 0
  const triggerLabel = noneSelected
    ? 'All Persons'
    : selectedIds.size === 1
      ? persons.find((p) => selectedIds.has(p.id))?.name ?? '1 person'
      : `${selectedIds.size} persons`

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition-all duration-200"
        style={{
          background: theme.controlBg,
          border: `1px solid ${theme.controlBorder}`,
          color: noneSelected ? theme.textSecondary : theme.textPrimary,
        }}
      >
        <Users className="h-3.5 w-3.5" />
        <span>{triggerLabel}</span>
        <ChevronDown
          className="h-3 w-3 transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-30 mt-1.5 min-w-[220px] rounded-lg py-1 shadow-xl"
          style={{
            background: theme.panelBg,
            border: `1px solid ${theme.cardBorder}`,
          }}
        >
          {/* Select All / Clear All */}
          <button
            type="button"
            onClick={allSelected ? onClearAll : onSelectAll}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-white/[0.04]"
            style={{ color: theme.textSecondary, borderBottom: `1px solid ${theme.cardBorder}` }}
          >
            <div
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
              style={{
                background: allSelected ? '#3b82f6' : 'transparent',
                border: `1.5px solid ${allSelected ? '#3b82f6' : theme.textMuted}`,
              }}
            >
              {allSelected && <Check className="h-2.5 w-2.5 text-white" />}
            </div>
            <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
          </button>

          {/* Person options */}
          {persons.map((person) => {
            const isSelected = selectedIds.has(person.id)
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => onToggle(person.id)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-white/[0.04]"
                style={{ color: theme.textPrimary }}
              >
                <div
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
                  style={{
                    background: isSelected ? '#3b82f6' : 'transparent',
                    border: `1.5px solid ${isSelected ? '#3b82f6' : theme.textMuted}`,
                  }}
                >
                  {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                </div>
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: person.displayColor || '#64748b' }}
                />
                <span className="truncate">{person.name}</span>
                {person.relationship && person.relationship !== 'self' && (
                  <span
                    className="ml-auto text-[10px] shrink-0"
                    style={{ color: theme.textMuted }}
                  >
                    ({person.relationship})
                  </span>
                )}
              </button>
            )
          })}

          {persons.length === 0 && (
            <div className="px-3 py-3 text-xs text-center" style={{ color: theme.textMuted }}>
              No persons added yet
            </div>
          )}
        </div>
      )}
    </div>
  )
}

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
    (sum, p) => sum + annualizePremium(p.premiumAmount, p.premiumFrequency), 0
  )

  // Find nearest renewal
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
      description: uniqueInsurers.size > 0
        ? `Across ${uniqueInsurers.size} insurer${uniqueInsurers.size === 1 ? '' : 's'}`
        : 'No active policies',
    },
    {
      label: 'ANNUAL PREMIUM',
      value: formatAmount(totalAnnualPremium),
      description: totalAnnualPremium > 0 ? `${formatPremiumWithFrequency(totalAnnualPremium / 12, 'monthly')} avg` : 'No premiums',
    },
    {
      label: 'NEXT RENEWAL',
      value: nearestRenewal
        ? new Date(nearestRenewal.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
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
          <span
            className={T.cardLabel}
            style={{ color: theme.textMuted }}
          >
            {item.label}
          </span>
          <span
            className={T.cardValue}
            style={{ color: theme.textPrimary }}
          >
            {item.value}
          </span>
          <span
            className={T.cardDescription}
            style={{ color: theme.textMuted }}
          >
            {item.description}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Policy Card
// ─────────────────────────────────────────────────────────────────────────────

function PolicyCard({
  policy,
  theme,
  personColor,
  onEdit,
  onDelete,
}: {
  policy: InsurancePolicyRecord
  theme: ReturnType<typeof getInsuranceTheme>
  personColor?: string
  onEdit: (policy: InsurancePolicyRecord) => void
  onDelete: (id: string) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const insurerName = policy.insurerName ?? 'Unknown'
  const insurerAbbr = getInsurerAbbreviation(policy.insurerName)
  const insurerColor = getInsurerColor(insurerName)
  const categoryLabel = formatCategoryLabel(policy.category, policy.subcategory)
  const renewalDate = formatRenewalDate(policy.startDate, policy.endDate, policy.renewalDate)

  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: `1px solid ${theme.cardBorder}` }}
      >
        <div className="flex items-center gap-3.5">
          {/* Insurer Logo */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: theme.surfaceBg,
              border: `1px solid ${theme.cardBorder}`,
            }}
          >
            <span
              className="text-xs font-bold"
              style={{ color: insurerColor }}
            >
              {insurerAbbr}
            </span>
          </div>
          {/* Policy Info */}
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: theme.textPrimary }}
            >
              {policy.name}
            </p>
            <p className="text-sm" style={{ color: theme.textMuted }}>
              {policy.subcategory
                ? `${policy.subcategory.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`
                : policy.category}
              {policy.policyNumber ? ` · Policy #${policy.policyNumber}` : ''}
            </p>
            {policy.personName && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: personColor || '#64748b' }}
                />
                <span className="text-[11px]" style={{ color: theme.textMuted }}>
                  {policy.personName}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Active Badge */}
          {policy.isActive && (
            <div
              className="rounded px-2.5 py-1"
              style={{ background: 'rgba(34, 197, 94, 0.12)' }}
            >
              <span className="text-xs font-semibold" style={{ color: '#34D673' }}>
                Active
              </span>
            </div>
          )}
          {/* Menu Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-md transition-colors"
              style={{
                background: theme.surfaceBg,
                border: `1px solid ${theme.cardBorder}`,
              }}
            >
              <MoreHorizontal className="h-3.5 w-3.5" style={{ color: theme.textMuted }} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div
                  className="absolute right-0 top-full z-20 mt-1 min-w-[120px] rounded-lg py-1 shadow-xl"
                  style={{
                    background: theme.panelBg,
                    border: `1px solid ${theme.cardBorder}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { onEdit(policy); setShowMenu(false) }}
                    className="w-full px-3 py-2 text-left text-xs transition-colors hover:bg-white/5"
                    style={{ color: theme.textPrimary }}
                  >
                    Edit Policy
                  </button>
                  <button
                    type="button"
                    onClick={() => { onDelete(policy.id); setShowMenu(false) }}
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
      </div>

      {/* Body - 4 columns */}
      <div className="grid grid-cols-4 gap-6 px-6 py-4">
        <div className="flex flex-col gap-0.5">
          <span
            className={T.cardLabel}
            style={{ color: theme.textMuted }}
          >
            COVERAGE
          </span>
          <span className="text-[13px] font-medium" style={{ color: theme.textPrimary }}>
            {categoryLabel}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span
            className={T.cardLabel}
            style={{ color: theme.textMuted }}
          >
            SUM ASSURED
          </span>
          <span className="text-[13px] font-medium" style={{ color: theme.textPrimary }}>
            {formatAmount(policy.coverageAmount)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span
            className={T.cardLabel}
            style={{ color: theme.textMuted }}
          >
            PREMIUM
          </span>
          <span className="text-[13px] font-medium" style={{ color: theme.textPrimary }}>
            {formatPremiumWithFrequency(policy.premiumAmount, policy.premiumFrequency)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span
            className={T.cardLabel}
            style={{ color: theme.textMuted }}
          >
            RENEWAL
          </span>
          <span className="text-[13px] font-medium" style={{ color: theme.textPrimary }}>
            {renewalDate}
          </span>
        </div>
      </div>
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

  const handleSelectAllPersons = () => {
    setSelectedPersonIds(new Set(persons.map((p) => p.id)))
  }

  const handleClearAllPersons = () => {
    setSelectedPersonIds(new Set())
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
    // Life-specific
    deathBenefit?: number
    tpdBenefit?: number
    criticalIllnessRider?: boolean
    // Health-specific
    wardClass?: string
    annualLimit?: number
    ispRider?: boolean
    deductible?: string
    // CI-specific
    criticalIllnessBenefit?: number
    earlyCiCoverage?: boolean
    multiPayCoverage?: boolean
    // LTC-specific
    governmentScheme?: string
    payoutAmount?: number
    payoutFrequency?: string
    // PA-specific
    dailyHospitalCash?: boolean
    medicalExpenses?: number
    notes: string
  }) => {
    // Build structured notes for fields that lack dedicated backend columns
    const structuredNotes: Record<string, unknown> = {}
    if (formData.wardClass) structuredNotes.wardClass = formData.wardClass
    if (formData.annualLimit) structuredNotes.annualLimit = formData.annualLimit
    if (formData.ispRider !== undefined) structuredNotes.ispRider = formData.ispRider
    if (formData.deductible) structuredNotes.deductible = formData.deductible
    if (formData.earlyCiCoverage !== undefined) structuredNotes.earlyCiCoverage = formData.earlyCiCoverage
    if (formData.multiPayCoverage !== undefined) structuredNotes.multiPayCoverage = formData.multiPayCoverage
    if (formData.medicalExpenses) structuredNotes.medicalExpenses = formData.medicalExpenses

    const hasStructuredNotes = Object.keys(structuredNotes).length > 0
    const notesPayload = hasStructuredNotes
      ? JSON.stringify({ ...structuredNotes, userNotes: formData.notes || undefined })
      : formData.notes || undefined

    const payload: InsurancePolicyCreateInput = {
      name: formData.policyName || `${formData.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Policy`,
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
        <div className="flex items-center gap-2.5">
          {persons.length > 0 && (
            <PersonMultiSelect
              persons={persons}
              selectedIds={selectedPersonIds}
              onToggle={handleTogglePerson}
              onSelectAll={handleSelectAllPersons}
              onClearAll={handleClearAllPersons}
              theme={theme}
            />
          )}
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
          <p className="mt-2 text-sm max-w-xs text-center" style={{ color: theme.textSecondary }}>
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

      {/* Summary Cards + Policy List */}
      {!isLoading && hasPolicies && (
        <>
          <SummaryCards policies={filteredPolicies} theme={theme} />
          <div className="flex flex-col gap-4">
            {filteredPolicies.length > 0 ? (
              filteredPolicies.map((policy) => (
                <PolicyCard
                  key={policy.id}
                  policy={policy}
                  theme={theme}
                  personColor={policy.personId ? personColorMap[policy.personId] : undefined}
                  onEdit={handleEdit}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))
            ) : (
              <div
                className="py-8 text-center text-sm"
                style={{ color: theme.textMuted }}
              >
                No policies match the selected persons
              </div>
            )}
          </div>
        </>
      )}

      <AddPolicyModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingPolicy(null) }}
        onSave={handleSave}
        editingPolicy={editingPolicy}
      />
    </div>
  )
}
