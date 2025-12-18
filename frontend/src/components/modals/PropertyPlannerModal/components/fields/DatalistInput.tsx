"use client"

import { Input } from '@/components/ui/input'

interface DatalistOption {
  id: string
  name: string
}

interface DatalistInputProps {
  label: string
  listId: string
  value: string
  onChange: (value: string) => void
  onFocus: () => void
  onBlur: () => void
  options: DatalistOption[]
  placeholder?: string
}

export function DatalistInput({
  label,
  listId,
  value,
  onChange,
  onFocus,
  onBlur,
  options,
  placeholder,
}: DatalistInputProps) {
  return (
    <label className="text-sm font-medium text-gray-300">
      {label}
      <Input
        list={listId}
        className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white focus:border-white/10 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:shadow-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
      />
      <datalist id={listId}>
        {options.map((opt) => (
          <option key={opt.id} value={opt.name} />
        ))}
      </datalist>
    </label>
  )
}
