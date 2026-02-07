import type { LucideIcon } from 'lucide-react'

/**
 * Configuration for a person in a financial profile
 */
export interface ProfilePersonConfig {
  name: string
  age: number // Used to calculate dateOfBirth from base year
  displayColor: string
  residencyStatus: 'citizen' | 'pr'
  cpfBalances: {
    oa: number
    sa: number
    ma: number
  }
  income?: {
    name: string
    amount: number
    growthRate: number
    cpfWageType?: 'ow' | 'aw'
  }
}

/**
 * Gradient configuration for profile card backgrounds
 */
export interface ProfileGradient {
  from: string // Start color (hex)
  via?: string // Optional middle color
  to: string // End color (hex)
}

/**
 * Configuration for an asset in a financial profile
 */
export interface ProfileAssetConfig {
  name: string
  category: 'cash_savings' | 'stocks_etfs' | 'bonds' | 'property' | 'vehicle' | 'other'
  currentValue: number
  growthRate: number
  propertyType?: 'hdb-resale' | 'hdb-bto' | 'ec' | 'private-resale' | 'private-new' | null
}

/**
 * Configuration for a liability in a financial profile
 */
export interface ProfileLiabilityConfig {
  name: string
  category: 'mortgage' | 'car_loan' | 'student_loan' | 'credit_card' | 'personal_loan' | 'other'
  currentBalance: number
  interestRateApr: number
  minimumPayment: number
  linkedAssetIndex?: number // Index into the profile's assets[] array
}

/**
 * Display configuration for a financial profile template
 */
export interface FinancialProfile {
  id: string
  name: string
  tagline: string // Short subtitle shown on card
  description: string // Longer description for tooltips/details
  icon: LucideIcon
  gradient: ProfileGradient
  persons: ProfilePersonConfig[]
  assets?: ProfileAssetConfig[]
  liabilities?: ProfileLiabilityConfig[]
}

/**
 * Props for the ProfileSelectionModal component
 */
export interface ProfileSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectProfile: (profileId: string) => Promise<void>
  isLoading?: boolean
  loadingProfileId?: string | null
}

/**
 * Props for the ProfileCard component
 */
export interface ProfileCardProps {
  profile: FinancialProfile
  onSelect: (profileId: string) => void
  isLoading?: boolean
  isSelected?: boolean
  disabled?: boolean
}
