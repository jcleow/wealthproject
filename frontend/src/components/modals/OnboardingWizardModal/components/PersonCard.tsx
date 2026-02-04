import { useFormContext } from 'react-hook-form'
import { Trash2, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import { AnimatePresence, motion } from 'framer-motion'
import type { OnboardingFormData, OnboardingPerson } from '../types'

interface PersonCardProps {
  index: number
  person: OnboardingPerson
  isSelf: boolean
  onRemove: () => void
  isMonet: boolean
}

const GENDER_OPTIONS = [
  { value: 'male' as const, label: 'Male' },
  { value: 'female' as const, label: 'Female' },
]

const RESIDENCY_OPTIONS = [
  { value: 'citizen' as const, label: 'Citizen' },
  { value: 'pr' as const, label: 'PR' },
]

const ROLE_COLORS: Record<string, string> = {
  self: '#10b981',
  spouse: '#3b82f6',
  child: '#8b5cf6',
  parent: '#f59e0b',
  other: '#ec4899',
}

export function PersonCard({ index, person, isSelf, onRemove, isMonet }: PersonCardProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<OnboardingFormData>()
  const residencyStatus = watch(`persons.${index}.residencyStatus`)
  const relationship = watch(`persons.${index}.relationship`)
  const relationshipLower = relationship?.toLowerCase() ?? ''
  const isChild = relationshipLower === 'child'
  const roleColor = ROLE_COLORS[relationshipLower] ?? ROLE_COLORS.other

  const fieldPrefix = `persons.${index}` as const

  const inputClass = cn(
    'w-full py-2 px-3 rounded-lg text-sm transition-colors focus:outline-none',
    isMonet
      ? 'bg-[var(--monet-lavender)]/5 border border-[var(--monet-lavender)]/15 text-[var(--monet-text-primary)] placeholder:text-[var(--monet-text-muted)] focus:border-[var(--monet-sage)]/40'
      : 'bg-white/[0.03] border border-white/[0.06] text-white placeholder:text-slate-600 focus:border-white/20'
  )

  const labelClass = cn(
    'text-xs font-medium mb-1',
    isMonet ? 'text-[var(--monet-text-secondary)]' : 'text-slate-400'
  )

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        isMonet
          ? 'border-[var(--monet-lavender)]/15 bg-[var(--monet-lavender)]/[0.03]'
          : 'border-white/[0.06] bg-white/[0.02]'
      )}
    >
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: roleColor }}
          />
          <span className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            isMonet ? 'text-[var(--monet-text-secondary)]' : 'text-slate-400'
          )}>
            {isSelf ? 'Yourself' : (relationship || 'Member')}
          </span>
        </div>
        {!isSelf && (
          <button
            type="button"
            onClick={onRemove}
            className={cn(
              'p-1 rounded-md transition-colors',
              isMonet
                ? 'text-[var(--monet-text-muted)] hover:text-rose-500 hover:bg-rose-50'
                : 'text-slate-600 hover:text-rose-400 hover:bg-rose-500/10'
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Row 1: Name, DOB, Gender */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label className={labelClass}>Name</label>
          <input
            {...register(`${fieldPrefix}.name`)}
            placeholder="Full name"
            className={inputClass}
          />
          {errors.persons?.[index]?.name && (
            <p className="text-xs text-rose-400 mt-1">{errors.persons[index]?.name?.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Date of Birth</label>
          <div className="relative">
            <Calendar className={cn('absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')} />
            <input
              type="date"
              {...register(`${fieldPrefix}.dateOfBirth`)}
              className={cn(inputClass, 'pl-8')}
            />
          </div>
          {errors.persons?.[index]?.dateOfBirth && (
            <p className="text-xs text-rose-400 mt-1">{errors.persons[index]?.dateOfBirth?.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Gender</label>
          <CustomDropdown
            value={person.gender}
            onChange={(val) => setValue(`${fieldPrefix}.gender`, val)}
            options={GENDER_OPTIONS}
            variant={isMonet ? 'monet' : 'dark'}
            minWidth="100%"
          />
        </div>
      </div>

      {/* Row 2: Residency, PR Grant Date, Retirement Age / Relationship */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {isSelf ? (
          <>
            <div>
              <label className={labelClass}>Residency Status</label>
              <CustomDropdown
                value={residencyStatus}
                onChange={(val) => setValue(`${fieldPrefix}.residencyStatus`, val as 'citizen' | 'pr')}
                options={RESIDENCY_OPTIONS}
                variant={isMonet ? 'monet' : 'dark'}
                minWidth="100%"
              />
            </div>
            <AnimatePresence mode="wait">
              {residencyStatus === 'pr' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className={labelClass}>PR Grant Date</label>
                  <div className="relative">
                    <Calendar className={cn('absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')} />
                    <input
                      type="date"
                      {...register(`${fieldPrefix}.prGrantDate`)}
                      className={cn(inputClass, 'pl-8')}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {!isChild && (
              <div>
                <label className={labelClass}>Retirement Age</label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  {...register(`${fieldPrefix}.retirementAge`, { valueAsNumber: true })}
                  className={inputClass}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <label className={labelClass}>Relationship</label>
              <input
                {...register(`${fieldPrefix}.relationship`)}
                placeholder="e.g. Spouse, Child, Parent"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Residency Status</label>
              <CustomDropdown
                value={residencyStatus}
                onChange={(val) => setValue(`${fieldPrefix}.residencyStatus`, val as 'citizen' | 'pr')}
                options={RESIDENCY_OPTIONS}
                variant={isMonet ? 'monet' : 'dark'}
                minWidth="100%"
              />
            </div>
            <AnimatePresence mode="wait">
              {residencyStatus === 'pr' ? (
                <motion.div
                  key="pr-date"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className={labelClass}>PR Grant Date</label>
                  <div className="relative">
                    <Calendar className={cn('absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')} />
                    <input
                      type="date"
                      {...register(`${fieldPrefix}.prGrantDate`)}
                      className={cn(inputClass, 'pl-8')}
                    />
                  </div>
                </motion.div>
              ) : !isChild ? (
                <div>
                  <label className={labelClass}>Retirement Age</label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    {...register(`${fieldPrefix}.retirementAge`, { valueAsNumber: true })}
                    className={inputClass}
                  />
                </div>
              ) : null}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}
