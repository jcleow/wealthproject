"use client"

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const TrashIcon = LucideIcons.Trash2 as LucideIcon | undefined

interface ModalFooterProps {
  isEditing: boolean
  confirmDelete: boolean
  onConfirmDelete: (confirm: boolean) => void
  onDelete: () => void
  onSave: () => void
  onClose: () => void
  saving: boolean
  deleting: boolean
  disabled: boolean
}

export function ModalFooter({
  isEditing,
  confirmDelete,
  onConfirmDelete,
  onDelete,
  onSave,
  onClose,
  saving,
  deleting,
  disabled,
}: ModalFooterProps) {
  return (
    <div className={`flex items-center justify-between
mt-6 gap-3 pt-5
border-t border-white/[0.06]`}>
      {isEditing ? (
        confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-rose-400">Delete this scenario?</span>
            <button
              type="button"
              className={`px-3 py-1.5
rounded-lg border border-rose-500/30
bg-rose-500/10 hover:bg-rose-500/20
text-sm font-medium text-rose-400
disabled:opacity-50`}
              onClick={onDelete}
              disabled={disabled}
            >
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              type="button"
              className={`px-3 py-1.5
rounded-lg border border-white/[0.08]
bg-white/[0.03]
text-sm text-slate-400`}
              onClick={() => onConfirmDelete(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={`inline-flex items-center
gap-1.5 px-3 py-2
rounded-lg border border-rose-500/20
bg-rose-500/5 hover:bg-rose-500/10
text-sm font-medium text-rose-400
disabled:opacity-50`}
            onClick={() => onConfirmDelete(true)}
            disabled={disabled}
          >
            {TrashIcon && <TrashIcon className="h-3.5 w-3.5" />}
            Delete
          </button>
        )
      ) : (
        <div />
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`px-4 py-2
rounded-lg border border-white/[0.08]
bg-white/[0.03]
text-sm font-medium text-slate-400 hover:text-slate-200
disabled:opacity-50`}
          onClick={onClose}
          disabled={saving || deleting}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`px-4 py-2
rounded-lg
bg-blue-600 hover:bg-blue-500
text-sm font-medium text-white
shadow-lg disabled:opacity-50`}
          onClick={onSave}
          disabled={disabled}
        >
          {saving ? 'Saving…' : isEditing ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  )
}
