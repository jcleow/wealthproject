'use client'

import { useState } from 'react'
import { X, Shield, Stethoscope, HeartHandshake, Heart, Accessibility, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { useColorScheme } from '@/stores'
import { getInsuranceTheme } from '@/lib/insurance-theme'

/**
 * AddPolicyModal - Modal for adding insurance policies (Monet-styled)
 *
 * Flow:
 * 1. Select policy category (Life, Health, CI, LTC, PA)
 * 2. Select specific policy type within category
 * 3. Fill in policy details (provider, sum assured, premium)
 * 4. Toggle coverage items
 */

// =============================================================================
// Category Accent Colors (static - used for category icons)
// =============================================================================

const accentColors = {
  lavender: '#9B8BB4',
  sage: '#7FB285',
  coralRose: '#E8A898',
  sunlightGold: '#D4C5A9',
  blue: '#7BA3C9',
}

type PolicyCategory = 'life' | 'health' | 'critical_illness' | 'long_term_care' | 'personal_accident'

interface PolicyCategoryOption {
  id: PolicyCategory
  label: string
  icon: typeof Shield
  color: string
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
    color: accentColors.lavender,
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
    color: accentColors.sage,
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
    color: accentColors.coralRose,
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
    color: accentColors.sunlightGold,
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
    color: '#6B8BB4', // Soft blue
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
  const colorScheme = useColorScheme()
  const monetColors = getInsuranceTheme(colorScheme)
  const isMonet = colorScheme === 'monet'

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

  // Input style
  const inputStyle: React.CSSProperties = {
    background: monetColors.inputBg,
    border: `1px solid ${monetColors.cardBorder}`,
    color: monetColors.textPrimary,
  }

  const inputClassName = "w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-all"

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      overlayClassName="bg-black/40 backdrop-blur-sm"
      className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
    >
      <div
        style={{
          background: isMonet
            ? `linear-gradient(135deg, #FAF8F5 0%, #F0F4F8 50%, #FFFEF9 100%)`
            : 'rgba(17, 17, 17, 0.95)',
          border: `1px solid ${monetColors.cardBorder}`,
          borderRadius: '1rem',
          boxShadow: `0 25px 50px -12px ${monetColors.shadowMedium}`,
        }}
      >
      {/* Header */}
      <div
        className="flex items-center justify-between p-5"
        style={{ borderBottom: `1px solid ${monetColors.cardBorder}` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center h-11 w-11 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${monetColors.lavender}, ${monetColors.lavenderDark})`,
              boxShadow: `0 4px 12px ${monetColors.shadowSoft}`,
            }}
          >
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2
              className="text-lg font-semibold"
              style={{
                color: monetColors.textPrimary,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
              }}
            >
              Add Policy
            </h2>
            <p className="text-xs" style={{ color: monetColors.textMuted }}>
              Add an insurance policy to your portfolio
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="flex items-center justify-center h-9 w-9 rounded-xl transition-all hover:scale-105"
          style={{
            background: monetColors.surfaceBg,
            color: monetColors.textSecondary,
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
        {/* Step 1: Category Selection */}
        <div>
          <label
            className="block text-sm font-medium mb-3"
            style={{ color: monetColors.textSecondary }}
          >
            Policy Category
          </label>
          <div className="grid grid-cols-5 gap-2">
            {policyCategories.map((category) => {
              const Icon = category.icon
              const isSelected = selectedCategory === category.id
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategorySelect(category.id)}
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all duration-200 hover:scale-105"
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, ${category.color}20, ${category.color}10)`
                      : monetColors.surfaceBg,
                    border: `1px solid ${isSelected ? `${category.color}60` : monetColors.cardBorder}`,
                    boxShadow: isSelected ? `0 4px 12px ${category.color}20` : 'none',
                  }}
                >
                  <Icon
                    className="h-6 w-6"
                    style={{ color: isSelected ? category.color : monetColors.textMuted }}
                  />
                  <span
                    className="text-[10px] font-medium text-center leading-tight"
                    style={{ color: isSelected ? monetColors.textPrimary : monetColors.textMuted }}
                  >
                    {category.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 2: Policy Type (only show if more than one option) */}
        {selectedCategoryData && selectedCategoryData.types.length > 1 && (
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: monetColors.textSecondary }}
            >
              Policy Type
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedCategoryData.types.map((type) => {
                const isSelected = selectedType === type.value
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleTypeSelect(type.value)}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                    style={{
                      background: isSelected
                        ? `linear-gradient(135deg, ${selectedCategoryData.color}, ${selectedCategoryData.color}CC)`
                        : monetColors.cardBg,
                      color: isSelected ? 'white' : monetColors.textSecondary,
                      border: `1px solid ${isSelected ? 'transparent' : monetColors.cardBorder}`,
                      boxShadow: isSelected ? `0 2px 8px ${selectedCategoryData.color}30` : 'none',
                    }}
                  >
                    {type.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: Policy Details */}
        {selectedType && (
          <>
            {/* Provider & Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: monetColors.textSecondary }}
                >
                  Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className={inputClassName}
                  style={{
                    ...inputStyle,
                    cursor: 'pointer',
                  }}
                >
                  {providerOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: monetColors.textSecondary }}
                >
                  Policy Name
                </label>
                <input
                  type="text"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  placeholder="e.g., AIA Term Plus"
                  className={inputClassName}
                  style={{
                    ...inputStyle,
                  }}
                />
              </div>
            </div>

            {/* Sum Assured & Premium */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: monetColors.textSecondary }}
                >
                  Sum Assured
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: monetColors.textMuted }}
                  >
                    $
                  </span>
                  <input
                    type="text"
                    value={formatCurrency(sumAssured)}
                    onChange={(e) => setSumAssured(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="100,000"
                    className={cn(inputClassName, 'pl-7')}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: monetColors.textSecondary }}
                >
                  Monthly Premium
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: monetColors.textMuted }}
                  >
                    $
                  </span>
                  <input
                    type="text"
                    value={formatCurrency(monthlyPremium)}
                    onChange={(e) => setMonthlyPremium(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="150"
                    className={cn(inputClassName, 'pl-7')}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Coverage Items */}
            {selectedTypeData && (
              <div>
                <label
                  className="block text-sm font-medium mb-3"
                  style={{ color: monetColors.textSecondary }}
                >
                  Coverage
                </label>
                <div className="space-y-2">
                  {selectedTypeData.coverageItems.map((item) => {
                    const isEnabled = coverage[item.id] ?? item.defaultEnabled
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleCoverage(item.id)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200"
                        style={{
                          background: isEnabled
                            ? `${monetColors.sage}15`
                            : monetColors.surfaceBg,
                          border: `1px solid ${isEnabled ? `${monetColors.sage}40` : monetColors.cardBorder}`,
                        }}
                      >
                        <span
                          className="text-sm"
                          style={{ color: isEnabled ? monetColors.textPrimary : monetColors.textMuted }}
                        >
                          {item.label}
                        </span>
                        <div
                          className="h-5 w-5 rounded-md flex items-center justify-center transition-all"
                          style={{
                            background: isEnabled ? monetColors.sage : monetColors.cardBg,
                            border: isEnabled ? 'none' : `1px solid ${monetColors.cardBorder}`,
                          }}
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
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: monetColors.textSecondary }}
              >
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details about this policy..."
                rows={2}
                className={cn(inputClassName, 'resize-none')}
                style={inputStyle}
              />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between p-5"
        style={{ borderTop: `1px solid ${monetColors.cardBorder}` }}
      >
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 text-sm transition-colors"
          style={{ color: monetColors.textMuted }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!selectedCategory || !selectedType}
          className={cn(
            'px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
            selectedCategory && selectedType ? 'hover:scale-105' : 'opacity-50 cursor-not-allowed'
          )}
          style={{
            background:
              selectedCategory && selectedType
                ? `linear-gradient(135deg, ${monetColors.lavender}, ${monetColors.lavenderDark})`
                : 'rgba(155, 139, 180, 0.2)',
            color: selectedCategory && selectedType ? 'white' : monetColors.textMuted,
            boxShadow:
              selectedCategory && selectedType ? `0 4px 12px ${monetColors.shadowSoft}` : 'none',
          }}
        >
          Add Policy
        </button>
      </div>
      </div>
    </Modal>
  )
}
