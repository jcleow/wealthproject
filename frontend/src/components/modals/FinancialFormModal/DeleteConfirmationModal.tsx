import { Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { calculateActualYear } from '@/components/dashboard/FinancialDataManagement/utils'

type DeleteMode = 'stop' | 'delete'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
  isDeleting: boolean
  deleteMode: DeleteMode
  onDeleteModeChange: (mode: DeleteMode) => void
  selectedYearLabel?: string
  selectedYear?: number
  selectedMonth?: number
  anchorYear?: number | null
}

export function DeleteConfirmationModal({
  isOpen,
  onCancel,
  onConfirm,
  isDeleting,
  deleteMode,
  onDeleteModeChange,
  selectedYearLabel,
  selectedYear,
  selectedMonth,
  anchorYear,
}: DeleteConfirmationModalProps) {
  // Format as "March 2026" if we have month info, otherwise fall back to year label
  const getDateDisplay = () => {
    if (selectedMonth !== undefined && selectedYear !== undefined) {
      const actualYear = calculateActualYear(selectedYear, anchorYear)
      const monthName = MONTH_NAMES[selectedMonth - 1] // selectedMonth is 1-indexed
      return `${monthName} ${actualYear}`
    }
    return selectedYearLabel ?? `Year ${selectedYear}`
  }
  const dateDisplay = getDateDisplay()

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
bg-red-500/20`}>
            <Trash2 className="h-5 w-5 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Delete Expense</h3>
        </div>
        <p className="mb-4 text-sm text-gray-300">How would you like to delete this expense?</p>
        <div className="mb-6 space-y-3">
          <label className={`flex items-start
gap-3 p-3
rounded-lg border border-gray-700 hover:border-gray-600
bg-gray-800/50
cursor-pointer transition-colors`}>
            <input
              type="radio"
              name="deleteMode"
              checked={deleteMode === 'stop'}
              onChange={() => onDeleteModeChange('stop')}
              className={`h-4 w-4
mt-1
border-gray-600 focus:ring-emerald-500 focus:ring-offset-gray-800
bg-gray-700
text-emerald-500`}
            />
            <div>
              <span className="text-sm font-medium text-gray-200">Stop from {dateDisplay}</span>
              <p className="text-xs text-gray-400">
                The expense will continue until this month, then stop
              </p>
            </div>
          </label>
          <label className={`flex items-start
gap-3 p-3
rounded-lg border border-gray-700 hover:border-gray-600
bg-gray-800/50
cursor-pointer transition-colors`}>
            <input
              type="radio"
              name="deleteMode"
              checked={deleteMode === 'delete'}
              onChange={() => onDeleteModeChange('delete')}
              className={`h-4 w-4
mt-1
border-gray-600 focus:ring-emerald-500 focus:ring-offset-gray-800
bg-gray-700
text-emerald-500`}
            />
            <div>
              <span className="text-sm font-medium text-gray-200">Delete completely</span>
              <p className="text-xs text-gray-400">
                Remove the expense from all months permanently
              </p>
            </div>
          </label>
        </div>
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
            disabled={isDeleting}
            className={`px-4 py-2
rounded-lg
bg-red-500 hover:bg-red-600 disabled:bg-gray-600
text-white
transition-colors`}
          >
            {isDeleting ? 'Deleting...' : deleteMode === 'stop' ? 'Stop Expense' : 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
