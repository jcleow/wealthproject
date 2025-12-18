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
      className={`w-full max-w-sm
mx-4
rounded-xl border border-white/[0.08]
bg-[#0a0a0a]`}
    >
      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex items-center justify-center
h-10 w-10
rounded-full
bg-amber-500/20`}>
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
            className={`px-4 py-2
rounded-lg
text-gray-400 hover:text-white
transition-colors`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className={`px-4 py-2
rounded-lg
bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600
text-white
transition-colors`}
          >
            {isSaving ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
