import { useFormContext } from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import { DatePicker } from '@/components/ui/DatePicker'
import { AnimatePresence, motion } from 'framer-motion'
import type { OnboardingFormData, OnboardingPerson } from '../types'
import { RELATIONSHIP_OPTIONS } from '../types'

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

export function PersonCard({ index, person, isSelf, onRemove, isMonet }: PersonCardProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<OnboardingFormData>()
  const residencyStatus = watch(`persons.${index}.residencyStatus`)
  const relationship = watch(`persons.${index}.relationship`)
  const dateOfBirth = watch(`persons.${index}.dateOfBirth`)
  const prGrantDate = watch(`persons.${index}.prGrantDate`)
  const todayString = new Date().toISOString().split('T')[0]
  const isChild = relationship === 'child'
  const isOtherRelationship = relationship === 'other'

  const fieldPrefix = `persons.${index}` as const

  const personErrors = errors.persons?.[index]

  const getInputClass = (fieldName?: keyof NonNullable<typeof personErrors>) => {
    const hasError = fieldName && personErrors?.[fieldName]
    return cn(
      'w-full py-2 px-3 rounded-lg text-sm transition-colors focus:outline-none',
      hasError
        ? 'border border-rose-500/40 bg-rose-500/5 text-white placeholder:text-slate-600 focus:border-rose-500/60'
        : isMonet
          ? 'bg-[var(--monet-lavender)]/5 border border-[var(--monet-lavender)]/15 text-[var(--monet-text-primary)] placeholder:text-[var(--monet-text-muted)] focus:border-[var(--monet-sage)]/40'
          : 'bg-white/[0.03] border border-white/[0.06] text-white placeholder:text-slate-600 focus:border-blue-500/30 focus:bg-blue-500/[0.06]'
    )
  }

  // Fallback for fields that don't need error state
  const inputClass = getInputClass()

  const labelClass = cn(
    'text-xs font-medium mb-1',
    isMonet ? 'text-[var(--monet-text-secondary)]' : 'text-slate-400'
  )

  return (
    <div
      className={cn(
        'relative rounded-xl border p-4 transition-colors',
        isMonet
          ? 'border-[var(--monet-lavender)]/15 bg-[var(--monet-lavender)]/[0.03]'
          : 'border-white/[0.06] bg-white/[0.02]'
      )}
    >
      {/* Delete button - positioned in top-right corner for non-self members */}
      {!isSelf && (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            'absolute top-3 right-3 p-1 rounded-md transition-colors',
            isMonet
              ? 'text-[var(--monet-text-muted)] hover:text-rose-500 hover:bg-rose-50'
              : 'text-slate-600 hover:text-rose-400 hover:bg-rose-500/10'
          )}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Row 1: Name, DOB, Gender */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label className={labelClass}>Name</label>
          <input
            {...register(`${fieldPrefix}.name`)}
            placeholder="Full name"
            className={getInputClass('name')}
          />
        </div>
        <div>
          <label className={labelClass}>Date of Birth</label>
          <DatePicker
            value={dateOfBirth || undefined}
            onChange={(val) => setValue(`${fieldPrefix}.dateOfBirth`, val)}
            placeholder="Select date"
            maxDate={todayString}
            variant={isMonet ? 'monet' : 'dark'}
            hasError={!!personErrors?.dateOfBirth}
          />
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
                  <DatePicker
                    value={prGrantDate || undefined}
                    onChange={(val) => setValue(`${fieldPrefix}.prGrantDate`, val)}
                    placeholder="Select date"
                    maxDate={todayString}
                    variant={isMonet ? 'monet' : 'dark'}
                  />
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
              <CustomDropdown
                value={relationship}
                onChange={(val) => {
                  setValue(`${fieldPrefix}.relationship`, val)
                  if (val !== 'other') setValue(`${fieldPrefix}.customRelationship`, '')
                }}
                options={[...RELATIONSHIP_OPTIONS]}
                variant={isMonet ? 'monet' : 'dark'}
                minWidth="100%"
              />
            </div>
            {isOtherRelationship && (
              <div>
                <label className={labelClass}>Specify Relationship</label>
                <input
                  {...register(`${fieldPrefix}.customRelationship`)}
                  placeholder="e.g. Uncle, Cousin, Partner"
                  className={inputClass}
                />
              </div>
            )}
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
                  <DatePicker
                    value={prGrantDate || undefined}
                    onChange={(val) => setValue(`${fieldPrefix}.prGrantDate`, val)}
                    placeholder="Select date"
                    maxDate={todayString}
                    variant={isMonet ? 'monet' : 'dark'}
                  />
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
