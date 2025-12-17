import { useState, useEffect } from 'react'
import { Trash2, Plus, X } from 'lucide-react'

import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/format'
import { useCashAccountsQuery } from '@/hooks/queries/useCashAccountsQuery'
import { useInvestmentsQuery } from '@/hooks/queries/useInvestmentsQuery'
import {
  useIncomeAllocationsQuery,
  useCreateIncomeAllocationMutation,
  useUpdateIncomeAllocationMutation,
  useDeleteIncomeAllocationMutation,
} from '@/hooks/queries/useIncomeAllocationsQuery'
import type { IncomeAllocation, CreateIncomeAllocationPayload } from '@/api/financial/incomes'

type AllocationType = 'percentage' | 'fixed'
type TargetType = 'cash_account' | 'investment'

interface IncomeAllocationModalProps {
  isOpen: boolean
  onClose: () => void
  incomeId: string
  incomeName: string
  incomeAmount: number // annual amount for context
  initialEditAllocationId?: string // If provided, auto-select this allocation for editing
}

export function IncomeAllocationModal({
  isOpen,
  onClose,
  incomeId,
  incomeName,
  incomeAmount,
  initialEditAllocationId,
}: IncomeAllocationModalProps) {
  const { data: allocations = [], isLoading: allocationsLoading } = useIncomeAllocationsQuery(incomeId)
  const { data: cashAccounts = [] } = useCashAccountsQuery()
  const { data: investments = [] } = useInvestmentsQuery({ enabled: isOpen })

  const createMutation = useCreateIncomeAllocationMutation()
  const updateMutation = useUpdateIncomeAllocationMutation()
  const deleteMutation = useDeleteIncomeAllocationMutation()

  const [editingAllocation, setEditingAllocation] = useState<IncomeAllocation | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [hasAutoSelected, setHasAutoSelected] = useState(false)

  // Form state
  const [targetType, setTargetType] = useState<TargetType>('investment')
  const [targetId, setTargetId] = useState('')
  const [allocationType, setAllocationType] = useState<AllocationType>('percentage')
  const [allocationValue, setAllocationValue] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const resetForm = () => {
    setTargetType('investment')
    setTargetId('')
    setAllocationType('percentage')
    setAllocationValue('')
    setSearchTerm('')
    setEditingAllocation(null)
    setIsAddingNew(false)
  }

  // Filter options based on search term
  const filteredInvestments = investments.filter((inv) =>
    inv.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const filteredCashAccounts = cashAccounts.filter((ca) =>
    ca.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    if (!isOpen) {
      resetForm()
      setHasAutoSelected(false)
    }
  }, [isOpen])

  // Auto-select the allocation for editing when initialEditAllocationId is provided
  useEffect(() => {
    if (isOpen && initialEditAllocationId && allocations.length > 0 && !hasAutoSelected) {
      const targetAllocation = allocations.find((a) => a.id === initialEditAllocationId)
      if (targetAllocation) {
        setEditingAllocation(targetAllocation)
        setHasAutoSelected(true)
      }
    }
  }, [isOpen, initialEditAllocationId, allocations, hasAutoSelected])

  useEffect(() => {
    if (editingAllocation) {
      if (editingAllocation.targetInvestmentId) {
        setTargetType('investment')
        setTargetId(editingAllocation.targetInvestmentId)
      } else if (editingAllocation.targetCashAccountId) {
        setTargetType('cash_account')
        setTargetId(editingAllocation.targetCashAccountId)
      }
      setAllocationType(editingAllocation.allocationType)
      setAllocationValue(editingAllocation.allocationValue.toString())
    }
  }, [editingAllocation])

  const handleSave = async () => {
    if (!targetId || !allocationValue) return

    const payload: CreateIncomeAllocationPayload = {
      allocationType,
      allocationValue, // Keep as string to avoid precision loss
      ...(targetType === 'investment'
        ? { targetInvestmentId: targetId }
        : { targetCashAccountId: targetId }),
    }

    if (editingAllocation) {
      await updateMutation.mutateAsync({
        incomeId,
        allocationId: editingAllocation.id,
        payload,
      })
    } else {
      await createMutation.mutateAsync({ incomeId, payload })
    }

    resetForm()
  }

  const handleDelete = async (allocation: IncomeAllocation) => {
    if (!confirm('Are you sure you want to delete this allocation?')) return
    await deleteMutation.mutateAsync({ incomeId, allocationId: allocation.id })
  }

  const getTargetName = (allocation: IncomeAllocation): string => {
    if (allocation.targetInvestmentId) {
      const inv = investments.find((i) => i.id === allocation.targetInvestmentId)
      return inv?.name ?? 'Unknown Investment'
    }
    if (allocation.targetCashAccountId) {
      const ca = cashAccounts.find((c) => c.id === allocation.targetCashAccountId)
      return ca?.name ?? 'Unknown Cash Account'
    }
    return 'Unknown'
  }

  const getTargetTypeLabel = (allocation: IncomeAllocation): string => {
    return allocation.targetInvestmentId ? 'Investment' : 'Cash Account'
  }

  const formatAllocationValue = (allocation: IncomeAllocation): string => {
    if (allocation.allocationType === 'percentage') {
      return `${allocation.allocationValue}%`
    }
    return formatCurrency(allocation.allocationValue)
  }

  // When editing a specific allocation (from Investments section), only show that allocation
  const displayAllocations = initialEditAllocationId
    ? allocations.filter((a) => a.id === initialEditAllocationId)
    : allocations

  const totalPercentageAllocated = allocations
    .filter((a) => a.allocationType === 'percentage')
    .reduce((sum, a) => sum + parseFloat(a.allocationValue), 0)

  const totalFixedAllocated = allocations
    .filter((a) => a.allocationType === 'fixed')
    .reduce((sum, a) => sum + parseFloat(a.allocationValue), 0)

  const isFormValid = targetId && allocationValue && parseFloat(allocationValue) > 0
  const isSaving = createMutation.isPending || updateMutation.isPending
  const isEditingSingleAllocation = !!initialEditAllocationId

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? undefined : onClose}
      overlayClassName="bg-black/60"
      className="mx-4 w-full max-w-lg rounded-xl border border-white/[0.08] bg-[#0a0a0a]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 p-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Manage Allocations</h2>
          <p className="mt-0.5 text-sm text-gray-400">
            {incomeName} ({formatCurrency(incomeAmount)}/month)
          </p>
        </div>
        <button
          onClick={onClose}
          disabled={isSaving}
          className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-700 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-5">
        {/* Summary - hide when editing a single allocation */}
        {!isEditingSingleAllocation && (
          <div className="mb-4 rounded-lg bg-gray-800/50 p-3 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Percentage allocated:</span>
              <span className={totalPercentageAllocated > 100 ? 'text-rose-400' : ''}>
                {totalPercentageAllocated}%
              </span>
            </div>
            {totalFixedAllocated > 0 && (
              <div className="flex justify-between text-gray-300">
                <span>Fixed allocated:</span>
                <span>{formatCurrency(totalFixedAllocated)}/month</span>
              </div>
            )}
          </div>
        )}

        {/* Existing allocations */}
        {allocationsLoading ? (
          <div className="py-8 text-center text-gray-400">Loading allocations...</div>
        ) : displayAllocations.length === 0 && !isAddingNew ? (
          <div className="py-8 text-center text-gray-400">
            No allocations configured. Add one to direct income to investments or cash accounts.
          </div>
        ) : (
          <div className="mb-4 space-y-2">
            {displayAllocations.map((allocation) => (
              <div
                key={allocation.id}
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                  editingAllocation?.id === allocation.id
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-gray-700 bg-gray-800/30'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-white">
                      {getTargetName(allocation)}
                    </span>
                    <span className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300">
                      {getTargetTypeLabel(allocation)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {formatAllocationValue(allocation)}
                    {allocation.allocationType === 'fixed' && ' per month'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingAllocation(allocation)
                      setIsAddingNew(false)
                    }}
                    className="rounded p-1.5 text-gray-400 transition hover:bg-gray-700 hover:text-white"
                    title="Edit"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(allocation)}
                    disabled={deleteMutation.isPending}
                    className="rounded p-1.5 text-gray-400 transition hover:bg-rose-500/20 hover:text-rose-400"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit form */}
        {(isAddingNew || editingAllocation) && (
          <div className="space-y-4 rounded-lg border border-gray-700 bg-gray-800/30 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">
                {editingAllocation ? 'Edit Allocation' : 'New Allocation'}
              </h3>
              <button
                onClick={resetForm}
                className="text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            {/* Target type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Allocate to
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetType('investment')
                    setTargetId('')
                    setSearchTerm('')
                  }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                    targetType === 'investment'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  Investment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTargetType('cash_account')
                    setTargetId('')
                    setSearchTerm('')
                  }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                    targetType === 'cash_account'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  Cash Account
                </button>
              </div>
            </div>

            {/* Target selector */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                {targetType === 'investment' ? 'Investment' : 'Cash Account'}
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${targetType === 'investment' ? 'investments' : 'cash accounts'}...`}
                className="mb-2 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
              />
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Select {targetType === 'investment' ? 'an investment' : 'a cash account'}</option>
                {targetType === 'investment'
                  ? filteredInvestments.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({formatCurrency(inv.currentValue)})
                      </option>
                    ))
                  : filteredCashAccounts.map((ca) => (
                      <option key={ca.id} value={ca.id}>
                        {ca.name} ({formatCurrency(ca.balance)})
                      </option>
                    ))}
              </select>
            </div>

            {/* Allocation type and value */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Type</label>
                <select
                  value={allocationType}
                  onChange={(e) => setAllocationType(e.target.value as AllocationType)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  {allocationType === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                </label>
                <input
                  type="number"
                  value={allocationValue}
                  onChange={(e) => setAllocationValue(e.target.value)}
                  placeholder={allocationType === 'percentage' ? '50' : '1000'}
                  min="0"
                  max={allocationType === 'percentage' ? '100' : undefined}
                  step={allocationType === 'percentage' ? '1' : '100'}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!isFormValid || isSaving}
              className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-white transition hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : editingAllocation ? 'Update Allocation' : 'Add Allocation'}
            </button>
          </div>
        )}

        {/* Add button - hide when editing a single allocation */}
        {!isAddingNew && !editingAllocation && !isEditingSingleAllocation && (
          <button
            onClick={() => setIsAddingNew(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-600 px-4 py-3 text-sm text-gray-400 transition hover:border-gray-500 hover:text-white"
          >
            <Plus className="h-4 w-4" />
            Add Allocation
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-700 p-4">
        <button
          onClick={onClose}
          disabled={isSaving}
          className="w-full rounded-lg bg-gray-700 px-4 py-2 text-white transition hover:bg-gray-600"
        >
          Done
        </button>
      </div>
    </Modal>
  )
}
