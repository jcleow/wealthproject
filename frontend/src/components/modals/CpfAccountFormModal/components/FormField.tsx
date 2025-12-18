"use client"

interface FormFieldProps {
  label: string
  type: 'text' | 'number' | 'date'
  step?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  required?: boolean
}

export function FormField({ label, type, step, placeholder, value, onChange, error, hint, required }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-200">
        {label}
        {required && <span className="ml-1 text-rose-400">*</span>}
      </label>
      <input
        type={type}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`w-full
px-3 py-2
rounded-lg border border-white/10 focus:border-emerald-400 focus:outline-none
bg-white/5
text-sm text-white placeholder:text-gray-500`}
      />
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  )
}
