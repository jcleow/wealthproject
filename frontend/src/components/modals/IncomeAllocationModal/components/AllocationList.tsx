"use client"

import { Trash2 } from 'lucide-react'
import type { IncomeAllocation } from '@/api/financial/incomes'
import type { CashAccount } from '@/types/financial'
import type { Investment } from '@/api/financial/investments'
import { formatCurrency } from '@/lib/format'

interface AllocationListProps {
  allocations: IncomeAllocation[]
  editingAllocationId?: string
  investments: Investment[]
  cashAccounts: CashAccount[]
  onEdit: (allocation: IncomeAllocation) => void
  onDelete: (allocation: IncomeAllocation) => void
  isDeleting: boolean
}

export function AllocationList({
  allocations,
  editingAllocationId,
  investments,
  cashAccounts,
  onEdit,
  onDelete,
  isDeleting,
}: AllocationListProps) {
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

  return (
    <div className="mb-4 space-y-2">
      {allocations.map((allocation) => (
        <div
          key={allocation.id}
          className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
            editingAllocationId === allocation.id
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
              onClick={() => onEdit(allocation)}
              className="rounded p-1.5 text-gray-400 transition hover:bg-gray-700 hover:text-white"
              title="Edit"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(allocation)}
              disabled={isDeleting}
              className="rounded p-1.5 text-gray-400 transition hover:bg-rose-500/20 hover:text-rose-400"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
