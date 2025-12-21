"use client"

interface CurrencyInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  placeholder?: string
  min?: number
  max?: number
  highlight?: boolean
  hint?: string
}

export function CurrencyInput({
  label,
  value,
  onChange,
  placeholder,
  min,
  max,
  highlight,
  hint,
}: CurrencyInputProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between text-sm font-medium text-gray-300">
        <span>{label}</span>
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value ? value.toLocaleString() : ''}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.]/g, '')
            onChange(Number(raw) || 0)
          }}
          className={`mt-1 w-full rounded-2xl border ${
            highlight ? 'border-amber-400 text-amber-200' : 'border-white/10 text-white'
          } bg-white/5 px-4 py-2 text-lg font-semibold placeholder:text-gray-500 focus:border-blue-400 focus:outline-none`}
          min={min}
          max={max}
          placeholder={placeholder}
        />
        {hint && <p className="mt-1 text-xs text-gray-200">{hint}</p>}
      </div>
    </div>
  )
}
