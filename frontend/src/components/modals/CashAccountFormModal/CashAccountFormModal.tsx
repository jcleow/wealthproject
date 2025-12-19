"use client"

import { Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { CustomSelect } from '@/components/ui/CustomSelect'
import type { CashAccount } from '@/types/financial'
import { formatCurrency } from '@/lib/format'

import { useCashAccountForm, accountTypeOptions } from './hooks'

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
  const form = useCashAccountForm({ mode, data, isOpen, onSave, onDelete, onClose })

  return (
    <Modal
      isOpen={isOpen}
      onClose={form.isBusy ? undefined : onClose}
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
              disabled={form.isSaving || form.isDeleting}
              onClick={form.handleDelete}
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
            disabled={form.isSaving || form.isDeleting}
            onClick={onClose}
            title="Close"
            type="button"
          >
            ✕
          </button>
        </div>
      </div>

      <form className="space-y-4 p-6" onSubmit={form.handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Account Name</label>
          <input
            className={`w-full
px-3 py-2 placeholder-gray-400
rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none
bg-gray-700
text-white`}
            onChange={(event) => form.setFormData((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="e.g., DBS Savings"
            required
            type="text"
            value={form.formData.name}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Current Balance</label>
            <input
              className={`w-full
px-3 py-2 placeholder-gray-400
rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none
bg-gray-700
text-white`}
              inputMode="decimal"
              onChange={(event) =>
                form.setFormData((prev) => ({
                  ...prev,
                  balance: form.formatNumberInput(event.target.value),
                }))
              }
              placeholder={`e.g., ${formatCurrency(10000)}`}
              required
              value={form.formData.balance}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Interest Rate (%)</label>
            <input
              className={`w-full
px-3 py-2 placeholder-gray-400
rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none
bg-gray-700
text-white`}
              onChange={(event) =>
                form.setFormData((prev) => ({
                  ...prev,
                  interestRate: event.target.value,
                }))
              }
              placeholder="1.5"
              step="0.1"
              type="number"
              value={form.formData.interestRate}
            />
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
              onChange={(event) =>
                form.setFormData((prev) => ({ ...prev, bankName: event.target.value }))
              }
              placeholder="e.g., DBS"
              type="text"
              value={form.formData.bankName}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Account Type</label>
            <CustomSelect
              value={form.formData.accountType}
              onChange={(val) => form.setFormData((prev) => ({ ...prev, accountType: String(val) }))}
              options={accountTypeOptions}
              className="w-full"
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
            onChange={(event) =>
              form.setFormData((prev) => ({ ...prev, notes: event.target.value }))
            }
            placeholder="Add additional details"
            rows={2}
            value={form.formData.notes}
          />
        </div>

        <div className="flex justify-between border-t border-gray-700 pt-4">
          <button
            className="px-4 py-2 text-gray-400 transition-colors hover:text-white"
            disabled={form.isSaving || form.isDeleting}
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
            disabled={form.isSaving || form.isDeleting}
            type="submit"
          >
            {form.isSaving ? 'Saving...' : mode === 'edit' ? 'Update' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
