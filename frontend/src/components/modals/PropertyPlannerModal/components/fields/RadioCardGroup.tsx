"use client"

interface RadioOption {
  id: string
  label: string
  helper: string
}

interface RadioCardGroupProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: RadioOption[]
}

export function RadioCardGroup({ label, value, onChange, options }: RadioCardGroupProps) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-300">{label}</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              value === option.id
                ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]'
                : 'border-white/15 bg-white/5 hover:border-white/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white">{option.label}</p>
              <span
                className={`h-4 w-4 rounded-full border ${
                  value === option.id ? 'border-blue-400 bg-blue-400' : 'border-white/20'
                }`}
              />
            </div>
            <p className="mt-1 text-sm text-gray-400">{option.helper}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
