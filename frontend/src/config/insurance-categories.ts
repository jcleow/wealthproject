// =============================================================================
// Master insurance category configuration.
//
// Single source of truth for category icons, labels, and colors used
// across JourneyTab, MyCoverageTab, PolicyDetailModal, and AddPolicyModal.
// =============================================================================

import {
  Heart,
  Shield,
  HeartPulse,
  HeartHandshake,
  Building2,
  Activity,
  Zap,
  Accessibility,
  ShieldAlert,
  Link,
} from 'lucide-react'

// =============================================================================
// Core category metadata
// =============================================================================

export interface InsuranceCategoryMeta {
  icon: React.ElementType
  label: string
  color: string
}

/**
 * Master category config keyed by the canonical category identifiers used in
 * the database and throughout the insurance module.
 *
 * Colors are sourced from the Pencil design tokens.
 */
export const INSURANCE_CATEGORIES: Record<string, InsuranceCategoryMeta> = {
  // Database categories (used by PolicyDetailModal, PoliciesTab)
  life: { icon: Heart, label: 'Life/TPD', color: '#3D5A80' },
  critical_illness: { icon: Shield, label: 'Critical Illness', color: '#6B7280' },
  hospitalization: { icon: Building2, label: 'Hospitalization', color: '#3D5A80' },
  health: { icon: Building2, label: 'Hospitalization', color: '#3D5A80' },
  accident: { icon: Activity, label: 'Personal Accident', color: '#E5A100' },
  personal_accident: { icon: Zap, label: 'Personal Accident', color: '#E5A100' },
  disability: { icon: Accessibility, label: 'Disability', color: '#A78BFA' },
  long_term_care: { icon: Link, label: 'Disability', color: '#A78BFA' },
}

/**
 * Category config for the AddPolicyModal category selector.
 * These are the user-facing categories shown in the modal grid.
 */
export const ADD_POLICY_CATEGORIES = [
  {
    id: 'life' as const,
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
    id: 'health' as const,
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
    id: 'critical_illness' as const,
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
    id: 'long_term_care' as const,
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
    id: 'personal_accident' as const,
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

/**
 * JourneyTab dark-mode category chart config.
 * Keyed by the JourneyTab-specific individual category keys.
 */
export const JOURNEY_CATEGORY_CONFIG = {
  lifeTpd: {
    icon: Shield,
    label: 'Life/TPD',
    color: '#3D5A80',
  },
  criticalIllness: {
    icon: HeartPulse,
    label: 'Critical Illness',
    color: '#6B7280',
  },
  earlyCi: {
    icon: ShieldAlert,
    label: 'Early CI',
    color: '#14B8A6',
  },
  disability: {
    icon: Accessibility,
    label: 'Disability',
    color: '#A78BFA',
  },
  personalAccident: {
    icon: Zap,
    label: 'Personal Accident',
    color: '#E5A100',
  },
} as const

// =============================================================================
// Accessor helpers
// =============================================================================

const DEFAULT_CATEGORY_META: InsuranceCategoryMeta = {
  icon: Heart,
  label: 'Insurance',
  color: '#3D5A80',
}

/** Get the icon component for a given category key. */
export function getCategoryIcon(category: string): React.ElementType {
  return (INSURANCE_CATEGORIES[category] ?? DEFAULT_CATEGORY_META).icon
}

/** Get the brand color for a given category key. */
export function getCategoryColor(category: string): string {
  return (INSURANCE_CATEGORIES[category] ?? DEFAULT_CATEGORY_META).color
}

/** Get the display label for a given category key. */
export function getCategoryLabel(category: string): string {
  return (INSURANCE_CATEGORIES[category] ?? DEFAULT_CATEGORY_META).label
}
