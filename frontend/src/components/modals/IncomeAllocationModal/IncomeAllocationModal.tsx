"use client"

import { Plus, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/format'
import { useCashAccountsQuery } from '@/hooks/queries/useCashAccountsQuery'
import { useInvestmentsQuery } from '@/hooks/queries/useInvestmentsQuery'
import { useDeleteIncomeAllocationMutation } from '@/hooks/queries/useIncomeAllocationsQuery'

import { useAllocationForm } from './hooks'
import { AllocationList, AllocationForm } from './components'

interface IncomeAllocationModalProps {
  isOpen: boolean
  onClose: () => void
  incomeId: string
  incomeName: string
  incomeAmount: number
  initialEditAllocationId?: string
}

export function IncomeAllocationModal({
  isOpen,
  onClose,
  incomeId,
  incomeName,
  incomeAmount,
  initialEditAllocationId,
}: IncomeAllocationModalProps) {
  const { data: cashAccounts = [] } = useCashAccountsQuery()
  const { data: investments = [] } = useInvestmentsQuery({ enabled: isOpen })
  const deleteMutation = useDeleteIncomeAllocationMutation()

  const form = useAllocationForm({ incomeId, isOpen, initialEditAllocationId })

  return (
    <Modal
      isOpen={isOpen}
      onClose={form.isSaving ? undefined : onClose}
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
          disabled={form.isSaving}
          className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-700 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-5">
        {/* Summary */}
        {!form.isEditingSingleAllocation && (
          <div className="mb-4 rounded-lg bg-gray-800/50 p-3 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Percentage allocated:</span>
              <span className={form.totalPercentageAllocated > 100 ? 'text-rose-400' : ''}>
                {form.totalPercentageAllocated}%
              </span>
            </div>
            {form.totalFixedAllocated > 0 && (
              <div className="flex justify-between text-gray-300">
                <span>Fixed allocated:</span>
                <span>{formatCurrency(form.totalFixedAllocated)}/month</span>
              </div>
            )}
          </div>
        )}

        {/* Existing allocations */}
        {form.allocationsLoading ? (
          <div className="py-8 text-center text-gray-400">Loading allocations...</div>
        ) : form.displayAllocations.length === 0 && !form.isAddingNew ? (
          <div className="py-8 text-center text-gray-400">
            No allocations configured. Add one to direct income to investments or cash accounts.
          </div>
        ) : (
          <AllocationList
            allocations={form.displayAllocations}
            editingAllocationId={form.editingAllocation?.id}
            investments={investments}
            cashAccounts={cashAccounts}
            onEdit={(allocation) => {
              form.setEditingAllocation(allocation)
              form.setIsAddingNew(false)
            }}
            onDelete={form.handleDelete}
            isDeleting={deleteMutation.isPending}
          />
        )}

        {/* Add/Edit form */}
        {(form.isAddingNew || form.editingAllocation) && (
          <AllocationForm
            isEditing={!!form.editingAllocation}
            targetType={form.targetType}
            targetId={form.targetId}
            allocationType={form.allocationType}
            allocationValue={form.allocationValue}
            searchTerm={form.searchTerm}
            investments={investments}
            cashAccounts={cashAccounts}
            isFormValid={form.isFormValid}
            isSaving={form.isSaving}
            onTargetTypeChange={form.setTargetType}
            onTargetIdChange={form.setTargetId}
            onAllocationTypeChange={form.setAllocationType}
            onAllocationValueChange={form.setAllocationValue}
            onSearchTermChange={form.setSearchTerm}
            onCancel={form.resetForm}
            onSave={form.handleSave}
          />
        )}

        {/* Add button */}
        {!form.isAddingNew && !form.editingAllocation && !form.isEditingSingleAllocation && (
          <button
            onClick={() => form.setIsAddingNew(true)}
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
          disabled={form.isSaving}
          className="w-full rounded-lg bg-gray-700 px-4 py-2 text-white transition hover:bg-gray-600"
        >
          Done
        </button>
      </div>
    </Modal>
  )
}
