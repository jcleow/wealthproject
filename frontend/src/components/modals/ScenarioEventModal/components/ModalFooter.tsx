"use client"

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const TrashIcon = LucideIcons.Trash2 as LucideIcon | undefined
const CheckIcon = LucideIcons.Check as LucideIcon | undefined
const LoaderIcon = LucideIcons.Loader2 as LucideIcon | undefined
const AlertTriangleIcon = LucideIcons.AlertTriangle as LucideIcon | undefined

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
    <div className="
      flex items-center justify-between
      mt-8 pt-6
      border-t border-white/[0.06]
    ">
      {/* Left side - Delete action */}
      {isEditing ? (
        confirmDelete ? (
          <div className="
            flex items-center gap-3
            px-4 py-3
            rounded-xl
            bg-rose-500/5
            border border-rose-500/20
          ">
            {AlertTriangleIcon && <AlertTriangleIcon className="h-4 w-4 text-rose-400 shrink-0" />}
            <span className="text-sm text-rose-400">Delete this scenario?</span>
            <div className="flex items-center gap-2 ml-2">
              <button
                type="button"
                className={`
                  px-3 py-1.5
                  rounded-lg
                  bg-rose-500/20 hover:bg-rose-500/30
                  text-sm font-medium text-rose-400
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                `}
                onClick={onDelete}
                disabled={disabled}
              >
                {deleting ? (
                  <span className="flex items-center gap-2">
                    {LoaderIcon && <LoaderIcon className="h-3.5 w-3.5 animate-spin" />}
                    Deleting...
                  </span>
                ) : (
                  'Yes, delete'
                )}
              </button>
              <button
                type="button"
                className={`
                  px-3 py-1.5
                  rounded-lg
                  border border-white/[0.08]
                  bg-white/[0.02] hover:bg-white/[0.05]
                  text-sm text-slate-400 hover:text-white
                  transition-all duration-200
                `}
                onClick={() => onConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={`
              group inline-flex items-center gap-2
              px-4 py-2.5
              rounded-xl
              border border-rose-500/10 hover:border-rose-500/30
              bg-rose-500/5 hover:bg-rose-500/10
              text-sm font-medium text-rose-400/70 hover:text-rose-400
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            `}
            onClick={() => onConfirmDelete(true)}
            disabled={disabled}
          >
            {TrashIcon && <TrashIcon className="h-4 w-4" />}
            Delete Scenario
          </button>
        )
      ) : (
        <div />
      )}

      {/* Right side - Save/Cancel */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={`
            px-5 py-2.5
            rounded-xl
            border border-white/[0.06] hover:border-white/[0.15]
            bg-white/[0.02] hover:bg-white/[0.05]
            text-sm font-medium text-slate-400 hover:text-white
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
          `}
          onClick={onClose}
          disabled={saving || deleting}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`
            group relative
            inline-flex items-center gap-2
            px-6 py-2.5
            rounded-xl
            bg-gradient-to-r from-blue-600 to-blue-500
            hover:from-blue-500 hover:to-blue-400
            text-sm font-medium text-white
            shadow-lg shadow-blue-500/20
            disabled:opacity-50 disabled:cursor-not-allowed
            disabled:shadow-none
            transition-all duration-200
            overflow-hidden
          `}
          onClick={onSave}
          disabled={disabled}
        >
          {/* Shine effect */}
          <div className="
            absolute inset-0
            bg-gradient-to-r from-transparent via-white/10 to-transparent
            translate-x-[-100%] group-hover:translate-x-[100%]
            transition-transform duration-700
          " />

          {saving ? (
            <>
              {LoaderIcon && <LoaderIcon className="relative h-4 w-4 animate-spin" />}
              <span className="relative">Saving...</span>
            </>
          ) : (
            <>
              {CheckIcon && <CheckIcon className="relative h-4 w-4" />}
              <span className="relative">{isEditing ? 'Update' : 'Create'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
