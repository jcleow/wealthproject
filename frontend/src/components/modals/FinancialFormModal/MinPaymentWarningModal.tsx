import { AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/format'

interface MinPaymentWarningModalProps {
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
  isSaving: boolean
  newAmount: number
  minPayment: number
}

export function MinPaymentWarningModal({
  isOpen,
  onCancel,
  onConfirm,
  isSaving,
  newAmount,
  minPayment,
}: MinPaymentWarningModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      overlayClassName="bg-black/60"
      className="mx-4 w-full max-w-sm rounded-xl border border-white/[0.08] bg-[#0a0a0a]"
    >
      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Lower Minimum Payment</h3>
        </div>
        <p className="mb-6 text-sm text-gray-300">
          The repayment amount ({formatCurrency(newAmount)}) is less than the current minimum
          payment ({formatCurrency(minPayment)}). This will lower the minimum payment on the
          liability.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-gray-400 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className="rounded-lg bg-amber-500 px-4 py-2 text-white transition-colors hover:bg-amber-600 disabled:bg-gray-600"
          >
            {isSaving ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
