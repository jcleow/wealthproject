'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, Shield, Heart, HeartHandshake, Link, Zap,
  Check, Plus, ArrowLeft, Landmark, Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getBannerState, annualizePremium, getAWLLimit, type BannerState } from '@/lib/medisave-utils'
import { Modal } from '@/components/ui/Modal'
import { CustomDropdown } from '@/components/ui/CustomDropdown'
import { DatePicker } from '@/components/ui/DatePicker'

// =============================================================================
// Dark Theme Tokens (matches Pencil designs exactly)
// =============================================================================

const darkTokens = {
  modalBg: '#1A1A1D',
  inputBg: '#242428',
  cardBg: '#242428',
  border: '#2D2D33',
  closeBg: '#333338',
  textPrimary: '#E8E6E1',
  textSecondary: '#9CA3AF',
  textLabel: '#6B7280',
  textMuted: '#4B5563',
}

// =============================================================================
// Category Definitions
// =============================================================================

type PolicyCategory = 'life' | 'health' | 'critical_illness' | 'long_term_care' | 'personal_accident'

interface CategoryConfig {
  id: PolicyCategory
  label: string
  subtitle: string
  icon: typeof Shield
  accentColor: string
  formTitle: string
  formSubtitle: string
  coverageLabel: string
  amountLabel: string
}

const categoryConfigs: CategoryConfig[] = [
  {
    id: 'life',
    label: 'Life Insurance',
    subtitle: 'Term life, whole life, endowment',
    icon: Shield,
    accentColor: '#3B82F6',
    formTitle: 'Add Life Insurance Policy',
    formSubtitle: 'Term life, whole life, and endowment',
    coverageLabel: 'Coverage Benefits',
    amountLabel: 'Sum Assured',
  },
  {
    id: 'health',
    label: 'Health',
    subtitle: 'MediShield, ISP, health riders',
    icon: Heart,
    accentColor: '#3B82F6',
    formTitle: 'Add Health Insurance Policy',
    formSubtitle: 'MediShield, ISP, and health riders',
    coverageLabel: 'Health Coverage Settings',
    amountLabel: 'Coverage Amount',
  },
  {
    id: 'critical_illness',
    label: 'Critical Illness',
    subtitle: 'Early & multi-pay CI coverage',
    icon: HeartHandshake,
    accentColor: '#3B82F6',
    formTitle: 'Add Critical Illness Policy',
    formSubtitle: 'Early & multi-pay CI coverage',
    coverageLabel: 'CI Coverage Settings',
    amountLabel: 'Sum Assured',
  },
  {
    id: 'long_term_care',
    label: 'Long Term Care',
    subtitle: 'ElderShield, CareShield supplements',
    icon: Link,
    accentColor: '#3B82F6',
    formTitle: 'Add Long Term Care Policy',
    formSubtitle: 'ElderShield & CareShield supplements',
    coverageLabel: 'LTC Payout Settings',
    amountLabel: 'Coverage Amount',
  },
  {
    id: 'personal_accident',
    label: 'Personal Accident',
    subtitle: 'Accident injury & death coverage',
    icon: Zap,
    accentColor: '#3B82F6',
    formTitle: 'Add Personal Accident Policy',
    formSubtitle: 'Accident injury & death coverage',
    coverageLabel: 'Accident Coverage',
    amountLabel: 'Coverage Amount',
  },
]

// =============================================================================
// Provider Options
// =============================================================================

const providerOptions = [
  { value: 'aia', label: 'AIA' },
  { value: 'prudential', label: 'Prudential' },
  { value: 'ntuc', label: 'NTUC Income' },
  { value: 'great_eastern', label: 'Great Eastern' },
  { value: 'manulife', label: 'Manulife' },
  { value: 'aviva', label: 'Aviva (Singlife)' },
  { value: 'tokio_marine', label: 'Tokio Marine' },
  { value: 'fwd', label: 'FWD' },
  { value: 'cpf', label: 'CPF Board' },
  { value: 'other', label: 'Other' },
]

// =============================================================================
// Types
// =============================================================================

export interface PolicyFormData {
  editingId?: string
  category: PolicyCategory
  type: string
  provider: string
  policyName: string
  sumAssured: number
  premiumAmount: number
  premiumFrequency: 'monthly' | 'annually'
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
}

interface EditingPolicy {
  id: string
  category: string
  subcategory: string | null
  name: string
  insurerName: string | null
  coverageAmount: number
  premiumAmount: number
  premiumFrequency: string
  startDate: string
  endDate: string | null
  deathBenefit: number | null
  tpdBenefit: number | null
  criticalIllnessBenefit: number | null
  dailyHospitalCash: number | null
  governmentScheme: string | null
  payoutAmount: number | null
  payoutFrequency: string | null
  notes: string | null
}

interface AddPolicyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (policy: PolicyFormData) => void
  editingPolicy?: EditingPolicy | null
}

// =============================================================================
// Shared UI Primitives (styled to match Pencil exactly)
// =============================================================================

function DarkInput({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  type = 'text',
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  prefix?: string
  type?: string
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-1.5" style={{ color: darkTokens.textLabel }}>
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px]"
            style={{ color: darkTokens.textMuted }}
          >
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full px-3 py-2.5 text-[15px] focus:outline-none transition-all',
            prefix && 'pl-7'
          )}
          style={{
            background: darkTokens.inputBg,
            borderBottom: `1px solid ${darkTokens.border}`,
            color: darkTokens.textPrimary,
          }}
        />
      </div>
    </div>
  )
}


function DarkToggle({
  label,
  checked,
  onChange,
  accentColor,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  accentColor: string
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-[15px]" style={{ color: darkTokens.textPrimary }}>
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative h-6 w-11 rounded-full transition-colors duration-200"
        style={{
          background: checked ? accentColor : '#3F3F46',
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
          style={{
            transform: checked ? 'translateX(20px)' : 'translateX(0)',
          }}
        />
      </button>
    </div>
  )
}

function CurrencyDisplay({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-[15px]" style={{ color: darkTokens.textPrimary }}>
        {label}
      </span>
      <div className="relative w-32">
        <span
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[15px]"
          style={{ color: darkTokens.textMuted }}
        >
          $
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
          className="w-full pl-6 pr-2.5 py-1.5 text-[15px] text-right focus:outline-none"
          style={{
            background: darkTokens.inputBg,
            border: `1px solid ${darkTokens.border}`,
            borderRadius: 2,
            color: darkTokens.textPrimary,
          }}
        />
      </div>
    </div>
  )
}


// =============================================================================
// Main Modal Component
// =============================================================================

// Reverse lookup: insurer display name → provider dropdown key
const reverseProviderLabels: Record<string, string> = Object.fromEntries(
  providerOptions.map((opt) => {
    const displayLabels: Record<string, string> = {
      aia: 'AIA', prudential: 'Prudential', ntuc: 'NTUC Income',
      great_eastern: 'Great Eastern', manulife: 'Manulife', aviva: 'Aviva (Singlife)',
      tokio_marine: 'Tokio Marine', fwd: 'FWD', cpf: 'CPF Board', other: 'Other',
    }
    return [displayLabels[opt.value] ?? opt.label, opt.value]
  })
)

export function AddPolicyModal({ isOpen, onClose, onSave, editingPolicy }: AddPolicyModalProps) {
  // --- Navigation state ---
  const [selectedCategory, setSelectedCategory] = useState<PolicyCategory | null>(null)

  // --- Common form fields ---
  const [provider, setProvider] = useState('')
  const [policyName, setPolicyName] = useState('')
  const [sumAssured, setSumAssured] = useState('')
  const [premiumAmount, setPremiumAmount] = useState('')
  const [premiumFrequency, setPremiumFrequency] = useState<'monthly' | 'annually'>('monthly')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')

  // --- Life-specific ---
  const [deathBenefit, setDeathBenefit] = useState('300000')
  const [criticalIllnessRider, setCriticalIllnessRider] = useState(false)
  const [tpdRider, setTpdRider] = useState(false)

  // --- Health-specific ---
  const [wardClass, setWardClass] = useState('class_a')
  const [annualLimit, setAnnualLimit] = useState('1000000')
  const [ispRider, setIspRider] = useState(true)
  const [deductible, setDeductible] = useState('0_full')

  // --- CI-specific ---
  const [ciBenefitAmount, setCiBenefitAmount] = useState('100000')
  const [earlyCiCoverage, setEarlyCiCoverage] = useState(true)
  const [multiPayCoverage, setMultiPayCoverage] = useState(false)

  // --- LTC-specific ---
  const [governmentScheme, setGovernmentScheme] = useState('careshield_life')
  const [monthlyPayout, setMonthlyPayout] = useState('600')
  const [payoutDuration, setPayoutDuration] = useState('lifetime')

  // --- PA-specific ---
  const [paDeathBenefit, setPaDeathBenefit] = useState('200000')
  const [paTpdBenefit, setPaTpdBenefit] = useState('200000')
  const [paMedicalExpenses, setPaMedicalExpenses] = useState('30000')
  const [dailyHospitalCash, setDailyHospitalCash] = useState(false)

  // --- Pre-fill form when editing ---
  // Track which policy ID we last pre-filled to avoid overwriting user edits
  // when the parent re-renders with a new editingPolicy object reference.
  const lastPrefilledIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      lastPrefilledIdRef.current = null
      return
    }
    if (!editingPolicy) return
    // Skip pre-fill if we already populated for this exact policy
    if (lastPrefilledIdRef.current === editingPolicy.id) return
    lastPrefilledIdRef.current = editingPolicy.id

    // Parse structured notes if present
    let parsedNotes: Record<string, unknown> = {}
    if (editingPolicy.notes) {
      try { parsedNotes = JSON.parse(editingPolicy.notes) } catch { /* plain text notes */ }
    }

    setSelectedCategory(editingPolicy.category as PolicyCategory)
    setProvider(reverseProviderLabels[editingPolicy.insurerName ?? ''] ?? '')
    setPolicyName(editingPolicy.name)
    setSumAssured(editingPolicy.coverageAmount ? editingPolicy.coverageAmount.toString() : '')
    setPremiumAmount(editingPolicy.premiumAmount ? editingPolicy.premiumAmount.toString() : '')
    setPremiumFrequency(editingPolicy.premiumFrequency === 'annually' ? 'annually' : 'monthly')
    setStartDate(editingPolicy.startDate ?? '')
    setEndDate(editingPolicy.endDate ?? '')
    setNotes(typeof parsedNotes.userNotes === 'string' ? parsedNotes.userNotes : editingPolicy.notes ?? '')

    // Category-specific pre-fill
    switch (editingPolicy.category) {
      case 'life':
        if (editingPolicy.deathBenefit != null) setDeathBenefit(editingPolicy.deathBenefit.toString())
        if (editingPolicy.tpdBenefit != null) setTpdRider(true)
        break
      case 'health':
        if (typeof parsedNotes.wardClass === 'string') setWardClass(parsedNotes.wardClass)
        if (typeof parsedNotes.annualLimit === 'number') setAnnualLimit(parsedNotes.annualLimit.toString())
        if (typeof parsedNotes.ispRider === 'boolean') setIspRider(parsedNotes.ispRider)
        if (typeof parsedNotes.deductible === 'string') setDeductible(parsedNotes.deductible)
        break
      case 'critical_illness':
        if (editingPolicy.criticalIllnessBenefit != null) setCiBenefitAmount(editingPolicy.criticalIllnessBenefit.toString())
        // Restore toggle state from notes first, then fall back to subcategory
        if (typeof parsedNotes.earlyCiCoverage === 'boolean') {
          setEarlyCiCoverage(parsedNotes.earlyCiCoverage)
        } else {
          setEarlyCiCoverage(editingPolicy.subcategory === 'early_ci')
        }
        if (typeof parsedNotes.multiPayCoverage === 'boolean') {
          setMultiPayCoverage(parsedNotes.multiPayCoverage)
        } else {
          setMultiPayCoverage(editingPolicy.subcategory === 'multi_pay')
        }
        break
      case 'long_term_care':
        if (editingPolicy.governmentScheme) setGovernmentScheme(editingPolicy.governmentScheme)
        if (editingPolicy.payoutAmount != null) setMonthlyPayout(editingPolicy.payoutAmount.toString())
        if (editingPolicy.payoutFrequency) setPayoutDuration(editingPolicy.payoutFrequency)
        break
      case 'personal_accident':
        if (editingPolicy.deathBenefit != null) setPaDeathBenefit(editingPolicy.deathBenefit.toString())
        if (editingPolicy.tpdBenefit != null) setPaTpdBenefit(editingPolicy.tpdBenefit.toString())
        if (typeof parsedNotes.medicalExpenses === 'number') setPaMedicalExpenses(parsedNotes.medicalExpenses.toString())
        if (editingPolicy.dailyHospitalCash != null) setDailyHospitalCash(editingPolicy.dailyHospitalCash > 0)
        break
    }
  }, [isOpen, editingPolicy])

  const isEditing = !!editingPolicy

  const categoryConfig = categoryConfigs.find((c) => c.id === selectedCategory)

  const formatCurrencyInput = (value: string) => {
    const digitsOnly = value.replace(/[^\d]/g, '')
    if (!digitsOnly) return ''
    return parseInt(digitsOnly).toLocaleString()
  }

  const resetForm = () => {
    setSelectedCategory(null)
    setProvider('')
    setPolicyName('')
    setSumAssured('')
    setPremiumAmount('')
    setPremiumFrequency('monthly')
    setStartDate('')
    setEndDate('')
    setNotes('')
    setDeathBenefit('300000')
    setCriticalIllnessRider(false)
    setTpdRider(false)
    setWardClass('class_a')
    setAnnualLimit('1000000')
    setIspRider(true)
    setDeductible('0_full')
    setCiBenefitAmount('100000')
    setEarlyCiCoverage(true)
    setMultiPayCoverage(false)
    setGovernmentScheme('careshield_life')
    setMonthlyPayout('600')
    setPayoutDuration('lifetime')
    setPaDeathBenefit('200000')
    setPaTpdBenefit('200000')
    setPaMedicalExpenses('30000')
    setDailyHospitalCash(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const isFormValid = policyName.trim() !== '' && startDate !== ''

  // Compute MediSave payment source banner state reactively
  const paymentSourceBanner: BannerState = (() => {
    if (!selectedCategory) return { type: 'none' } as BannerState
    const parsedPremium = parseFloat(premiumAmount.replace(/,/g, '')) || 0
    const annualized = annualizePremium(parsedPremium, premiumFrequency)
    // Map modal categories to API categories for payability check
    const apiCategory = selectedCategory === 'health' ? 'hospitalization' : selectedCategory
    const govScheme = selectedCategory === 'long_term_care' ? governmentScheme : undefined
    // TODO: factor in existing IPs for this person to compute remaining AWL
    const personAge = 35 // placeholder — will come from selected person's DOB
    const awlLimit = getAWLLimit(personAge)
    return getBannerState({
      governmentScheme: govScheme ?? null,
      category: apiCategory,
      annualizedPremium: annualized,
      remainingAWL: awlLimit, // full AWL for now, will subtract existing IPs later
    })
  })()

  const handleSave = () => {
    if (!selectedCategory || !isFormValid) return

    const baseFormData: PolicyFormData = {
      editingId: editingPolicy?.id,
      category: selectedCategory,
      type: selectedCategory,
      provider,
      policyName,
      sumAssured: parseFloat(sumAssured.replace(/,/g, '')) || 0,
      premiumAmount: parseFloat(premiumAmount.replace(/,/g, '')) || 0,
      premiumFrequency,
      startDate,
      endDate,
      notes,
    }

    // When editing, preserve the original subcategory unless the form
    // explicitly changes it (e.g., CI toggle state determines subcategory).
    const originalSubcategory = editingPolicy?.subcategory ?? null

    switch (selectedCategory) {
      case 'life':
        baseFormData.type = originalSubcategory ?? 'term_life'
        baseFormData.deathBenefit = parseInt(deathBenefit) || 0
        baseFormData.criticalIllnessRider = criticalIllnessRider
        baseFormData.tpdBenefit = tpdRider ? (parseInt(deathBenefit) || 0) : undefined
        break
      case 'health':
        baseFormData.type = originalSubcategory ?? 'isp'
        baseFormData.wardClass = wardClass
        baseFormData.annualLimit = parseInt(annualLimit) || 0
        baseFormData.ispRider = ispRider
        baseFormData.deductible = deductible
        break
      case 'critical_illness':
        // Derive subcategory from toggle state
        if (multiPayCoverage) {
          baseFormData.type = 'multi_pay'
        } else if (earlyCiCoverage) {
          baseFormData.type = 'early_ci'
        } else {
          baseFormData.type = 'late_ci'
        }
        baseFormData.criticalIllnessBenefit = parseInt(ciBenefitAmount) || 0
        baseFormData.earlyCiCoverage = earlyCiCoverage
        baseFormData.multiPayCoverage = multiPayCoverage
        break
      case 'long_term_care':
        baseFormData.type = originalSubcategory ?? 'careshield'
        baseFormData.governmentScheme = governmentScheme
        baseFormData.payoutAmount = parseInt(monthlyPayout) || 0
        baseFormData.payoutFrequency = payoutDuration
        break
      case 'personal_accident':
        baseFormData.type = originalSubcategory ?? 'pa'
        baseFormData.deathBenefit = parseInt(paDeathBenefit) || 0
        baseFormData.tpdBenefit = parseInt(paTpdBenefit) || 0
        baseFormData.medicalExpenses = parseInt(paMedicalExpenses) || 0
        baseFormData.dailyHospitalCash = dailyHospitalCash
        break
    }

    onSave?.(baseFormData)
    handleClose()
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Category Selector Screen (matches Pencil 4W5VM)
  // ─────────────────────────────────────────────────────────────────────────────

  const renderCategorySelector = () => (
    <>
      {/* Header — h-20, px-6, bottom border */}
      <div
        className="flex items-center justify-between h-20 px-6"
        style={{ borderBottom: `1px solid ${darkTokens.border}` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center h-9 w-9 rounded-lg"
            style={{ background: 'rgba(232, 230, 225, 0.08)' }}
          >
            <Plus className="h-4 w-4" style={{ color: darkTokens.textPrimary }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: darkTokens.textPrimary }}>
              Add Insurance Policy
            </h2>
            <p className="text-sm" style={{ color: darkTokens.textSecondary }}>
              Choose your insurance category
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="flex items-center justify-center h-7 w-7 rounded-full transition-colors hover:brightness-125"
          style={{ background: darkTokens.closeBg, color: darkTokens.textSecondary }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Category Grid — p-6, gap-3, last card half-width */}
      <div className="p-6">
        <div className="flex flex-col gap-3">
          {/* Row 1 */}
          <div className="flex gap-3">
            {categoryConfigs.slice(0, 2).map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex-1 flex flex-col items-start gap-3 p-4 transition-all duration-200 hover:brightness-125 text-left"
                  style={{
                    background: darkTokens.cardBg,
                    border: `1px solid ${darkTokens.border}`,
                    borderRadius: 2,
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: category.accentColor }} />
                  <div>
                    <p className="text-[15px] font-semibold" style={{ color: darkTokens.textPrimary }}>
                      {category.label}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: darkTokens.textSecondary }}>
                      {category.subtitle}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
          {/* Row 2 */}
          <div className="flex gap-3">
            {categoryConfigs.slice(2, 4).map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex-1 flex flex-col items-start gap-3 p-4 transition-all duration-200 hover:brightness-125 text-left"
                  style={{
                    background: darkTokens.cardBg,
                    border: `1px solid ${darkTokens.border}`,
                    borderRadius: 2,
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: category.accentColor }} />
                  <div>
                    <p className="text-[15px] font-semibold" style={{ color: darkTokens.textPrimary }}>
                      {category.label}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: darkTokens.textSecondary }}>
                      {category.subtitle}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
          {/* Row 3 — PA card half-width with spacer */}
          <div className="flex gap-3 items-start">
            {(() => {
              const paCategory = categoryConfigs[4]
              const Icon = paCategory.icon
              return (
                <button
                  key={paCategory.id}
                  type="button"
                  onClick={() => setSelectedCategory(paCategory.id)}
                  className="flex-1 flex flex-col items-start gap-3 p-4 transition-all duration-200 hover:brightness-125 text-left"
                  style={{
                    background: darkTokens.cardBg,
                    border: `1px solid ${darkTokens.border}`,
                    borderRadius: 2,
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: paCategory.accentColor }} />
                  <div>
                    <p className="text-[15px] font-semibold" style={{ color: darkTokens.textPrimary }}>
                      {paCategory.label}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: darkTokens.textSecondary }}>
                      {paCategory.subtitle}
                    </p>
                  </div>
                </button>
              )
            })()}
            {/* Spacer to keep PA half-width */}
            <div className="flex-1" />
          </div>
        </div>
      </div>

      {/* Footer — h-14, px-6, top border */}
      <div
        className="flex items-center justify-end h-14 px-6"
        style={{ borderTop: `1px solid ${darkTokens.border}` }}
      >
        <button
          type="button"
          onClick={handleClose}
          className="px-5 py-2.5 text-[15px] font-medium transition-colors hover:brightness-125"
          style={{
            color: darkTokens.textLabel,
            background: darkTokens.cardBg,
            borderRadius: 2,
          }}
        >
          Cancel
        </button>
      </div>
    </>
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Category-Specific Coverage Sections
  // ─────────────────────────────────────────────────────────────────────────────

  const renderCoverageSection = (): React.ReactNode => {
    if (!categoryConfig) return null

    const coverageCardStyle: React.CSSProperties = {
      background: darkTokens.cardBg,
      border: `1px solid ${darkTokens.border}`,
      borderRadius: 2,
    }

    const sectionTitle = (
      <h3 className="text-[15px] font-semibold mb-1" style={{ color: darkTokens.textPrimary }}>
        {categoryConfig.coverageLabel}
      </h3>
    )

    switch (selectedCategory) {
      case 'life':
        return (
          <div className="p-4" style={coverageCardStyle}>
            {sectionTitle}
            <div className="flex flex-col gap-0">
              <CurrencyDisplay label="Death Benefit" value={formatCurrencyInput(deathBenefit)} onChange={(val) => setDeathBenefit(val)} />
              <DarkToggle label="Critical Illness Rider" checked={criticalIllnessRider} onChange={setCriticalIllnessRider} accentColor={categoryConfig.accentColor} />
              <DarkToggle label="TPD Rider" checked={tpdRider} onChange={setTpdRider} accentColor={categoryConfig.accentColor} />
            </div>
          </div>
        )

      case 'health':
        return (
          <div className="p-4" style={coverageCardStyle}>
            {sectionTitle}
            <div className="flex flex-col gap-0">
              <div className="flex items-center justify-between py-3">
                <span className="text-[15px]" style={{ color: darkTokens.textPrimary }}>Ward Class</span>
                <CustomDropdown
                  value={wardClass}
                  onChange={setWardClass}
                  options={[
                    { value: 'class_a', label: 'Class A' },
                    { value: 'class_b1', label: 'Class B1' },
                    { value: 'class_b2', label: 'Class B2' },
                    { value: 'class_c', label: 'Class C' },
                  ]}
                  variant="dark"
                  minWidth="120px"
                />
              </div>
              <CurrencyDisplay label="Annual Limit" value={formatCurrencyInput(annualLimit)} onChange={(val) => setAnnualLimit(val)} />
              <DarkToggle label="ISP Rider" checked={ispRider} onChange={setIspRider} accentColor={categoryConfig.accentColor} />
              <div className="flex items-center justify-between py-3">
                <span className="text-[15px]" style={{ color: darkTokens.textPrimary }}>Deductible</span>
                <CustomDropdown
                  value={deductible}
                  onChange={setDeductible}
                  options={[
                    { value: '0_full', label: '$0 (Full)' },
                    { value: '1500', label: '$1,500' },
                    { value: '2000', label: '$2,000' },
                    { value: '3500', label: '$3,500' },
                  ]}
                  variant="dark"
                  minWidth="120px"
                />
              </div>
            </div>
          </div>
        )

      case 'critical_illness':
        return (
          <div className="p-4" style={coverageCardStyle}>
            {sectionTitle}
            <div className="flex flex-col gap-0">
              <CurrencyDisplay label="CI Benefit Amount" value={formatCurrencyInput(ciBenefitAmount)} onChange={(val) => setCiBenefitAmount(val)} />
              <DarkToggle label="Early CI Coverage" checked={earlyCiCoverage} onChange={setEarlyCiCoverage} accentColor={categoryConfig.accentColor} />
              <DarkToggle label="Multi-Pay Coverage" checked={multiPayCoverage} onChange={setMultiPayCoverage} accentColor={categoryConfig.accentColor} />
            </div>
          </div>
        )

      case 'long_term_care':
        return (
          <div className="p-4" style={coverageCardStyle}>
            {sectionTitle}
            <div className="flex flex-col gap-0">
              <div className="flex items-center justify-between py-3">
                <span className="text-[15px]" style={{ color: darkTokens.textPrimary }}>Government Scheme</span>
                <CustomDropdown
                  value={governmentScheme}
                  onChange={setGovernmentScheme}
                  options={[
                    { value: 'careshield_life', label: 'CareShield Life' },
                    { value: 'eldershield', label: 'ElderShield' },
                  ]}
                  variant="dark"
                  minWidth="140px"
                />
              </div>
              <CurrencyDisplay label="Monthly Payout" value={formatCurrencyInput(monthlyPayout)} onChange={(val) => setMonthlyPayout(val)} />
              <div className="flex items-center justify-between py-3">
                <span className="text-[15px]" style={{ color: darkTokens.textPrimary }}>Payout Duration</span>
                <CustomDropdown
                  value={payoutDuration}
                  onChange={setPayoutDuration}
                  options={[
                    { value: 'lifetime', label: 'Lifetime' },
                    { value: '5_years', label: '5 years' },
                    { value: '10_years', label: '10 years' },
                  ]}
                  variant="dark"
                  minWidth="120px"
                />
              </div>
            </div>
          </div>
        )

      case 'personal_accident':
        return (
          <div className="p-4" style={coverageCardStyle}>
            {sectionTitle}
            <div className="flex flex-col gap-0">
              <CurrencyDisplay label="Death Benefit" value={formatCurrencyInput(paDeathBenefit)} onChange={(val) => setPaDeathBenefit(val)} />
              <CurrencyDisplay label="TPD Benefit" value={formatCurrencyInput(paTpdBenefit)} onChange={(val) => setPaTpdBenefit(val)} />
              <CurrencyDisplay label="Medical Expenses" value={formatCurrencyInput(paMedicalExpenses)} onChange={(val) => setPaMedicalExpenses(val)} />
              <DarkToggle label="Daily Hospital Cash" checked={dailyHospitalCash} onChange={setDailyHospitalCash} accentColor={categoryConfig.accentColor} />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Category Form Screen (matches Pencil QhPJ3 / 9tKyd / PTMWk / pfzyz / 0ExtT)
  // ─────────────────────────────────────────────────────────────────────────────

  const renderCategoryForm = () => {
    if (!categoryConfig) return null
    const Icon = categoryConfig.icon

    return (
      <>
        {/* Header — h-20, px-6, icon in colored bg circle */}
        <div
          className="flex items-center justify-between h-20 px-6"
          style={{ borderBottom: `1px solid ${darkTokens.border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center h-9 w-9 rounded-lg"
              style={{ background: `${categoryConfig.accentColor}1F` }}
            >
              <Icon className="h-4 w-4" style={{ color: categoryConfig.accentColor }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: darkTokens.textPrimary }}>
                {isEditing ? categoryConfig.formTitle.replace('Add', 'Edit') : categoryConfig.formTitle}
              </h2>
              <p className="text-sm" style={{ color: darkTokens.textSecondary }}>
                {categoryConfig.formSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center justify-center h-7 w-7 rounded-full transition-colors hover:brightness-125"
            style={{ background: darkTokens.closeBg, color: darkTokens.textSecondary }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Form Body — p-6, gap-4 */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Insurance Provider */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: darkTokens.textLabel }}>
              Insurance Provider
            </label>
            <CustomDropdown
              value={provider}
              onChange={setProvider}
              options={providerOptions}
              variant="dark"
              minWidth="100%"
            />
          </div>

          {/* Policy Name */}
          <DarkInput
            label="Policy Name"
            value={policyName}
            onChange={setPolicyName}
            placeholder="Enter policy name"
          />

          {/* Amount Row — gap-4 to match Pencil */}
          <div className="grid grid-cols-2 gap-4">
            <DarkInput
              label={categoryConfig.amountLabel}
              value={formatCurrencyInput(sumAssured)}
              onChange={(val) => setSumAssured(val.replace(/[^\d]/g, ''))}
              placeholder="0"
              prefix="$"
            />
            <DarkInput
              label="Premium Amount"
              value={formatCurrencyInput(premiumAmount)}
              onChange={(val) => setPremiumAmount(val.replace(/[^\d]/g, ''))}
              placeholder="0"
              prefix="$"
            />
          </div>

          {/* Premium Frequency */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: darkTokens.textLabel }}>
              Premium Frequency
            </label>
            <div
              className="flex items-center p-[3px] rounded-lg"
              style={{ backgroundColor: '#1A1A1D', border: '1px solid #2D2D33' }}
            >
              {(['monthly', 'annually'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setPremiumFrequency(freq)}
                  className={cn(
                    'flex-1 py-2 rounded-md text-sm font-medium transition-all duration-150',
                    premiumFrequency === freq
                      ? 'bg-blue-500 text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {freq === 'monthly' ? 'Monthly' : 'Annually'}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Source Banner — reactive to category, premium, frequency */}
          {paymentSourceBanner.type === 'full' && (
            <div
              className="flex items-center gap-2.5 rounded-lg p-3"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.19)' }}
            >
              <Landmark className="h-4 w-4 shrink-0 text-emerald-500" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-emerald-500">MediSave Payable</span>
                <span className="text-[11px] text-zinc-500">{paymentSourceBanner.label}</span>
              </div>
            </div>
          )}
          {paymentSourceBanner.type === 'mixed' && (
            <div
              className="flex flex-col gap-3 rounded-lg p-3.5"
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.19)' }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-amber-500">Partially MediSave Payable</span>
                <span className="text-[11px] text-zinc-500">Premium exceeds MediSave Additional Withdrawal Limit (AWL)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-md p-2" style={{ backgroundColor: 'rgba(16, 185, 129, 0.06)' }}>
                  <div className="text-[10px] text-zinc-500">MediSave</div>
                  <div className="text-sm font-semibold text-emerald-500">
                    ${paymentSourceBanner.medisavePortion.toLocaleString()} /yr
                  </div>
                </div>
                <span className="text-zinc-600 text-base">+</span>
                <div className="flex-1 rounded-md p-2" style={{ backgroundColor: 'rgba(245, 158, 11, 0.06)' }}>
                  <div className="text-[10px] text-zinc-500">Cash</div>
                  <div className="text-sm font-semibold text-amber-500">
                    ${paymentSourceBanner.cashPortion.toLocaleString()} /yr
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Info className="h-3 w-3 shrink-0 text-zinc-500" />
                <span className="text-[11px] text-zinc-500">
                  AWL limit: ${paymentSourceBanner.awlLimit.toLocaleString()}/yr
                </span>
              </div>
            </div>
          )}

          {/* Date Row — gap-4 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: darkTokens.textLabel }}>
                Start Date
              </label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Select date"
                variant="dark"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: darkTokens.textLabel }}>
                End Date
              </label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="Select date"
                variant="dark"
                minDate={startDate || undefined}
              />
            </div>
          </div>

          {/* Category-Specific Coverage Section */}
          {renderCoverageSection()}
        </div>

        {/* Footer — h-16, px-6 */}
        <div
          className="flex items-center justify-between h-16 px-6"
          style={{ borderTop: `1px solid ${darkTokens.border}` }}
        >
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[15px] font-medium transition-colors hover:brightness-125"
              style={{ color: darkTokens.textSecondary }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isFormValid}
            className={cn(
              'flex items-center gap-1.5 px-5 py-2.5 text-[15px] font-semibold text-white transition-all duration-200',
              isFormValid ? 'hover:brightness-110' : 'opacity-40 cursor-not-allowed'
            )}
            style={{
              background: categoryConfig.accentColor,
              borderRadius: 2,
            }}
          >
            <Check className="h-3.5 w-3.5" />
            {isEditing ? 'Update Policy' : 'Save Policy'}
          </button>
        </div>
      </>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      overlayClassName="bg-black/50 backdrop-blur-sm"
      className="w-full mx-4"
    >
      <div
        className="overflow-hidden mx-auto"
        style={{
          maxWidth: 560,
          background: darkTokens.modalBg,
          borderRadius: 2,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {selectedCategory === null ? renderCategorySelector() : renderCategoryForm()}
      </div>
    </Modal>
  )
}
