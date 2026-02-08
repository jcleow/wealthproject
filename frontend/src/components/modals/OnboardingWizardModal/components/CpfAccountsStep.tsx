import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateUUID } from '@/lib/utils'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import type { OnboardingFormData } from '../types'

interface CpfAccountsStepProps {
  isMonet: boolean
}

export function CpfAccountsStep({ isMonet }: CpfAccountsStepProps) {
  const { watch, setValue } = useFormContext<OnboardingFormData>()
  const persons = watch('persons')
  const cpfAccounts = watch('cpfAccounts')

  // Filter to only citizen/PR persons
  const eligiblePersons = persons.filter(
    (p) => p.residencyStatus === 'citizen' || p.residencyStatus === 'pr'
  )

  // Auto-populate CPF entries for eligible persons on mount
  useEffect(() => {
    const existingPersonTempIds = new Set(cpfAccounts.map((c) => c.personTempId))
    const newEntries = eligiblePersons
      .filter((p) => !existingPersonTempIds.has(p.tempId))
      .map((p) => ({
        tempId: generateUUID(),
        serverId: null,
        personTempId: p.tempId,
        oaBalance: 0,
        saBalance: 0,
        maBalance: 0,
        raBalance: 0,
      }))

    if (newEntries.length > 0) {
      setValue('cpfAccounts', [...cpfAccounts, ...newEntries])
    }
    // Only run on mount or when persons change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligiblePersons.length])

  const labelClass = cn(
    'text-xs font-medium mb-1.5',
    isMonet ? 'text-[var(--monet-text-secondary)]' : 'text-slate-400'
  )

  // ─── No eligible persons ──────────────────────────────────────────────────

  if (eligiblePersons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center mb-4',
          isMonet ? 'bg-[var(--monet-lavender)]/10' : 'bg-blue-500/10'
        )}>
          <Info className={cn('w-6 h-6', isMonet ? 'text-[var(--monet-sage)]' : 'text-blue-400')} />
        </div>
        <h3 className={cn(
          'text-sm font-semibold mb-2',
          isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white'
        )}>
          Not Applicable
        </h3>
        <p className={cn(
          'text-xs max-w-sm',
          isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500'
        )}>
          CPF accounts are only applicable for Singapore Citizens and Permanent Residents.
          None of your household members have Citizen or PR residency status.
        </p>
      </div>
    )
  }

  // ─── CPF balance entry cards ──────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h3 className={cn('text-lg font-semibold', isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white')}>
          CPF Account Balances
        </h3>
        <p className={cn('text-xs mt-0.5', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>
          Enter your current CPF balances
        </p>
      </div>

      {eligiblePersons.map((person, personIndex) => {
        const cpfIndex = cpfAccounts.findIndex((c) => c.personTempId === person.tempId)
        if (cpfIndex === -1) return null

        const statusLabel = person.residencyStatus === 'pr'
          ? `PR${person.prGrantDate ? ` since ${new Date(person.prGrantDate).getFullYear()}` : ''}`
          : 'Citizen'

        return (
          <div key={person.tempId}>
            {/* Divider between persons */}
            {personIndex > 0 && (
              <div className={cn(
                'border-t mb-5',
                isMonet ? 'border-[var(--monet-lavender)]/10' : 'border-white/[0.06]'
              )} />
            )}
            {/* Person header */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: person.displayColor }}
              />
              <span className={cn(
                'text-sm font-medium',
                isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white'
              )}>
                {person.name || 'Unnamed'}
              </span>
              <span className={cn(
                'text-xs',
                isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500'
              )}>
                ({statusLabel})
              </span>
            </div>

            {/* 2x2 grid of CPF accounts — flat labels + inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <label className={cn(labelClass, 'uppercase tracking-wider text-[10px]')}>Ordinary Account (OA)</label>
                <CurrencyInput
                  value={cpfAccounts[cpfIndex]?.oaBalance ?? 0}
                  onChange={(val) => setValue(`cpfAccounts.${cpfIndex}.oaBalance`, val)}
                  size="sm"
                />
              </div>

              <div>
                <label className={cn(labelClass, 'uppercase tracking-wider text-[10px]')}>Special Account (SA)</label>
                <CurrencyInput
                  value={cpfAccounts[cpfIndex]?.saBalance ?? 0}
                  onChange={(val) => setValue(`cpfAccounts.${cpfIndex}.saBalance`, val)}
                  size="sm"
                />
              </div>

              <div>
                <label className={cn(labelClass, 'uppercase tracking-wider text-[10px]')}>MediSave Account (MA)</label>
                <CurrencyInput
                  value={cpfAccounts[cpfIndex]?.maBalance ?? 0}
                  onChange={(val) => setValue(`cpfAccounts.${cpfIndex}.maBalance`, val)}
                  size="sm"
                />
              </div>

              <div>
                <label className={cn(labelClass, 'uppercase tracking-wider text-[10px]')}>Retirement Account (RA)</label>
                <CurrencyInput
                  value={cpfAccounts[cpfIndex]?.raBalance ?? 0}
                  onChange={(val) => setValue(`cpfAccounts.${cpfIndex}.raBalance`, val)}
                  size="sm"
                />
              </div>
            </div>

            {/* RA info note */}
            <p className={cn(
              'text-[10px] mt-3 flex items-center gap-1.5',
              isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600'
            )}>
              <Info className="w-3 h-3 flex-shrink-0" />
              RA is created at age 55. Leave as $0 if you&apos;re under 55.
            </p>
          </div>
        )
      })}
    </div>
  )
}
