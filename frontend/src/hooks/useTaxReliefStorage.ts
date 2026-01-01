'use client'

import { useCallback, useEffect, useState } from 'react'
import type { TaxRelief, TaxResidencyStatus } from '@/lib/taxCalculations'
import { DEFAULT_RELIEFS } from '@/lib/taxCalculations'

// ============================================
// TYPES
// ============================================

interface PersistedTaxConfig {
  reliefs: { [reliefId: string]: number }
  residencyStatus: TaxResidencyStatus
  lastUpdated: string
}

interface TaxModeSettings {
  defaultResidency: TaxResidencyStatus
  preferredView: 'summary' | 'detailed'
}

const STORAGE_KEY_PREFIX = 'tax_reliefs_'
const SETTINGS_KEY = 'tax_mode_settings'

// SECURITY: Clear all sensitive financial data from localStorage
// Call this on logout to prevent data exposure if device is shared
export function clearAllSensitiveStorage(): void {
  if (typeof window === 'undefined') return
  try {
    // Clear all tax relief data (multiple years may be stored)
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))

    // Clear tax mode settings
    localStorage.removeItem(SETTINGS_KEY)

    // Clear any other potentially sensitive cached data
    localStorage.removeItem('financial_cache')
    localStorage.removeItem('user_preferences')
  } catch (error) {
    console.warn('Failed to clear localStorage:', error)
  }
}

// ============================================
// STORAGE UTILITIES
// ============================================

function getStorageKey(year: number): string {
  return `${STORAGE_KEY_PREFIX}${year}`
}

function safeGetItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const item = localStorage.getItem(key)
    if (!item) return defaultValue
    return JSON.parse(item) as T
  } catch {
    return defaultValue
  }
}

function safeSetItem(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('Failed to save to localStorage:', error)
  }
}

// ============================================
// HOOK: useTaxReliefStorage
// ============================================

interface UseTaxReliefStorageReturn {
  // Load reliefs for a specific year
  loadReliefs: (year: number, cpfContributions?: number) => TaxRelief[]

  // Save reliefs for a specific year
  saveReliefs: (year: number, reliefs: TaxRelief[], residencyStatus: TaxResidencyStatus) => void

  // Load residency status for a year
  loadResidencyStatus: (year: number) => TaxResidencyStatus

  // Clear reliefs for a specific year
  clearReliefs: (year: number) => void

  // Check if year has saved data
  hasStoredData: (year: number) => boolean
}

export function useTaxReliefStorage(): UseTaxReliefStorageReturn {
  const loadReliefs = useCallback((year: number, cpfContributions: number = 0): TaxRelief[] => {
    const stored = safeGetItem<PersistedTaxConfig | null>(getStorageKey(year), null)

    if (!stored) {
      // Return default reliefs with CPF pre-populated
      return DEFAULT_RELIEFS.map(relief => {
        if (relief.id === 'cpf-employee') {
          return {
            ...relief,
            claimedAmount: Math.min(cpfContributions, relief.maxAmount),
          }
        }
        return { ...relief }
      })
    }

    // Merge stored values with default reliefs (in case new reliefs were added)
    return DEFAULT_RELIEFS.map(relief => {
      const storedAmount = stored.reliefs[relief.id]

      // For CPF relief, use stored value or recalculate from contributions
      if (relief.id === 'cpf-employee') {
        const amount = storedAmount !== undefined
          ? storedAmount
          : Math.min(cpfContributions, relief.maxAmount)
        return {
          ...relief,
          claimedAmount: Math.min(amount, relief.maxAmount),
        }
      }

      return {
        ...relief,
        claimedAmount: storedAmount !== undefined
          ? Math.min(storedAmount, relief.maxAmount)
          : relief.claimedAmount,
      }
    })
  }, [])

  const saveReliefs = useCallback((
    year: number,
    reliefs: TaxRelief[],
    residencyStatus: TaxResidencyStatus
  ): void => {
    const config: PersistedTaxConfig = {
      reliefs: reliefs.reduce((acc, relief) => {
        acc[relief.id] = relief.claimedAmount
        return acc
      }, {} as { [reliefId: string]: number }),
      residencyStatus,
      lastUpdated: new Date().toISOString(),
    }
    safeSetItem(getStorageKey(year), config)
  }, [])

  const loadResidencyStatus = useCallback((year: number): TaxResidencyStatus => {
    const stored = safeGetItem<PersistedTaxConfig | null>(getStorageKey(year), null)
    return stored?.residencyStatus ?? 'resident'
  }, [])

  const clearReliefs = useCallback((year: number): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(getStorageKey(year))
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  }, [])

  const hasStoredData = useCallback((year: number): boolean => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(getStorageKey(year)) !== null
  }, [])

  return {
    loadReliefs,
    saveReliefs,
    loadResidencyStatus,
    clearReliefs,
    hasStoredData,
  }
}

// ============================================
// HOOK: useTaxModeSettings
// ============================================

interface UseTaxModeSettingsReturn {
  settings: TaxModeSettings
  updateSettings: (updates: Partial<TaxModeSettings>) => void
}

const DEFAULT_SETTINGS: TaxModeSettings = {
  defaultResidency: 'resident',
  preferredView: 'summary',
}

export function useTaxModeSettings(): UseTaxModeSettingsReturn {
  const [settings, setSettings] = useState<TaxModeSettings>(DEFAULT_SETTINGS)

  // Load settings on mount
  useEffect(() => {
    const stored = safeGetItem<TaxModeSettings>(SETTINGS_KEY, DEFAULT_SETTINGS)
    setSettings(stored)
  }, [])

  const updateSettings = useCallback((updates: Partial<TaxModeSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates }
      safeSetItem(SETTINGS_KEY, newSettings)
      return newSettings
    })
  }, [])

  return { settings, updateSettings }
}
