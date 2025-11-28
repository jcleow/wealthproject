import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/services/financialApi'
import type { Asset } from '@/types/financial'

export const ASSETS_QUERY_KEY = ['assets'] as const

export function useAssetsQuery() {
  return useQuery({
    queryKey: ASSETS_QUERY_KEY,
    queryFn: financialApi.listAssets,
    staleTime: 30_000, // Consider fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })
}

export function useCreateAssetMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (asset: Omit<Asset, 'id' | 'updatedAt'>) =>
      financialApi.createAsset(asset),
    onSuccess: (newAsset) => {
      // Update the assets cache
      queryClient.setQueryData<Asset[]>(ASSETS_QUERY_KEY, (old) =>
        old ? [...old, newAsset] : [newAsset]
      )
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['net-worth'] })
    },
  })
}

export function useUpdateAssetMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Asset> }) =>
      financialApi.updateAsset(id, updates),
    onSuccess: (updatedAsset) => {
      // Update the assets cache
      queryClient.setQueryData<Asset[]>(ASSETS_QUERY_KEY, (old) =>
        old?.map((asset) => asset.id === updatedAsset.id ? updatedAsset : asset) ?? []
      )
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['net-worth'] })
    },
  })
}

export function useDeleteAssetMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => financialApi.deleteAsset(id),
    onSuccess: (_, deletedId) => {
      // Update the assets cache
      queryClient.setQueryData<Asset[]>(ASSETS_QUERY_KEY, (old) =>
        old?.filter((asset) => asset.id !== deletedId) ?? []
      )
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['net-worth'] })
    },
  })
}