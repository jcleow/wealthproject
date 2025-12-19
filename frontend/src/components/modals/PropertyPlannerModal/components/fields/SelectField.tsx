"use client"

import { CustomSelect } from '@/components/ui/CustomSelect'

interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
}

export function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <label className="text-sm font-medium text-gray-300">
      {label}
      <CustomSelect
        value={value}
        onChange={(val) => onChange(String(val))}
        options={options}
        className="mt-1 w-full"
      />
    </label>
  )
}
