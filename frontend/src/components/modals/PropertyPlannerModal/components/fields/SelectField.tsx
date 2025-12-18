"use client"

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
      <select
        className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}
