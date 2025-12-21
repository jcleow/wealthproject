import type { CpfFields } from './types'

interface CpfFieldProps {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  error?: string
}

function CpfField({ label, placeholder, value, onChange, error }: CpfFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-200">{label}</label>
      <input
        type="number"
        step="0.01"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full
px-3 py-2 placeholder-gray-500
rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none
bg-gray-700
text-white`}
      />
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  )
}

interface CpfFormProps {
  fields: CpfFields
  errors: Partial<CpfFields>
  onChange: (fields: CpfFields) => void
}

export function CpfForm({ fields, errors, onChange }: CpfFormProps) {
  return (
    <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-800 p-4">
      <div>
        <p className="text-sm font-semibold text-white">CPF balances</p>
        <p className="text-xs text-gray-400">
          We will create OA, SA, and MA as retirement assets with CPF growth assumptions.
        </p>
      </div>
      <CpfField
        label="Ordinary Account (OA)"
        placeholder="45000.00"
        value={fields.ordinaryAccount}
        onChange={(value) => onChange({ ...fields, ordinaryAccount: value })}
        error={errors.ordinaryAccount}
      />
      <CpfField
        label="Special Account (SA)"
        placeholder="25000.00"
        value={fields.specialAccount}
        onChange={(value) => onChange({ ...fields, specialAccount: value })}
        error={errors.specialAccount}
      />
      <CpfField
        label="Medisave Account (MA)"
        placeholder="15000.00"
        value={fields.medisaveAccount}
        onChange={(value) => onChange({ ...fields, medisaveAccount: value })}
        error={errors.medisaveAccount}
      />
    </div>
  )
}
