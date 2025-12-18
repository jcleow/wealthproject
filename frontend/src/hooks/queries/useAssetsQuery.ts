import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assetsApi } from '@/api/financial'
import type { Asset } from '@/types/financial'
import type { UpdateMode } from '@/components/modals/FinancialFormModal/types'
import { QUERY_KEYS } from '@/lib/queryKeys'

export const ASSETS_QUERY_KEY = QUERY_KEYS.financial.assets

export function useAssetsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ASSETS_QUERY_KEY,
    queryFn: async () => {
      const result = await assetsApi.listAssets({ limit: -1 })
      return result.data
    },
    enabled: options?.enabled ?? true,
    staleTime: 30_000, // Consider fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })
}

export function useCreateAssetMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (asset: Omit<Asset, 'id' | 'updatedAt'>) =>
      assetsApi.createAsset(asset),
    onSuccess: (newAsset) => {
      // Update the assets cache
      queryClient.setQueryData<Asset[]>(ASSETS_QUERY_KEY, (old) =>
        old ? [...old, newAsset] : [newAsset]
      )
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.netWorth })
    },
  })
}

export function useUpdateAssetMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: {
      id: string
      updates: Partial<Asset> & {
        updateMode?: UpdateMode
      }
    }) => assetsApi.updateAsset(id, updates),
    onSuccess: () => {
      // Invalidate timeline and netWorth to refetch with new/updated asset
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.netWorth })
    },
  })
}

export function useStopAssetMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) =>
      assetsApi.stopAsset(id, endDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.netWorth })
    },
  })
}

export function useDeleteAssetMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => assetsApi.deleteAsset(id),
    onSuccess: (_, deletedId) => {
      // Update the assets cache
      queryClient.setQueryData<Asset[]>(ASSETS_QUERY_KEY, (old) =>
        old?.filter((asset) => asset.id !== deletedId) ?? []
      )
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.netWorth })
    },
  })
}
