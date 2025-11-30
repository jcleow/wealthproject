import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { CashAccount } from '@/types/financial'
import { formatCurrency } from '@/lib/format'

type FormState = {
  name: string
  balance: string
  interestRate: string
  bankName: string
  accountType: string
  notes: string
}

const accountTypeOptions = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'money_market', label: 'Money Market' },
  { value: 'other', label: 'Other' },
]

export interface CashAccountFormModalProps {
  mode: 'create' | 'edit'
  data?: CashAccount
  isOpen: boolean
  onClose: () => void
  onSave: (payload: Omit<CashAccount, 'id' | 'createdAt' | 'updatedAt'>, mode: 'create' | 'edit') => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

const buildDefaultFormState = (): FormState => ({
  name: '',
  balance: '',
  interestRate: '1.5',
  bankName: '',
  accountType: 'savings',
  notes: '',
})

export function CashAccountFormModal({
  mode,
  data,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: CashAccountFormModalProps) {
  const toNumeric = (value: string) => Number.parseFloat(value.replace(/,/g, '')) || 0
  const formatNumberInput = (value: string | number) => {
    const raw = typeof value === 'number' ? value.toString() : value
    const cleaned = raw.replace(/[^0-9.]/g, '')
    if (!cleaned) return ''
    const [integer, decimal] = cleaned.split('.')
    const formattedInt = new Intl.NumberFormat('en-US').format(Number(integer || 0))
    return decimal !== undefined ? `${formattedInt}.${decimal}` : formattedInt
  }

  const [formData, setFormData] = useState<FormState>(buildDefaultFormState())
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (!data) {
      setFormData(buildDefaultFormState())
      return
    }

    setFormData({
      name: data.name ?? '',
      balance: formatNumberInput(data.balance ?? 0),
      interestRate: (data.interestRate ?? 1.5).toString(),
      bankName: data.bankName ?? '',
      accountType: data.accountType ?? 'savings',
      notes: data.notes ?? '',
    })
  }, [data, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSaving(true)

    try {
      const payload = {
        name: formData.name.trim(),
        balance: toNumeric(formData.balance),
        interestRate: Number.parseFloat(formData.interestRate) || 1.5,
        bankName: formData.bankName.trim() || null,
        accountType: formData.accountType || null,
        isAccumulator: data?.isAccumulator ?? false,
        startYear: data?.startYear,
        endYear: data?.endYear ?? null,
        notes: formData.notes.trim() || null,
      }
      await onSave(payload, mode)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!data?.id || !onDelete) return
    if (!confirm('Are you sure you want to delete this cash account?')) return

    setIsDeleting(true)
    try {
      await onDelete(data.id)
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-lg border border-gray-700 bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
              <span className="text-lg text-white">🏦</span>
            </div>
            <h2 className="text-lg font-semibold text-white">
              {mode === 'edit' ? 'Edit' : 'Add'} Cash Account
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {mode === 'edit' && data?.id && onDelete && (
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-600/20 hover:text-red-400"
                disabled={isSaving || isDeleting}
                onClick={handleDelete}
                title="Delete account"
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
              disabled={isSaving || isDeleting}
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
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
              onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="e.g., DBS Savings"
              required
              type="text"
              value={formData.name}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Current Balance</label>
              <input
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                inputMode="decimal"
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    balance: formatNumberInput(event.target.value),
                  }))
                }
                placeholder={`e.g., ${formatCurrency(10000)}`}
                required
                value={formData.balance}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Interest Rate (%)</label>
              <input
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    interestRate: event.target.value,
                  }))
                }
                placeholder="1.5"
                step="0.1"
                type="number"
                value={formData.interestRate}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Bank Name (optional)</label>
              <input
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, bankName: event.target.value }))
                }
                placeholder="e.g., DBS"
                type="text"
                value={formData.bankName}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Account Type</label>
              <select
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, accountType: event.target.value }))
                }
                value={formData.accountType}
              >
                {accountTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Notes (optional)</label>
            <textarea
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, notes: event.target.value }))
              }
              placeholder="Add additional details"
              rows={2}
              value={formData.notes}
            />
          </div>

          <div className="flex justify-between border-t border-gray-700 pt-4">
            <button
              className="px-4 py-2 text-gray-400 transition-colors hover:text-white"
              disabled={isSaving || isDeleting}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-emerald-500 px-6 py-2 text-white transition-colors hover:bg-emerald-600 disabled:bg-gray-600"
              disabled={isSaving || isDeleting}
              type="submit"
            >
              {isSaving ? 'Saving...' : mode === 'edit' ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
