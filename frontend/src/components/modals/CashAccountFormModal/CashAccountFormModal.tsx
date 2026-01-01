"use client"

import { Controller } from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { CustomSelect } from '@/components/ui/CustomSelect'
import type { CashAccount } from '@/types/financial'
import { formatCurrency } from '@/lib/format'

import { useCashAccountForm, accountTypeOptions, formatNumberInput, parseFormattedNumber } from './hooks'

export interface CashAccountFormModalProps {
  mode: 'create' | 'edit'
  data?: CashAccount
  isOpen: boolean
  onClose: () => void
  onSave: (payload: Omit<CashAccount, 'id' | 'createdAt' | 'updatedAt'>, mode: 'create' | 'edit') => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export function CashAccountFormModal({
  mode,
  data,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: CashAccountFormModalProps) {
  const { form, handleSubmit, isSubmitting, isDeleting, isBusy, errors, handleDelete } = useCashAccountForm({
    mode,
    data,
    isOpen,
    onSave,
    onDelete,
    onClose,
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={isBusy ? undefined : onClose}
      overlayClassName="bg-black/60"
      className={`w-full max-w-md
mx-4
rounded-xl border border-white/[0.08]
bg-[#0a0a0a]`}
    >
      <div className={`flex items-center justify-between
p-6
border-b border-gray-700`}>
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center
h-10 w-10
rounded-full
bg-emerald-500`}>
            <span className="text-lg text-white">🏦</span>
          </div>
          <h2 className="text-lg font-semibold text-white">
            {mode === 'edit' ? 'Edit' : 'Add'} Cash Account
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {mode === 'edit' && data?.id && onDelete && (
            <button
              className={`flex items-center justify-center
h-8 w-8
rounded-full
hover:bg-red-600/20
text-gray-400 hover:text-red-400
transition-colors`}
              disabled={isSubmitting || isDeleting}
              onClick={handleDelete}
              title="Delete account"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            className={`flex items-center justify-center
h-8 w-8
rounded-full
hover:bg-gray-700
text-gray-400 hover:text-white
transition-colors`}
            disabled={isSubmitting || isDeleting}
            onClick={onClose}
            title="Close"
            type="button"
          >
            ✕
          </button>
        </div>
      </div>

      <form className="space-y-4 p-6" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Account Name</label>
          <input
            className={`w-full
px-3 py-2 placeholder-gray-400
rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none
bg-gray-700
text-white`}
            placeholder="e.g., DBS Savings"
            {...form.register('name')}
          />
          {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Current Balance</label>
            <Controller
              name="balance"
              control={form.control}
              render={({ field }) => (
                <input
                  className={`w-full
px-3 py-2 placeholder-gray-400
rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none
bg-gray-700
text-white`}
                  inputMode="decimal"
                  placeholder={`e.g., ${formatCurrency(10000)}`}
                  value={formatNumberInput(field.value)}
                  onChange={(e) => field.onChange(parseFormattedNumber(e.target.value))}
                  onBlur={field.onBlur}
                />
              )}
            />
            {errors.balance && <p className="mt-1 text-sm text-red-400">{errors.balance.message}</p>}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Interest Rate (%)</label>
            <Controller
              name="interestRate"
              control={form.control}
              render={({ field }) => (
                <input
                  className={`w-full
px-3 py-2 placeholder-gray-400
rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none
bg-gray-700
text-white`}
                  placeholder="1.5"
                  step="0.1"
                  type="number"
                  value={field.value}
                  onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
                  onBlur={field.onBlur}
                />
              )}
            />
            {errors.interestRate && <p className="mt-1 text-sm text-red-400">{errors.interestRate.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Bank Name (optional)</label>
            <input
              className={`w-full
px-3 py-2 placeholder-gray-400
rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none
bg-gray-700
text-white`}
              placeholder="e.g., DBS"
              {...form.register('bankName')}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Account Type</label>
            <Controller
              name="accountType"
              control={form.control}
              render={({ field }) => (
                <CustomSelect
                  value={field.value}
                  onChange={(val) => field.onChange(String(val))}
                  options={accountTypeOptions}
                  className="w-full"
                />
              )}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Notes (optional)</label>
          <textarea
            className={`w-full
px-3 py-2 placeholder-gray-400
rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none
bg-gray-700
text-white`}
            placeholder="Add additional details"
            rows={2}
            {...form.register('notes')}
          />
        </div>

        <div className="flex justify-between border-t border-gray-700 pt-4">
          <button
            className="px-4 py-2 text-gray-400 transition-colors hover:text-white"
            disabled={isSubmitting || isDeleting}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`px-6 py-2
rounded-lg
bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600
text-white
transition-colors`}
            disabled={isSubmitting || isDeleting}
            type="submit"
          >
            {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
