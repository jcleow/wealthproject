'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useAssetsQuery,
  useLiabilitiesQuery,
  useIncomesQuery,
  useExpensesQuery,
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useDeleteAssetMutation,
} from '@/hooks/queries'

export function QueryDebugPanel() {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)

  // Queries
  const assetsQuery = useAssetsQuery()
  const liabilitiesQuery = useLiabilitiesQuery()
  const incomesQuery = useIncomesQuery()
  const expensesQuery = useExpensesQuery()

  // Mutations
  const createAssetMutation = useCreateAssetMutation()
  const updateAssetMutation = useUpdateAssetMutation()
  const deleteAssetMutation = useDeleteAssetMutation()

  // Test functions
  const testCreateAsset = async () => {
    try {
      await createAssetMutation.mutateAsync({
        name: `Test Asset ${Date.now()}`,
        category: 'Investment',
        currentValue: Math.floor(Math.random() * 100000),
        annualGrowthRate: 5,
      })
      console.log('✅ Asset created successfully')
    } catch (error) {
      console.error('❌ Failed to create asset:', error)
    }
  }

  const testUpdateAsset = async () => {
    const assets = assetsQuery.data ?? []
    if (assets.length === 0) {
      console.log('No assets to update')
      return
    }

    const asset = assets[0]
    try {
      await updateAssetMutation.mutateAsync({
        id: asset.id,
        updates: {
          currentValue: asset.currentValue + 1000,
          name: asset.name + ' (Updated)',
        },
      })
      console.log('✅ Asset updated successfully')
    } catch (error) {
      console.error('❌ Failed to update asset:', error)
    }
  }

  const testDeleteAsset = async () => {
    const assets = assetsQuery.data ?? []
    const testAsset = assets.find(a => a.name.includes('Test Asset'))

    if (!testAsset) {
      console.log('No test asset to delete')
      return
    }

    try {
      await deleteAssetMutation.mutateAsync(testAsset.id)
      console.log('✅ Asset deleted successfully')
    } catch (error) {
      console.error('❌ Failed to delete asset:', error)
    }
  }

  const invalidateAll = () => {
    queryClient.invalidateQueries()
    console.log('🔄 All queries invalidated')
  }

  const clearCache = () => {
    queryClient.clear()
    console.log('🗑️ Cache cleared')
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 rounded-lg bg-purple-600 px-4 py-2 text-white shadow-lg hover:bg-purple-700"
      >
        🐛 Debug Panel
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[600px] overflow-auto rounded-lg border border-gray-700 bg-gray-900 p-4 text-white shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">TanStack Query Debug Panel</h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">✕</button>
      </div>

      {/* Query States */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-purple-400">Query States</h4>
        <div className="space-y-2 text-sm">
          <QueryStatus name="Assets" query={assetsQuery} />
          <QueryStatus name="Liabilities" query={liabilitiesQuery} />
          <QueryStatus name="Incomes" query={incomesQuery} />
          <QueryStatus name="Expenses" query={expensesQuery} />
        </div>
      </div>

      {/* Mutation States */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-purple-400">Mutation States</h4>
        <div className="space-y-1 text-sm">
          <MutationStatus name="Create Asset" mutation={createAssetMutation} />
          <MutationStatus name="Update Asset" mutation={updateAssetMutation} />
          <MutationStatus name="Delete Asset" mutation={deleteAssetMutation} />
        </div>
      </div>

      {/* Test Actions */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-purple-400">Test Actions</h4>
        <div className="space-y-2">
          <button
            onClick={testCreateAsset}
            disabled={createAssetMutation.isLoading}
            className="w-full px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-sm"
          >
            {createAssetMutation.isLoading ? 'Creating...' : '➕ Create Test Asset'}
          </button>
          <button
            onClick={testUpdateAsset}
            disabled={updateAssetMutation.isLoading || !assetsQuery.data?.length}
            className="w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm"
          >
            {updateAssetMutation.isLoading ? 'Updating...' : '✏️ Update First Asset'}
          </button>
          <button
            onClick={testDeleteAsset}
            disabled={deleteAssetMutation.isLoading}
            className="w-full px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded text-sm"
          >
            {deleteAssetMutation.isLoading ? 'Deleting...' : '🗑️ Delete Test Asset'}
          </button>
        </div>
      </div>

      {/* Cache Control */}
      <div>
        <h4 className="font-semibold mb-2 text-purple-400">Cache Control</h4>
        <div className="space-y-2">
          <button
            onClick={invalidateAll}
            className="w-full px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
          >
            🔄 Invalidate All Queries
          </button>
          <button
            onClick={clearCache}
            className="w-full px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
          >
            🗑️ Clear All Cache
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <h4 className="font-semibold mb-2 text-purple-400">Stats</h4>
        <div className="text-xs space-y-1">
          <div>Assets: {assetsQuery.data?.length ?? 0} items</div>
          <div>Liabilities: {liabilitiesQuery.data?.length ?? 0} items</div>
          <div>Incomes: {incomesQuery.data?.length ?? 0} items</div>
          <div>Expenses: {expensesQuery.data?.length ?? 0} items</div>
        </div>
      </div>
    </div>
  )
}

function QueryStatus({ name, query }: { name: string; query: any }) {
  const getStatusColor = () => {
    if (query.isLoading) return 'text-yellow-400'
    if (query.isError) return 'text-red-400'
    if (query.isSuccess) return 'text-green-400'
    return 'text-gray-400'
  }

  const getStatusText = () => {
    if (query.isLoading) return '⏳ Loading'
    if (query.isError) return '❌ Error'
    if (query.isSuccess && query.isFetching) return '🔄 Refetching'
    if (query.isSuccess) return '✅ Success'
    return '⭕ Idle'
  }

  return (
    <div className="flex justify-between items-center">
      <span>{name}:</span>
      <span className={getStatusColor()}>
        {getStatusText()}
        {query.dataUpdatedAt && (
          <span className="text-xs text-gray-500 ml-2">
            ({new Date(query.dataUpdatedAt).toLocaleTimeString()})
          </span>
        )}
      </span>
    </div>
  )
}

function MutationStatus({ name, mutation }: { name: string; mutation: any }) {
  const getStatusColor = () => {
    if (mutation.isLoading) return 'text-yellow-400'
    if (mutation.isError) return 'text-red-400'
    if (mutation.isSuccess) return 'text-green-400'
    return 'text-gray-400'
  }

  const getStatusText = () => {
    if (mutation.isLoading) return '⏳ Loading'
    if (mutation.isError) return `❌ Error: ${mutation.error?.message}`
    if (mutation.isSuccess) return '✅ Success'
    return '⭕ Idle'
  }

  return (
    <div className="flex justify-between items-center">
      <span className="text-xs">{name}:</span>
      <span className={`text-xs ${getStatusColor()}`}>{getStatusText()}</span>
    </div>
  )
}