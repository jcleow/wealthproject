import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { financialApi } from '@/services/financialApi'
import type { ScenarioEvent } from '@/types/scenario'
import { QUERY_KEYS } from '@/lib/queryKeys'

export function useScenarioEvents() {
  const queryClient = useQueryClient()

  const query = useQuery<ScenarioEvent[]>({
    queryKey: QUERY_KEYS.financial.scenarioEvents,
    queryFn: () => financialApi.listScenarioEvents(),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.scenarioEvents }).catch(() => {
        // ignore cache errors
      })
    }
    window.addEventListener('financial-data-refresh', handler)
    return () => window.removeEventListener('financial-data-refresh', handler)
  }, [queryClient])

  return {
    events: query.data ?? [],
    query,
  }
}
