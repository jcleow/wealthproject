"use client"

import { Modal } from '@/components/ui/Modal'

import { useCpfBalanceForm } from './hooks/useCpfBalanceForm'
import { FormField } from './components/FormField'

interface CpfBalanceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => Promise<void> | void
}

export function CpfBalanceModal({ isOpen, onClose, onSuccess }: CpfBalanceModalProps) {
  const form = useCpfBalanceForm({ onSuccess, onClose })

  return (
    <Modal
      isOpen={isOpen}
      onClose={form.submitting ? undefined : onClose}
      overlayClassName="bg-black/60"
      className={`w-full max-w-md
p-6
rounded-xl border border-white/[0.08]
bg-[#0a0a0a]
shadow-2xl`}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-200">CPF Accounts</p>
          <h2 className="text-lg font-semibold text-white">Add CPF Balances</h2>
          <p className="text-sm text-gray-400">We will create OA, SA, and MA as retirement assets.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`flex items-center justify-center
h-8 w-8
rounded-full
bg-white/5 hover:bg-white/10
text-gray-300
transition`}
        >
          ✕
        </button>
      </div>

      <form className="space-y-4" onSubmit={form.handleSubmit}>
        <FormField
          label="Ordinary Account (OA)"
          placeholder="45000.00"
          value={form.values.ordinaryAccount}
          onChange={form.handleChange('ordinaryAccount')}
          error={form.errors.ordinaryAccount}
        />
        <FormField
          label="Special Account (SA)"
          placeholder="25000.00"
          value={form.values.specialAccount}
          onChange={form.handleChange('specialAccount')}
          error={form.errors.specialAccount}
        />
        <FormField
          label="Medisave Account (MA)"
          placeholder="15000.00"
          value={form.values.medisaveAccount}
          onChange={form.handleChange('medisaveAccount')}
          error={form.errors.medisaveAccount}
        />

        {form.submitError && <p className="text-sm text-rose-300">{form.submitError}</p>}

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
            disabled={form.submitting}
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
            disabled={form.submitting}
          >
            {form.submitting ? 'Saving…' : 'Add CPF balances'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
