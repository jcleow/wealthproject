'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import { usePersonsQuery } from '@/hooks/queries/usePersonsQuery'
import type { Person } from '@/types/person'

// ============================================
// TYPES
// ============================================

export interface PersonFilterContextType {
  // All persons (included and excluded)
  persons: Person[]
  isLoading: boolean
  error: Error | null

  // Included persons only (for filtering)
  includedPersons: Person[]
  includedPersonIds: Set<string>

  // Check if a person is included
  isPersonIncluded: (personId: string | null | undefined) => boolean

  // Check if data should be shown based on its personId
  // Returns true if personId is null (unassigned) OR if the person is included
  shouldShowData: (personId: string | null | undefined) => boolean

  // Modal state
  isPersonsModalOpen: boolean
  openPersonsModal: () => void
  closePersonsModal: () => void
}

// ============================================
// CONTEXT
// ============================================

const PersonFilterContext = createContext<PersonFilterContextType | null>(null)

// ============================================
// PROVIDER
// ============================================

interface PersonFilterProviderProps {
  children: ReactNode
}

export function PersonFilterProvider({ children }: PersonFilterProviderProps) {
  // Fetch persons from API
  const { data: persons = [], isLoading, error } = usePersonsQuery()

  // Modal state
  const [isPersonsModalOpen, setIsPersonsModalOpen] = useState(false)

  // Derived: included persons
  const includedPersons = useMemo(
    () => persons.filter((p) => p.isIncluded),
    [persons]
  )

  const includedPersonIds = useMemo(
    () => new Set(includedPersons.map((p) => p.id)),
    [includedPersons]
  )

  // Helper functions
  const isPersonIncluded = useCallback(
    (personId: string | null | undefined): boolean => {
      if (!personId) return true // No person = always included
      return includedPersonIds.has(personId)
    },
    [includedPersonIds]
  )

  const shouldShowData = useCallback(
    (personId: string | null | undefined): boolean => {
      // Show data if:
      // 1. No person assigned (personId is null/undefined)
      // 2. The assigned person is included
      return isPersonIncluded(personId)
    },
    [isPersonIncluded]
  )

  // Modal handlers
  const openPersonsModal = useCallback(() => {
    setIsPersonsModalOpen(true)
  }, [])

  const closePersonsModal = useCallback(() => {
    setIsPersonsModalOpen(false)
  }, [])

  // Memoized context value
  const contextValue = useMemo<PersonFilterContextType>(
    () => ({
      persons,
      isLoading,
      error: error as Error | null,
      includedPersons,
      includedPersonIds,
      isPersonIncluded,
      shouldShowData,
      isPersonsModalOpen,
      openPersonsModal,
      closePersonsModal,
    }),
    [
      persons,
      isLoading,
      error,
      includedPersons,
      includedPersonIds,
      isPersonIncluded,
      shouldShowData,
      isPersonsModalOpen,
      openPersonsModal,
      closePersonsModal,
    ]
  )

  return (
    <PersonFilterContext.Provider value={contextValue}>
      {children}
    </PersonFilterContext.Provider>
  )
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to access person filter context
 * Throws if used outside provider
 */
export function usePersonFilter(): PersonFilterContextType {
  const context = useContext(PersonFilterContext)
  if (!context) {
    throw new Error('usePersonFilter must be used within a PersonFilterProvider')
  }
  return context
}

/**
 * Optional hook that returns null if outside provider
 * Use for conditional usage in components that may or may not have the provider
 */
export function usePersonFilterOptional(): PersonFilterContextType | null {
  return useContext(PersonFilterContext)
}

/**
 * Helper hook to filter an array of items by person inclusion
 * @param items Array of items with optional personId
 * @param getPersonId Function to extract personId from item
 * @returns Filtered array containing only items belonging to included persons
 */
export function useFilterByPerson<T>(
  items: T[],
  getPersonId: (item: T) => string | null | undefined
): T[] {
  const { shouldShowData } = usePersonFilter()
  return useMemo(
    () => items.filter((item) => shouldShowData(getPersonId(item))),
    [items, getPersonId, shouldShowData]
  )
}
