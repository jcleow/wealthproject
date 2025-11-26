import { useQuery } from '@tanstack/react-query'

import { financialApi } from '@/services/financialApi'
import type { ScenarioEvent } from '@/types/scenario'

export function useScenarioEvent(id?: string, enabled = true) {
  return useQuery<ScenarioEvent | undefined>({
    queryKey: ['scenarioEvent', id],
    queryFn: () => (id ? financialApi.getScenarioEvent(id) : undefined),
    enabled: enabled && Boolean(id),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })
}
