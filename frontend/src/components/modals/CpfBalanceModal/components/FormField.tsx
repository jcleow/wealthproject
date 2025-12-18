type FormFieldProps = {
  label: string
  placeholder: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
}

export function FormField({ label, placeholder, value, onChange, error }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-200">{label}</label>
      <input
        type="number"
        step="0.01"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full
px-3 py-2
rounded-lg border border-white/10 focus:border-emerald-400 focus:outline-none
bg-white/5
text-sm text-white placeholder:text-gray-500`}
      />
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  )
}
