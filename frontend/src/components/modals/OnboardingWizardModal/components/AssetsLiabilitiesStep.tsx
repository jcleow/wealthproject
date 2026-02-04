import { useState } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { generateUUID } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { OnboardingFormData, OnboardingAsset, OnboardingLiability } from '../types'
import { AssetRow } from './AssetRow'
import { LiabilityRow } from './LiabilityRow'

interface AssetsLiabilitiesStepProps {
  isMonet: boolean
}

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

const rowAnimation = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8, transition: { duration: 0.15 } },
  transition: { duration: 0.2 },
}

export function AssetsLiabilitiesStep({ isMonet }: AssetsLiabilitiesStepProps) {
  const { watch, control } = useFormContext<OnboardingFormData>()
  const { fields: assetFields, append: appendAsset, remove: removeAsset } = useFieldArray({ control, name: 'assets' })
  const { fields: liabilityFields, append: appendLiability, remove: removeLiability } = useFieldArray({ control, name: 'liabilities' })

  const assets = watch('assets')
  const liabilities = watch('liabilities')

  // ─── Accordion state ────────────────────────────────────────────────────
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  const assetTotal = assets.reduce((sum, a) => sum + (a.currentValue ?? 0), 0)
  const liabilityTotal = liabilities.reduce((sum, l) => sum + (l.currentBalance ?? 0), 0)

  // ─── Add handlers (new rows start expanded) ────────────────────────────
  const handleAddAsset = () => {
    appendAsset(createEmptyAsset())
    setExpandedRowId(`asset-${assetFields.length}`)
  }

  const handleAddLiability = () => {
    appendLiability(createEmptyLiability())
    setExpandedRowId(`liability-${liabilityFields.length}`)
  }

  const handleRemoveAsset = (index: number) => {
    if (expandedRowId === `asset-${index}`) setExpandedRowId(null)
    removeAsset(index)
  }

  const handleRemoveLiability = (index: number) => {
    if (expandedRowId === `liability-${index}`) setExpandedRowId(null)
    removeLiability(index)
  }

  const addButtonClass = cn(
    'flex items-center gap-1.5 text-xs font-medium transition-colors mt-3',
    isMonet ? 'text-[var(--monet-sage)]' : 'text-slate-400 hover:text-slate-200'
  )

  return (
    <div className="space-y-5">
      {/* ─── Assets ────────────────────────────────────────────────────────── */}
      <div className={cn(
        'rounded-2xl border p-4',
        isMonet
          ? 'border-[var(--monet-lavender)]/10 bg-[var(--monet-lavender)]/3'
          : 'border-white/[0.06] bg-white/[0.02]'
      )}>
        <h3 className={cn('text-sm font-semibold mb-1', isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white')}>
          Assets
        </h3>
        <div className="flex items-center justify-between mb-4 pr-[46px]">
          <p className={cn('text-xs', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>
            What you own — savings, investments, property, etc.
          </p>
          <span className={cn(
            'text-sm font-mono tabular-nums text-right min-w-[100px]',
            isMonet ? 'text-[var(--monet-sage)]' : 'text-slate-300'
          )}>
            {formatCurrency(assetTotal)}
          </span>
        </div>

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {assetFields.map((field, index) => (
              <motion.div key={field.id} {...rowAnimation}>
                <AssetRow
                  fieldIndex={index}
                  isExpanded={expandedRowId === `asset-${index}`}
                  onToggle={() =>
                    setExpandedRowId(
                      expandedRowId === `asset-${index}` ? null : `asset-${index}`
                    )
                  }
                  onRemove={() => handleRemoveAsset(index)}
                  isMonet={isMonet}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {assetFields.length === 0 && (
            <div className={cn(
              'text-center py-4 rounded-xl border border-dashed',
              isMonet ? 'border-[var(--monet-lavender)]/15 text-[var(--monet-text-muted)]' : 'border-white/[0.08] text-slate-600'
            )}>
              <p className="text-xs">No assets added yet. Add your savings or investments to track your net worth.</p>
            </div>
          )}
        </div>

        <button type="button" onClick={handleAddAsset} className={addButtonClass}>
          <Plus className="w-3.5 h-3.5" />
          Add asset
        </button>
      </div>

      {/* ─── Liabilities ───────────────────────────────────────────────────── */}
      <div className={cn(
        'rounded-2xl border p-4',
        isMonet
          ? 'border-[var(--monet-lavender)]/10 bg-[var(--monet-lavender)]/3'
          : 'border-white/[0.06] bg-white/[0.02]'
      )}>
        <h3 className={cn('text-sm font-semibold mb-1', isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white')}>
          Liabilities
        </h3>
        <div className="flex items-center justify-between mb-4 pr-[46px]">
          <p className={cn('text-xs', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>
            What you owe — mortgages, loans, credit cards, etc.
          </p>
          <span className={cn(
            'text-sm font-mono tabular-nums text-right min-w-[100px]',
            isMonet ? 'text-rose-500' : 'text-slate-300'
          )}>
            ({formatCurrency(liabilityTotal)})
          </span>
        </div>

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {liabilityFields.map((field, index) => (
              <motion.div key={field.id} {...rowAnimation}>
                <LiabilityRow
                  fieldIndex={index}
                  isExpanded={expandedRowId === `liability-${index}`}
                  onToggle={() =>
                    setExpandedRowId(
                      expandedRowId === `liability-${index}` ? null : `liability-${index}`
                    )
                  }
                  onRemove={() => handleRemoveLiability(index)}
                  isMonet={isMonet}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {liabilityFields.length === 0 && (
            <div className={cn(
              'text-center py-4 rounded-xl border border-dashed',
              isMonet ? 'border-[var(--monet-lavender)]/15 text-[var(--monet-text-muted)]' : 'border-white/[0.08] text-slate-600'
            )}>
              <p className="text-xs">No liabilities added yet. Track your debts for a complete financial picture.</p>
            </div>
          )}
        </div>

        <button type="button" onClick={handleAddLiability} className={addButtonClass}>
          <Plus className="w-3.5 h-3.5" />
          Add liability
        </button>
      </div>

    </div>
  )
}
