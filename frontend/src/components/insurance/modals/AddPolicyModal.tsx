'use client'

import { useState } from 'react'
import { X, Shield, Stethoscope, HeartHandshake, Heart, Accessibility, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'

/**
 * AddPolicyModal - Modal for adding insurance policies
 *
 * Flow:
 * 1. Select policy category (Life, Health, CI, LTC, PA)
 * 2. Select specific policy type within category
 * 3. Fill in policy details (provider, sum assured, premium)
 * 4. Toggle coverage items
 */

type PolicyCategory = 'life' | 'health' | 'critical_illness' | 'long_term_care' | 'personal_accident'

interface PolicyCategoryOption {
  id: PolicyCategory
  label: string
  icon: typeof Shield
  types: PolicyTypeOption[]
}

interface PolicyTypeOption {
  value: string
  label: string
  coverageItems: CoverageItemOption[]
}

interface CoverageItemOption {
  id: string
  label: string
  defaultEnabled: boolean
}

const policyCategories: PolicyCategoryOption[] = [
  {
    id: 'life',
    label: 'Life Protection',
    icon: Shield,
    types: [
      {
        value: 'term_life',
        label: 'Term Life',
        coverageItems: [
          { id: 'death', label: 'Death', defaultEnabled: true },
          { id: 'tpd', label: 'Total Permanent Disability', defaultEnabled: true },
          { id: 'terminal', label: 'Terminal Illness', defaultEnabled: false },
        ],
      },
      {
        value: 'whole_life',
        label: 'Whole Life',
        coverageItems: [
          { id: 'death', label: 'Death', defaultEnabled: true },
          { id: 'tpd', label: 'Total Permanent Disability', defaultEnabled: true },
          { id: 'terminal', label: 'Terminal Illness', defaultEnabled: false },
        ],
      },
      {
        value: 'ilp',
        label: 'Investment-Linked Plan',
        coverageItems: [
          { id: 'death', label: 'Death', defaultEnabled: true },
          { id: 'tpd', label: 'Total Permanent Disability', defaultEnabled: false },
        ],
      },
    ],
  },
  {
    id: 'health',
    label: 'Health Products',
    icon: Stethoscope,
    types: [
      {
        value: 'isp',
        label: 'Integrated Shield Plan',
        coverageItems: [
          { id: 'inpatient', label: 'Inpatient', defaultEnabled: true },
          { id: 'outpatient', label: 'Outpatient', defaultEnabled: false },
          { id: 'surgical', label: 'Surgical', defaultEnabled: true },
        ],
      },
      {
        value: 'medishield',
        label: 'MediShield Life',
        coverageItems: [
          { id: 'inpatient', label: 'Inpatient', defaultEnabled: true },
          { id: 'outpatient', label: 'Outpatient', defaultEnabled: false },
          { id: 'surgical', label: 'Surgical', defaultEnabled: true },
        ],
      },
    ],
  },
  {
    id: 'critical_illness',
    label: 'Critical Illness',
    icon: HeartHandshake,
    types: [
      {
        value: 'early_ci',
        label: 'Early Critical Illness',
        coverageItems: [
          { id: 'early_stage', label: 'Early Stage CI', defaultEnabled: true },
        ],
      },
      {
        value: 'late_ci',
        label: 'Late-stage Critical Illness',
        coverageItems: [
          { id: 'late_stage', label: 'Late Stage CI', defaultEnabled: true },
        ],
      },
      {
        value: 'multi_pay',
        label: 'Multi-pay Critical Illness',
        coverageItems: [
          { id: 'early_stage', label: 'Early Stage CI', defaultEnabled: true },
          { id: 'late_stage', label: 'Late Stage CI', defaultEnabled: true },
          { id: 'multi_claim', label: 'Multiple Claims', defaultEnabled: true },
        ],
      },
    ],
  },
  {
    id: 'long_term_care',
    label: 'Long-Term Care',
    icon: Heart,
    types: [
      {
        value: 'careshield',
        label: 'CareShield Life',
        coverageItems: [
          { id: 'severe_disability', label: 'Severe Disability (3+ ADLs)', defaultEnabled: true },
        ],
      },
      {
        value: 'ltc_supplement',
        label: 'Private LTC Supplement',
        coverageItems: [
          { id: 'severe_disability', label: 'Severe Disability', defaultEnabled: true },
          { id: 'moderate_disability', label: 'Moderate Disability', defaultEnabled: false },
        ],
      },
    ],
  },
  {
    id: 'personal_accident',
    label: 'Personal Accident',
    icon: Accessibility,
    types: [
      {
        value: 'pa',
        label: 'Personal Accident',
        coverageItems: [
          { id: 'accidental_death', label: 'Accidental Death', defaultEnabled: true },
          { id: 'accidental_disability', label: 'Accidental Disability', defaultEnabled: true },
          { id: 'medical_expenses', label: 'Medical Expenses', defaultEnabled: false },
        ],
      },
    ],
  },
]

// Common insurance providers in Singapore
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

interface AddPolicyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (policy: PolicyFormData) => void
}

interface PolicyFormData {
  category: PolicyCategory
  type: string
  provider: string
  policyName: string
  sumAssured: number
  monthlyPremium: number
  coverage: Record<string, boolean>
  notes: string
}

export function AddPolicyModal({ isOpen, onClose, onSave }: AddPolicyModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<PolicyCategory | null>(null)
  const [selectedType, setSelectedType] = useState<string>('')
  const [provider, setProvider] = useState<string>('aia')
  const [policyName, setPolicyName] = useState('')
  const [sumAssured, setSumAssured] = useState('')
  const [monthlyPremium, setMonthlyPremium] = useState('')
  const [coverage, setCoverage] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')

  const selectedCategoryData = policyCategories.find((c) => c.id === selectedCategory)
  const selectedTypeData = selectedCategoryData?.types.find((t) => t.value === selectedType)

  const handleCategorySelect = (categoryId: PolicyCategory) => {
    setSelectedCategory(categoryId)

    // Auto-select first policy type as default
    const categoryData = policyCategories.find((c) => c.id === categoryId)
    if (categoryData && categoryData.types.length > 0) {
      const firstType = categoryData.types[0]
      setSelectedType(firstType.value)

      // Initialize coverage with defaults
      const initialCoverage: Record<string, boolean> = {}
      firstType.coverageItems.forEach((item) => {
        initialCoverage[item.id] = item.defaultEnabled
      })
      setCoverage(initialCoverage)
    } else {
      setSelectedType('')
      setCoverage({})
    }
  }

  const handleTypeSelect = (typeValue: string) => {
    setSelectedType(typeValue)
    // Initialize coverage with defaults
    const typeData = selectedCategoryData?.types.find((t) => t.value === typeValue)
    if (typeData) {
      const initialCoverage: Record<string, boolean> = {}
      typeData.coverageItems.forEach((item) => {
        initialCoverage[item.id] = item.defaultEnabled
      })
      setCoverage(initialCoverage)
    }
  }

  const toggleCoverage = (itemId: string) => {
    setCoverage((prev) => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  const handleSave = () => {
    if (!selectedCategory || !selectedType) return

    const formData: PolicyFormData = {
      category: selectedCategory,
      type: selectedType,
      provider,
      policyName,
      sumAssured: parseFloat(sumAssured) || 0,
      monthlyPremium: parseFloat(monthlyPremium) || 0,
      coverage,
      notes,
    }

    onSave?.(formData)
    handleClose()
  }

  const handleClose = () => {
    setSelectedCategory(null)
    setSelectedType('')
    setProvider('aia')
    setPolicyName('')
    setSumAssured('')
    setMonthlyPremium('')
    setCoverage({})
    setNotes('')
    onClose()
  }

  const formatCurrency = (value: string) => {
    const num = value.replace(/[^\d]/g, '')
    if (!num) return ''
    return parseInt(num).toLocaleString()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      overlayClassName="bg-black/60"
      className="w-full max-w-lg mx-4 rounded-2xl border border-white/[0.08] bg-[#0a0a0a]"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-purple-500/20">
            <Shield className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Add Policy</h2>
            <p className="text-xs text-slate-500">Add an insurance policy to your portfolio</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
        {/* Step 1: Category Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">Policy Category</label>
          <div className="grid grid-cols-5 gap-2">
            {policyCategories.map((category) => {
              const Icon = category.icon
              const isSelected = selectedCategory === category.id
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategorySelect(category.id)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all',
                    isSelected
                      ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                      : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.04] hover:border-white/[0.1]'
                  )}
                >
                  <Icon className="h-7 w-7" />
                  <span className="text-xs font-medium text-center leading-tight">{category.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 2: Policy Type (only show if more than one option) */}
        {selectedCategoryData && selectedCategoryData.types.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Policy Type</label>
            <CustomDropdown
              value={selectedType}
              onChange={handleTypeSelect}
              options={selectedCategoryData.types.map((t) => ({ value: t.value, label: t.label }))}
              minWidth="100%"
              className="w-full"
            />
          </div>
        )}

        {/* Step 3: Policy Details */}
        {selectedType && (
          <>
            {/* Provider & Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Provider</label>
                <CustomDropdown
                  value={provider}
                  onChange={setProvider}
                  options={providerOptions}
                  minWidth="100%"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Policy Name</label>
                <input
                  type="text"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  placeholder="e.g., AIA Term Plus"
                  className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-purple-500/40"
                />
              </div>
            </div>

            {/* Sum Assured & Premium */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Sum Assured</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                  <input
                    type="text"
                    value={formatCurrency(sumAssured)}
                    onChange={(e) => setSumAssured(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="100,000"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-purple-500/40"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Monthly Premium</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                  <input
                    type="text"
                    value={formatCurrency(monthlyPremium)}
                    onChange={(e) => setMonthlyPremium(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="150"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-purple-500/40"
                  />
                </div>
              </div>
            </div>

            {/* Coverage Items */}
            {selectedTypeData && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Coverage</label>
                <div className="space-y-2">
                  {selectedTypeData.coverageItems.map((item) => {
                    const isEnabled = coverage[item.id] ?? item.defaultEnabled
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleCoverage(item.id)}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all',
                          isEnabled
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                        )}
                      >
                        <span className={cn('text-sm', isEnabled ? 'text-white' : 'text-slate-400')}>
                          {item.label}
                        </span>
                        <div
                          className={cn(
                            'h-5 w-5 rounded-md flex items-center justify-center transition-all',
                            isEnabled ? 'bg-emerald-500' : 'bg-white/[0.06] border border-white/[0.1]'
                          )}
                        >
                          {isEnabled && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details about this policy..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-purple-500/40 resize-none"
              />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-5 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!selectedCategory || !selectedType}
          className={cn(
            'px-5 py-2 rounded-lg text-sm font-medium transition-all',
            selectedCategory && selectedType
              ? 'bg-purple-500 hover:bg-purple-600 text-white'
              : 'bg-white/[0.05] text-slate-500 cursor-not-allowed'
          )}
        >
          Add Policy
        </button>
      </div>
    </Modal>
  )
}
