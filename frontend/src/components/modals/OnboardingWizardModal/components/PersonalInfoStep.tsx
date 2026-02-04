import { useFormContext, useFieldArray } from 'react-hook-form'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateUUID } from '@/lib/utils'
import { PERSON_COLORS } from '@/types/person'
import { PersonCard } from './PersonCard'
import type { OnboardingFormData, OnboardingPerson } from '../types'

interface PersonalInfoStepProps {
  isMonet: boolean
}

export function PersonalInfoStep({ isMonet }: PersonalInfoStepProps) {
  const { watch, register, control } = useFormContext<OnboardingFormData>()
  const { fields, append, remove } = useFieldArray({ control, name: 'persons' })
  const persons = watch('persons')

  const handleAddPerson = () => {
    const colorIndex = persons.length % PERSON_COLORS.length
    const newPerson: OnboardingPerson = {
      tempId: generateUUID(),
      serverId: null,
      name: '',
      dateOfBirth: '',
      gender: 'male',
      residencyStatus: 'citizen',
      prGrantDate: null,
      relationship: persons.length === 1 ? 'spouse' : 'child',
      customRelationship: '',
      retirementAge: 65,
      displayColor: PERSON_COLORS[colorIndex],
    }
    append(newPerson)
  }

  const handleRemovePerson = (index: number) => {
    if (index === 0) return // Can't remove self

    // TODO(human): Cascade-remove linked data when a person is deleted
    // When a person is removed from Step 1, any incomes (Step 2) and CPF entries (Step 4)
    // that reference this person's tempId should also be removed from the form.
    // The person's tempId is: persons[index].tempId
    // Incomes link via: income.personTempId
    // CPF accounts link via: cpf.personTempId
    // Implement the cascade logic below, then call remove(index) at the end.

    remove(index)
  }

  const inputClass = cn(
    'w-full py-2 px-3 rounded-lg text-sm transition-colors focus:outline-none',
    isMonet
      ? 'bg-[var(--monet-lavender)]/5 border border-[var(--monet-lavender)]/15 text-[var(--monet-text-primary)] placeholder:text-[var(--monet-text-muted)] focus:border-[var(--monet-sage)]/40'
      : 'bg-white/[0.03] border border-white/[0.06] text-white placeholder:text-slate-600 focus:border-blue-500/30 focus:bg-blue-500/[0.06]'
  )

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div>
        <h3 className={cn(
          'text-sm font-semibold',
          isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white'
        )}>
          Household Members
        </h3>
        <p className={cn(
          'text-xs mt-0.5',
          isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500'
        )}>
          Tell us about yourself and your household
        </p>
      </div>

      {/* Person cards */}
      <div className="space-y-3">
        {fields.map((field, index) => (
          <PersonCard
            key={field.id}
            index={index}
            person={persons[index]}
            isSelf={index === 0}
            onRemove={() => handleRemovePerson(index)}
            isMonet={isMonet}
          />
        ))}
      </div>

      {/* Add button */}
      <button
        type="button"
        onClick={handleAddPerson}
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium transition-colors',
          isMonet
            ? 'text-[var(--monet-sage)] hover:text-[var(--monet-sage-dark)]'
            : 'text-emerald-400 hover:text-emerald-300'
        )}
      >
        <Plus className="w-3.5 h-3.5" />
        Add Household Member
      </button>

      {/* Planning Horizon */}
      <div className={cn(
        'border-t pt-4 mt-4',
        isMonet ? 'border-[var(--monet-lavender)]/10' : 'border-white/[0.06]'
      )}>
        <h4 className={cn(
          'text-xs font-semibold uppercase tracking-wider mb-3',
          isMonet ? 'text-[var(--monet-text-secondary)]' : 'text-slate-400'
        )}>
          Planning Horizon
        </h4>
        <div className="flex items-center gap-3">
          <span className={cn(
            'text-sm',
            isMonet ? 'text-[var(--monet-text-secondary)]' : 'text-slate-300'
          )}>
            Years to project from now
          </span>
          <input
            type="number"
            min={1}
            max={80}
            {...register('projectionYears', { valueAsNumber: true })}
            className={cn(inputClass, 'w-20 text-center')}
          />
          <span className={cn(
            'text-xs',
            isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500'
          )}>
          </span>
        </div>
      </div>
    </div>
  )
}
