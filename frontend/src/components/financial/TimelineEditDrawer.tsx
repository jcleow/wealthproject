import { useEffect, useState, useRef } from 'react'
import { ChevronDown, Check } from 'lucide-react'

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
  frequency?: TimelineFrequency // Only used for income/expense
  note: string
}

// Custom dropdown component for this drawer
function TimelineDropdown<T extends string>({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: T | ''
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full
          flex items-center justify-between
          px-3 py-2
          rounded-lg border border-white/10
          bg-white/5 hover:bg-white/[0.07]
          text-sm text-white text-left
          transition-colors
          ${isOpen ? 'border-blue-400' : ''}`}
      >
        <span className={selectedOption ? 'text-white' : 'text-slate-500'}>
          {selectedOption?.label ?? placeholder ?? 'Select...'}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="
          absolute left-0 top-full z-[100] mt-1
          w-full min-w-[140px]
          rounded-xl
          border border-white/[0.12]
          bg-[#0c0c0c]
          shadow-2xl shadow-black/60
          overflow-hidden
          animate-in fade-in slide-in-from-top-2 duration-150
        ">
          <div className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
            {placeholder && (
              <button
                type="button"
                onClick={() => {
                  onChange('' as T)
                  setIsOpen(false)
                }}
                className={`
                  w-full flex items-center gap-2
                  px-3 py-2
                  text-sm text-left text-slate-500
                  transition-all duration-150
                  hover:bg-white/[0.05]
                `}
              >
                <span className="w-4 shrink-0" />
                <span>{placeholder}</span>
              </button>
            )}
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                  className={`
                    w-full flex items-center gap-2
                    px-3 py-2
                    text-sm text-left
                    transition-all duration-150
                    ${isSelected
                      ? 'bg-blue-500/15 text-white'
                      : 'text-slate-300 hover:bg-white/[0.05]'
                    }
                  `}
                >
                  <span className="w-4 shrink-0">
                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-400" />}
                  </span>
                  <span>{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const defaultState: FormState = {
  itemId: '',
  name: '',
  itemType: 'asset',
  category: '',
  amount: '',
  frequency: undefined, // Only set for income/expense
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
    const match = existingItems.find((item) => item.itemId === itemId)
    if (match) {
      const isFlow = match.itemType === 'income' || match.itemType === 'expense'
      setForm({
        itemId: match.itemId,
        name: match.name,
        itemType: match.itemType,
        category: match.category,
        amount: (match.sourceAmount ?? match.amountAnnual ?? 0).toString(),
        // Only set frequency for income/expense (flows)
        frequency: isFlow ? (match.sourceFrequency ?? 'annual') : undefined,
        note: '',
      })
    }
  }

  // For income/expense, calculate annualized amount from frequency
  // For assets/liabilities, amount is the balance (no annualization)
  const isFlow = form.itemType === 'income' || form.itemType === 'expense'
  const annualizedAmount = isFlow
    ? Number.parseFloat(form.amount || '0') * (frequencyMultiplier[form.frequency ?? 'annual'] ?? 1)
    : Number.parseFloat(form.amount || '0')

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

    // Only include frequency for income/expense
    const isFlowType = form.itemType === 'income' || form.itemType === 'expense'

    const payload: TimelineEditRequest = {
      year,
      edits: [
        {
          itemId: form.itemId || undefined,
          name: form.itemId ? undefined : form.name.trim(),
          itemType: form.itemType,
          category: form.category.trim() || 'other',
          amount,
          ...(isFlowType && { frequency: form.frequency ?? 'annual' }),
        },
      ],
      note: form.note.trim() || undefined,
    }

    await onSave(payload)
  }

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 z-[120]
flex items-center justify-end
bg-black/40
backdrop-blur-sm`}>
      <div className={`overflow-auto
h-full w-full max-w-md
p-6
border-l border-white/10
bg-[#0b1222]
shadow-2xl`}>
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
            className={`h-9 w-9
rounded-full
bg-white/5 hover:bg-white/10
text-gray-300
transition`}
            type="button"
          >
            ✕
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Existing item (optional)</label>
            <TimelineDropdown
              value={form.itemId}
              onChange={handleExistingChange}
              placeholder="Select item"
              options={existingItems.map((item) => ({
                value: item.itemId,
                label: `${item.name} (${item.itemType})`,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Name</label>
              <input
                type="text"
                className={`w-full
px-3 py-2
rounded-lg border border-white/10 focus:border-blue-400 focus:outline-none
bg-white/5
text-white`}
                placeholder="e.g., Savings"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Item type</label>
              <TimelineDropdown
                value={form.itemType}
                onChange={(newType) => {
                  const newIsFlow = newType === 'income' || newType === 'expense'
                  setForm((prev) => ({
                    ...prev,
                    itemType: newType,
                    // Set frequency for flows, clear for assets/liabilities
                    frequency: newIsFlow ? (prev.frequency ?? 'annual') : undefined,
                  }))
                }}
                options={[
                  { value: 'asset', label: 'Asset' },
                  { value: 'liability', label: 'Liability' },
                  { value: 'income', label: 'Income' },
                  { value: 'expense', label: 'Expense' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Category</label>
              <input
                type="text"
                className={`w-full
px-3 py-2
rounded-lg border border-white/10 focus:border-blue-400 focus:outline-none
bg-white/5
text-white`}
                placeholder="asset_cash"
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
              />
            </div>
            {/* Frequency only applies to income/expense - assets/liabilities are point-in-time balances */}
            {isFlow && (
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Frequency</label>
                <TimelineDropdown
                  value={form.frequency ?? 'annual'}
                  onChange={(val) => setForm((prev) => ({ ...prev, frequency: val }))}
                  options={Object.entries(frequencyLabel).map(([value, label]) => ({
                    value: value as TimelineFrequency,
                    label,
                  }))}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">
              {isFlow ? `Amount (${frequencyLabel[form.frequency ?? 'annual']})` : 'Balance'}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={`w-full
px-3 py-2
rounded-lg border border-white/10 focus:border-blue-400 focus:outline-none
bg-white/5
text-white`}
              placeholder="0.00"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
            {isFlow && (
              <p className="text-xs text-blue-100">
                Annualized: <span className="font-semibold">{annualizedAmount.toLocaleString()}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Note (optional)</label>
            <textarea
              className={`w-full
px-3 py-2
rounded-lg border border-white/10 focus:border-blue-400 focus:outline-none
bg-white/5
text-white`}
              rows={2}
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Reason for override"
            />
          </div>

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <div className={`flex items-center justify-between
pt-4
border-t border-white/10`}>
            <div className="text-xs text-gray-400">
              Latest-wins overrides; new items persist in downstream years.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`px-4 py-2
rounded-lg
hover:bg-white/5
text-gray-300
transition`}
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2
rounded-lg
bg-blue-500 hover:bg-blue-600
text-sm font-semibold text-white
disabled:opacity-60
transition`}
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
