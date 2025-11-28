import { useEffect, useState } from 'react'

import type { TimelineEditRequest, TimelineFrequency, TimelineItem, TimelineItemType, TimelineYear } from '@/types/timeline'

interface TimelineEditDrawerProps {
  isOpen: boolean
  onClose: () => void
  year: number
  timelineYear?: TimelineYear
  saving?: boolean
  onSave: (payload: TimelineEditRequest) => Promise<void>
}

const frequencyLabel: Record<TimelineFrequency, string> = {
  annual: 'Annual',
  monthly: 'Monthly',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  quarterly: 'Quarterly',
  semiannual: 'Semi-annual',
}

const frequencyMultiplier: Record<TimelineFrequency, number> = {
  annual: 1,
  monthly: 12,
  weekly: 52,
  biweekly: 26,
  quarterly: 4,
  semiannual: 2,
}

type FormState = {
  itemId: string
  name: string
  itemType: TimelineItemType
  category: string
  amount: string
  frequency: TimelineFrequency
  note: string
}

const defaultState: FormState = {
  itemId: '',
  name: '',
  itemType: 'asset',
  category: '',
  amount: '',
  frequency: 'annual',
  note: '',
}

export function TimelineEditDrawer({
  isOpen,
  onClose,
  year,
  timelineYear,
  saving = false,
  onSave,
}: TimelineEditDrawerProps) {
  const [form, setForm] = useState<FormState>(defaultState)
  const [error, setError] = useState<string | null>(null)

  const existingItems: TimelineItem[] = [
    ...(timelineYear?.assets ?? []),
    ...(timelineYear?.liabilities ?? []),
    ...(timelineYear?.income ?? []),
    ...(timelineYear?.expenses ?? []),
  ]

  useEffect(() => {
    if (!isOpen) {
      setForm(defaultState)
      setError(null)
      return
    }
    setError(null)
  }, [isOpen])

  const handleExistingChange = (itemId: string) => {
    setForm((prev) => ({ ...prev, itemId }))
    if (!itemId) return
    const match = existingItems.find((item) => (item as any).itemId === itemId || (item as any).item_id === itemId)
    if (match) {
      setForm({
        itemId: (match as any).itemId ?? (match as any).item_id,
        name: match.name,
        itemType: (match as any).itemType ?? (match as any).item_type,
        category: match.category,
        amount: ((match as any).sourceAmount ?? (match as any).source_amount ?? (match as any).amountAnnual ?? (match as any).amount_annual ?? 0).toString(),
        frequency: (match as any).sourceFrequency ?? (match as any).source_frequency ?? 'annual',
        note: '',
      })
    }
  }

  const annualizedAmount =
    Number.parseFloat(form.amount || '0') *
    (frequencyMultiplier[form.frequency] ?? 1)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!form.name && !form.itemId) {
      setError('Select an existing item or provide a name for a new one.')
      return
    }

    const amount = Number.parseFloat(form.amount)
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount greater than zero.')
      return
    }

    const payload: TimelineEditRequest = {
      year,
      edits: [
        {
          itemId: form.itemId || undefined,
          name: form.itemId ? undefined : form.name.trim(),
          itemType: form.itemType,
          category: form.category.trim() || 'other',
          amount,
          frequency: form.frequency,
        },
      ],
      note: form.note.trim() || undefined,
    }

    await onSave(payload)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-end bg-black/40 backdrop-blur-sm">
      <div className="h-full w-full max-w-md overflow-auto border-l border-white/10 bg-[#0b1222] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Year {year}</p>
            <h3 className="text-xl font-semibold text-white">Edit timeline</h3>
            <p className="text-sm text-gray-400">
              Overrides are annualized and applied downstream (latest wins).
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/5 text-gray-300 transition hover:bg-white/10"
            type="button"
          >
            ✕
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Existing item (optional)</label>
            <select
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
              value={form.itemId}
              onChange={(event) => handleExistingChange(event.target.value)}
            >
              <option value="">Select item</option>
              {existingItems.map((item) => (
                <option key={item.item_id} value={item.item_id}>
                  {item.name} ({item.item_type})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Name</label>
              <input
                type="text"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                placeholder="e.g., Savings"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Item type</label>
              <select
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                value={form.itemType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, itemType: event.target.value as TimelineItemType }))
                }
              >
                <option value="asset">Asset</option>
                <option value="liability">Liability</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Category</label>
              <input
                type="text"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                placeholder="asset_cash"
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Frequency</label>
              <select
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                value={form.frequency}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    frequency: event.target.value as TimelineFrequency,
                  }))
                }
              >
                {Object.entries(frequencyLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Amount ({frequencyLabel[form.frequency]})</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
              placeholder="0.00"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
            <p className="text-xs text-blue-100">
              Annualized: <span className="font-semibold">{annualizedAmount.toLocaleString()}</span>
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Note (optional)</label>
            <textarea
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
              rows={2}
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Reason for override"
            />
          </div>

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <div className="text-xs text-gray-400">
              Latest-wins overrides; new items persist in downstream years.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-gray-300 transition hover:bg-white/5"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save overrides'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
