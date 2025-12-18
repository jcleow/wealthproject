"use client"

import { Calendar } from 'lucide-react'

interface MonthInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
}

export function MonthInput({ label, value, onChange, min, max }: MonthInputProps) {
  return (
    <label className="text-sm font-medium text-gray-300">
      {label}
      <div className="relative">
        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
        <input
          type="month"
          className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 pl-9 text-white placeholder:text-gray-500 focus:border-blue-400 focus:outline-none"
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          value={value}
        />
      </div>
    </label>
  )
}
