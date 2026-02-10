'use client'

import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/auth/AuthProvider'
import { personsApi } from '@/api/financial/persons'
import { QUERY_KEYS } from '@/lib/queryKeys'
import { usePersonFilterStore } from '@/stores'
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
  const { isAuthenticated } = useAuth()

  // Only fetch persons when authenticated
  // Use short staleTime to ensure data is refreshed frequently and stays in sync with DB
  const { data: persons = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.financial.persons,
    queryFn: async () => {
      const result = await personsApi.listPersons()
      return result.data
    },
    enabled: isAuthenticated,
    staleTime: 30_000, // Consider stale after 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
  })

  // Modal state from Zustand store
  const isPersonsModalOpen = usePersonFilterStore((s) => s.isPersonsModalOpen)
  const openPersonsModal = usePersonFilterStore((s) => s.openPersonsModal)
  const closePersonsModal = usePersonFilterStore((s) => s.closePersonsModal)

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
