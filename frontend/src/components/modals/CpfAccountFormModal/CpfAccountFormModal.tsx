'use client'

import { Controller } from 'react-hook-form'
import { Modal } from '@/components/ui/Modal'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { PersonSelector } from '@/components/ui/PersonSelector'
import type { CPFAccount, CPFAccountCreatePayload, CPFAccountUpdatePayload } from '@/types/cpf'

import { useCpfAccountForm, RESIDENCY_OPTIONS } from './hooks'
import { FormField } from './components'

interface CpfAccountFormModalProps {
  isOpen: boolean
  onClose: () => void
  cpfAccount: CPFAccount | null | undefined
  mode: 'create' | 'edit'
  onSave?: (id: string, updates: CPFAccountUpdatePayload) => Promise<void>
  onCreate?: (payload: CPFAccountCreatePayload) => Promise<void>
}

export function CpfAccountFormModal({
  isOpen,
  onClose,
  cpfAccount,
  mode,
  onSave,
  onCreate,
}: CpfAccountFormModalProps) {
  const { form, handleSubmit, isSubmitting, errors, submitError, residencyStatus } = useCpfAccountForm({
    cpfAccount,
    mode,
    onSave,
    onCreate,
    onClose,
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? undefined : onClose}
      overlayClassName="bg-black/60"
      className={`w-full max-w-lg
p-6
rounded-xl border border-white/[0.08]
bg-[#0a0a0a]
shadow-2xl`}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-300">CPF Account</p>
          <h2 className="text-lg font-semibold text-white">
            {mode === 'create' ? 'Add CPF Account' : 'Edit CPF Balances'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className={`flex items-center justify-center
h-8 w-8
rounded-full
bg-white/5 hover:bg-white/10
text-gray-300
disabled:opacity-50
transition`}
        >
          &times;
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Person Selector */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-200">Person</label>
          <Controller
            name="personId"
            control={form.control}
            render={({ field }) => (
              <PersonSelector
                value={field.value}
                onChange={field.onChange}
                placeholder="Select person (optional)"
              />
            )}
          />
        </div>

        {/* Account Balances */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Ordinary Account (OA)"
            type="number"
            step="0.01"
            placeholder="45000.00"
            registration={form.register('oaBalance')}
            error={errors.oaBalance?.message}
          />
          <FormField
            label="Special Account (SA)"
            type="number"
            step="0.01"
            placeholder="25000.00"
            registration={form.register('saBalance')}
            error={errors.saBalance?.message}
          />
          <FormField
            label="MediSave Account (MA)"
            type="number"
            step="0.01"
            placeholder="15000.00"
            registration={form.register('maBalance')}
            error={errors.maBalance?.message}
          />
          <FormField
            label="Retirement Account (RA)"
            type="number"
            step="0.01"
            placeholder="0.00"
            registration={form.register('raBalance')}
            error={errors.raBalance?.message}
          />
        </div>

        {/* Housing Usage */}
        <FormField
          label="OA Used for Housing"
          type="number"
          step="0.01"
          placeholder="0.00"
          registration={form.register('oaUsedForHousing')}
          error={errors.oaUsedForHousing?.message}
        />

        {/* Personal Info */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Date of Birth"
            type="date"
            registration={form.register('dateOfBirth')}
            error={errors.dateOfBirth?.message}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-200">Residency Status</label>
            <Controller
              name="residencyStatus"
              control={form.control}
              render={({ field }) => (
                <CustomSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={RESIDENCY_OPTIONS}
                  className="w-full"
                />
              )}
            />
          </div>
        </div>

        {/* Optional Dates */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Housing Start Date"
            type="date"
            registration={form.register('housingStartDate')}
            hint="When you started using OA for housing"
          />
          {residencyStatus !== 'citizen' && (
            <FormField
              label="PR Grant Date"
              type="date"
              registration={form.register('prGrantDate')}
              hint="Date PR status was granted"
            />
          )}
        </div>

        {submitError && <p className="text-sm text-rose-300">{submitError}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1
px-4 py-2
rounded-lg border border-white/10
bg-white/5 hover:bg-white/10
text-sm text-gray-200
transition`}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`flex-1
px-4 py-2
rounded-lg
bg-emerald-500 hover:bg-emerald-600
text-sm font-medium text-white
disabled:opacity-70
transition`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
