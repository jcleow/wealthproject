import { useQuery } from '@tanstack/react-query'

import { financialApi } from '@/services/financialApi'
import type { ScenarioEvent } from '@/types/scenario'
import { QUERY_KEYS } from '@/lib/queryKeys'

export function useScenarioEvent(
  id?: string,
  enabled = true,
  initialData?: ScenarioEvent
) {
  return useQuery<ScenarioEvent | undefined>({
    queryKey: [...QUERY_KEYS.financial.scenarioEvents, id],
    queryFn: () => (id ? financialApi.getScenarioEvent(id) : undefined),
    enabled: enabled && Boolean(id),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    retry: 1,
    initialData,
    onSuccess: (data) => {
      if (process.env.NODE_ENV === 'development' && data) {
        // Surface server payload shape for debugging impacts missing
        console.debug('[useScenarioEvent] fetched', { id: data.id, impacts: data.impacts?.length ?? 0, occursOn: (data as any).occursOn ?? (data as any).occurs_on })
      }
    },
    onError: (err) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useScenarioEvent] fetch error', err)
      }
    },
  })
}
