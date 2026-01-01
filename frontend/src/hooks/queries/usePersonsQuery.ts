import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { personsApi, type BulkPersonUpdate } from '@/api/financial/persons'
import { QUERY_KEYS } from '@/lib/queryKeys'
import type { PersonCreatePayload, PersonUpdatePayload } from '@/types/person'

export const PERSONS_QUERY_KEY = QUERY_KEYS.financial.persons

/**
 * Query hook to fetch all persons for the current user
 */
export function usePersonsQuery() {
  return useQuery({
    queryKey: PERSONS_QUERY_KEY,
    queryFn: personsApi.listPersons,
  })
}

/**
 * Query hook to fetch a single person by ID
 */
export function usePersonQuery(id: string | undefined) {
  return useQuery({
    queryKey: [...PERSONS_QUERY_KEY, id] as const,
    queryFn: () => personsApi.getPerson(id!),
    enabled: !!id,
  })
}

/**
 * Mutation hook to create a new person
 */
export function useCreatePersonMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: PersonCreatePayload) => personsApi.createPerson(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONS_QUERY_KEY })
    },
  })
}

/**
 * Mutation hook to update an existing person
 */
export function useUpdatePersonMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: PersonUpdatePayload }) =>
      personsApi.updatePerson(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONS_QUERY_KEY })
    },
    onError: () => {
      // Refresh persons list if update fails (e.g., person no longer exists)
      queryClient.invalidateQueries({ queryKey: PERSONS_QUERY_KEY })
    },
  })
}

/**
 * Mutation hook to delete a person
 */
export function useDeletePersonMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => personsApi.deletePerson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONS_QUERY_KEY })
      // Also invalidate incomes and CPF since their person links may have changed
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.incomes })
      queryClient.invalidateQueries({ queryKey: ['cpf'] })
    },
    onError: () => {
      // Refresh persons list if delete fails (e.g., person already deleted)
      queryClient.invalidateQueries({ queryKey: PERSONS_QUERY_KEY })
    },
  })
}

/**
 * Mutation hook to toggle a person's inclusion status
 */
export function useTogglePersonIncludedMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => personsApi.togglePersonIncluded(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONS_QUERY_KEY })
      // Invalidate all financial data since visibility may have changed
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
    onError: () => {
      // If toggle fails (e.g., person no longer exists), refresh the persons list
      // to remove stale cached entries
      queryClient.invalidateQueries({ queryKey: PERSONS_QUERY_KEY })
    },
  })
}

/**
 * Helper hook to get included persons only
 */
export function useIncludedPersonsQuery() {
  const query = usePersonsQuery()

  return {
    ...query,
    data: query.data?.filter((p) => p.isIncluded) ?? [],
  }
}

/**
 * Mutation hook to bulk update multiple persons
 * Used for batch saving changes from the PersonsModal
 */
export function useBulkUpdatePersonsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: BulkPersonUpdate[]) => personsApi.bulkUpdatePersons(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONS_QUERY_KEY })
      // Invalidate all financial data since visibility may have changed
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
    onError: () => {
      // If bulk update fails, refresh persons list
      queryClient.invalidateQueries({ queryKey: PERSONS_QUERY_KEY })
    },
  })
}
