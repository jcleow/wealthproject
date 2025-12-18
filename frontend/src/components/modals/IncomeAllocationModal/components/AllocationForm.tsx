"use client"

import type { CashAccount } from '@/types/financial'
import type { Investment } from '@/api/financial/investments'
import type { AllocationType, TargetType } from '../hooks'
import { formatCurrency } from '@/lib/format'

interface AllocationFormProps {
  isEditing: boolean
  targetType: TargetType
  targetId: string
  allocationType: AllocationType
  allocationValue: string
  searchTerm: string
  investments: Investment[]
  cashAccounts: CashAccount[]
  isFormValid: boolean
  isSaving: boolean
  onTargetTypeChange: (type: TargetType) => void
  onTargetIdChange: (id: string) => void
  onAllocationTypeChange: (type: AllocationType) => void
  onAllocationValueChange: (value: string) => void
  onSearchTermChange: (term: string) => void
  onCancel: () => void
  onSave: () => void
}

export function AllocationForm({
  isEditing,
  targetType,
  targetId,
  allocationType,
  allocationValue,
  searchTerm,
  investments,
  cashAccounts,
  isFormValid,
  isSaving,
  onTargetTypeChange,
  onTargetIdChange,
  onAllocationTypeChange,
  onAllocationValueChange,
  onSearchTermChange,
  onCancel,
  onSave,
}: AllocationFormProps) {
  const filteredInvestments = investments.filter((inv) =>
    inv.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const filteredCashAccounts = cashAccounts.filter((ca) =>
    ca.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={`space-y-4 p-4
rounded-lg border border-gray-700
bg-gray-800/30`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">
          {isEditing ? 'Edit Allocation' : 'New Allocation'}
        </h3>
        <button
          onClick={onCancel}
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
              onTargetTypeChange('investment')
              onTargetIdChange('')
              onSearchTermChange('')
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
              onTargetTypeChange('cash_account')
              onTargetIdChange('')
              onSearchTermChange('')
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
          onChange={(e) => onSearchTermChange(e.target.value)}
          placeholder={`Search ${targetType === 'investment' ? 'investments' : 'cash accounts'}...`}
          className={`w-full
mb-2 px-3 py-2 placeholder-gray-400
rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none
bg-gray-700
text-white`}
        />
        <select
          value={targetId}
          onChange={(e) => onTargetIdChange(e.target.value)}
          className={`w-full
px-3 py-2
rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none
bg-gray-700
text-white`}
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
            onChange={(e) => onAllocationTypeChange(e.target.value as AllocationType)}
            className={`w-full
px-3 py-2
rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none
bg-gray-700
text-white`}
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
            onChange={(e) => onAllocationValueChange(e.target.value)}
            placeholder={allocationType === 'percentage' ? '50' : '1000'}
            min="0"
            max={allocationType === 'percentage' ? '100' : undefined}
            step={allocationType === 'percentage' ? '1' : '100'}
            className={`w-full
px-3 py-2 placeholder-gray-400
rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none
bg-gray-700
text-white`}
          />
        </div>
      </div>

      <button
        onClick={onSave}
        disabled={!isFormValid || isSaving}
        className={`w-full
px-4 py-2
rounded-lg
bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600
text-white
transition disabled:cursor-not-allowed`}
      >
        {isSaving ? 'Saving...' : isEditing ? 'Update Allocation' : 'Add Allocation'}
      </button>
    </div>
  )
}
