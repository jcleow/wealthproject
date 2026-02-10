import { useState, useCallback, useMemo } from 'react'
import type { Person } from '@/types/person'

/**
 * usePersonFilterLocal -- shared hook for person multi-select filtering.
 *
 * Encapsulates the pattern where null means all selected (no filter applied),
 * a Set tracks individually toggled persons, and toggling the last remaining
 * deselection collapses back to null.
 *
 * Used by JourneyTab and MyCoverageTab for the PersonViewDropdown component.
 */
export function usePersonFilterLocal(persons: Person[]) {
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string> | null>(null)

  const togglePerson = useCallback(
    (personId: string) => {
      setSelectedPersonIds((previousIds) => {
        // null = "all selected". Clicking a person deselects them.
        if (previousIds === null) {
          return new Set(
            persons.filter((person) => person.id !== personId).map((person) => person.id)
          )
        }
        const nextIds = new Set(previousIds)
        if (nextIds.has(personId)) {
          nextIds.delete(personId)
        } else {
          nextIds.add(personId)
        }
        // If every person is now selected, collapse back to null
        if (nextIds.size === persons.length) {
          return null
        }
        return nextIds
      })
    },
    [persons]
  )

  const toggleSelectAll = useCallback(() => {
    setSelectedPersonIds((previousIds) =>
      previousIds === null ? new Set<string>() : null
    )
  }, [])

  const isPersonSelected = useCallback(
    (personId: string): boolean => {
      if (selectedPersonIds === null) return true
      return selectedPersonIds.has(personId)
    },
    [selectedPersonIds]
  )

  const selectedPersons = useMemo(() => {
    if (selectedPersonIds === null) return persons
    return persons.filter((person) => selectedPersonIds.has(person.id))
  }, [persons, selectedPersonIds])

  const allSelected = selectedPersonIds === null

  return {
    selectedPersonIds,
    togglePerson,
    toggleSelectAll,
    isPersonSelected,
    selectedPersons,
    allSelected,
  }
}
