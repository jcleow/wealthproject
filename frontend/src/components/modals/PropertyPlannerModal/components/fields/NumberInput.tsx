"use client"

interface NumberInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  placeholder?: string
}

export function NumberInput({ label, value, onChange, min, max, placeholder }: NumberInputProps) {
  return (
    <label className="text-sm font-medium text-gray-300">
      {label}
      <input
        type="number"
        className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-gray-500 focus:border-blue-400 focus:outline-none"
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        value={value === 0 ? '' : value}
        placeholder={placeholder}
      />
    </label>
  )
}
