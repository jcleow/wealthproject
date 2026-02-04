import { useFormContext, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateUUID } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import type { OnboardingFormData, OnboardingAsset, OnboardingLiability } from '../types'
import { ASSET_CATEGORY_LABELS, LIABILITY_CATEGORY_LABELS } from '../types'

interface AssetsLiabilitiesStepProps {
  isMonet: boolean
}

const ASSET_CATEGORY_OPTIONS = Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))
const LIABILITY_CATEGORY_OPTIONS = Object.entries(LIABILITY_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))

function createEmptyAsset(): OnboardingAsset {
  return {
    tempId: generateUUID(),
    serverId: null,
    name: '',
    category: 'cash_savings',
    currentValue: 0,
    growthRate: 3,
  }
}

function createEmptyLiability(): OnboardingLiability {
  return {
    tempId: generateUUID(),
    serverId: null,
    name: '',
    category: 'mortgage',
    currentBalance: 0,
    interestRateApr: 0,
    minimumPayment: 0,
  }
}

export function AssetsLiabilitiesStep({ isMonet }: AssetsLiabilitiesStepProps) {
  const { watch, setValue, register, control } = useFormContext<OnboardingFormData>()
  const { fields: assetFields, append: appendAsset, remove: removeAsset } = useFieldArray({ control, name: 'assets' })
  const { fields: liabilityFields, append: appendLiability, remove: removeLiability } = useFieldArray({ control, name: 'liabilities' })

  const assets = watch('assets')
  const liabilities = watch('liabilities')

  const assetTotal = assets.reduce((sum, a) => sum + (a.currentValue ?? 0), 0)
  const liabilityTotal = liabilities.reduce((sum, l) => sum + (l.currentBalance ?? 0), 0)

  const labelClass = cn(
    'text-xs font-medium mb-1',
    isMonet ? 'text-[var(--monet-text-secondary)]' : 'text-slate-400'
  )

  const inputClass = cn(
    'w-full py-2 px-3 rounded-lg text-sm transition-colors focus:outline-none',
    isMonet
      ? 'bg-[var(--monet-lavender)]/5 border border-[var(--monet-lavender)]/15 text-[var(--monet-text-primary)] placeholder:text-[var(--monet-text-muted)] focus:border-[var(--monet-sage)]/40'
      : 'bg-white/[0.03] border border-white/[0.06] text-white placeholder:text-slate-600 focus:border-white/20'
  )

  return (
    <div className="space-y-6">
      {/* ─── Assets ────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className={cn('text-sm font-semibold', isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white')}>
            Assets
          </h3>
          <span className={cn('text-xs font-mono tabular-nums', isMonet ? 'text-[var(--monet-sage)]' : 'text-emerald-400')}>
            Total: {formatCurrency(assetTotal)}
          </span>
        </div>
        <p className={cn('text-xs mb-3', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>
          What you own — savings, investments, property, etc.
        </p>

        <div className={cn(
          'rounded-xl border p-4 space-y-3',
          isMonet
            ? 'border-[var(--monet-lavender)]/15 bg-[var(--monet-lavender)]/[0.03]'
            : 'border-white/[0.06] bg-white/[0.02]'
        )}>
          {assetFields.length === 0 && (
            <p className={cn('text-xs text-center py-4', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600')}>
              No assets added yet. Click &quot;Add Asset&quot; below.
            </p>
          )}
          {assetFields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
              <div>
                <label className={labelClass}>Name</label>
                <input {...register(`assets.${index}.name`)} placeholder="Asset name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <CustomDropdown
                  value={assets[index]?.category ?? 'cash_savings'}
                  onChange={(val) => setValue(`assets.${index}.category`, val as any)}
                  options={ASSET_CATEGORY_OPTIONS}
                  variant={isMonet ? 'monet' : 'dark'}
                  minWidth="100%"
                />
              </div>
              <div>
                <label className={labelClass}>Current Value</label>
                <CurrencyInput
                  value={assets[index]?.currentValue ?? 0}
                  onChange={(val) => setValue(`assets.${index}.currentValue`, val)}
                  size="sm"
                />
              </div>
              <div>
                <label className={labelClass}>Growth Rate</label>
                <CurrencyInput
                  value={assets[index]?.growthRate ?? 3}
                  onChange={(val) => setValue(`assets.${index}.growthRate`, val)}
                  isPercentage
                  size="sm"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeAsset(index)}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    isMonet ? 'text-[var(--monet-text-muted)] hover:text-rose-500' : 'text-slate-600 hover:text-rose-400'
                  )}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => appendAsset(createEmptyAsset())}
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium mt-2 transition-colors',
            isMonet ? 'text-[var(--monet-sage)]' : 'text-emerald-400 hover:text-emerald-300'
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Asset
        </button>
      </div>

      {/* ─── Divider ───────────────────────────────────────────────────────── */}
      <div className={cn('border-t', isMonet ? 'border-[var(--monet-lavender)]/10' : 'border-white/[0.04]')} />

      {/* ─── Liabilities ───────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className={cn('text-sm font-semibold', isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white')}>
            Liabilities
          </h3>
          <span className={cn('text-xs font-mono tabular-nums', isMonet ? 'text-rose-500' : 'text-rose-400')}>
            Total: ({formatCurrency(liabilityTotal)})
          </span>
        </div>
        <p className={cn('text-xs mb-3', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>
          What you owe — mortgages, loans, credit cards, etc.
        </p>

        <div className={cn(
          'rounded-xl border p-4 space-y-3',
          isMonet
            ? 'border-[var(--monet-lavender)]/15 bg-[var(--monet-lavender)]/[0.03]'
            : 'border-white/[0.06] bg-white/[0.02]'
        )}>
          {liabilityFields.length === 0 && (
            <p className={cn('text-xs text-center py-4', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600')}>
              No liabilities added yet. Click &quot;Add Liability&quot; below.
            </p>
          )}
          {liabilityFields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
              <div>
                <label className={labelClass}>Name</label>
                <input {...register(`liabilities.${index}.name`)} placeholder="Liability name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <CustomDropdown
                  value={liabilities[index]?.category ?? 'mortgage'}
                  onChange={(val) => setValue(`liabilities.${index}.category`, val as any)}
                  options={LIABILITY_CATEGORY_OPTIONS}
                  variant={isMonet ? 'monet' : 'dark'}
                  minWidth="100%"
                />
              </div>
              <div>
                <label className={labelClass}>Balance</label>
                <CurrencyInput
                  value={liabilities[index]?.currentBalance ?? 0}
                  onChange={(val) => setValue(`liabilities.${index}.currentBalance`, val)}
                  size="sm"
                />
              </div>
              <div>
                <label className={labelClass}>APR</label>
                <CurrencyInput
                  value={liabilities[index]?.interestRateApr ?? 0}
                  onChange={(val) => setValue(`liabilities.${index}.interestRateApr`, val)}
                  isPercentage
                  size="sm"
                />
              </div>
              <div>
                <label className={labelClass}>Min Payment</label>
                <CurrencyInput
                  value={liabilities[index]?.minimumPayment ?? 0}
                  onChange={(val) => setValue(`liabilities.${index}.minimumPayment`, val)}
                  size="sm"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeLiability(index)}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    isMonet ? 'text-[var(--monet-text-muted)] hover:text-rose-500' : 'text-slate-600 hover:text-rose-400'
                  )}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => appendLiability(createEmptyLiability())}
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium mt-2 transition-colors',
            isMonet ? 'text-[var(--monet-sage)]' : 'text-emerald-400 hover:text-emerald-300'
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Liability
        </button>
      </div>

      {/* ─── Info Banner ───────────────────────────────────────────────────── */}
      <div className={cn(
        'flex items-start gap-2.5 px-4 py-3 rounded-xl border',
        isMonet
          ? 'border-[var(--monet-lavender)]/15 bg-[var(--monet-lavender)]/5'
          : 'border-blue-500/15 bg-blue-500/5'
      )}>
        <Info className={cn('w-4 h-4 mt-0.5 flex-shrink-0', isMonet ? 'text-[var(--monet-sage)]' : 'text-blue-400')} />
        <p className={cn('text-xs', isMonet ? 'text-[var(--monet-text-secondary)]' : 'text-slate-400')}>
          No assets yet? That&apos;s okay! You can add them later from the dashboard. This step is completely optional.
        </p>
      </div>
    </div>
  )
}
