"use client"

import { useState, useRef, useEffect } from 'react'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const CheckIcon = LucideIcons.Check as LucideIcon | undefined

interface LockedFieldProps {
  /** The current value to display */
  value: string
  /** Called when the value is updated */
  onChange: (value: string) => void
  /** Label shown above the field */
  label: string
  /** Placeholder when editing */
  placeholder?: string
  /** Secondary info shown on the right (e.g., amount) */
  secondaryValue?: string
  /** Whether the field is disabled */
  disabled?: boolean
  /** Whether this is a new item (shows edit mode by default) */
  isNew?: boolean
}

/**
 * An inline-editable field with a clean, intuitive design.
 * Click anywhere to edit. Shows a subtle text input appearance
 * that makes editability obvious without cluttering icons.
 */
export function LockedField({
  value,
  onChange,
  label,
  placeholder,
  secondaryValue,
  disabled = false,
  isNew = false,
}: LockedFieldProps) {
  const [isEditing, setIsEditing] = useState(isNew)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync editValue when value prop changes (e.g., when hydrating from API)
  useEffect(() => {
    setEditValue(value)
  }, [value])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleActivate = () => {
    if (disabled) return
    setIsEditing(true)
    setEditValue(value)
  }

  const handleConfirm = () => {
    onChange(editValue)
    setIsEditing(false)
  }

  const handleBlur = () => {
    // Auto-confirm on blur if there's a value
    if (editValue.trim()) {
      handleConfirm()
    } else if (value) {
      // Revert to original if user cleared it
      setEditValue(value)
      setIsEditing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm()
    } else if (e.key === 'Escape') {
      setEditValue(value)
      setIsEditing(false)
    }
  }

  // Edit mode - seamless inline input
  if (isEditing) {
    return (
      <div className="space-y-2">
        <label className="text-xs text-slate-500 uppercase tracking-wide block">
          {label} <span className="text-rose-400">*</span>
        </label>
        <div className="relative group">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="
              w-full
              px-0 py-2
              bg-transparent
              border-0 border-b-2 border-blue-500/60
              text-[15px] text-white font-medium
              placeholder:text-slate-600 placeholder:font-normal
              outline-none
              caret-blue-400
              transition-all duration-200
            "
            placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
            disabled={disabled}
          />
          {/* Confirm indicator */}
          {editValue.trim() && (
            <button
              type="button"
              onClick={handleConfirm}
              className="
                absolute right-0 top-1/2 -translate-y-1/2
                flex items-center gap-1.5
                px-2 py-1
                rounded-md
                text-emerald-400/80 hover:text-emerald-400
                hover:bg-emerald-500/10
                text-[10px] uppercase tracking-wide font-medium
                transition-all duration-150
              "
            >
              {CheckIcon && <CheckIcon className="h-3 w-3" />}
              <span>Done</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  // Display mode - clean clickable text
  return (
    <div className="space-y-2">
      <label className="text-xs text-slate-500 uppercase tracking-wide block">
        {label}
      </label>
      <button
        type="button"
        onClick={handleActivate}
        disabled={disabled}
        className={`
          group
          w-full
          flex items-center justify-between gap-4
          px-0 py-2
          border-0 border-b border-white/[0.06]
          bg-transparent
          text-left
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:border-white/[0.15]
          transition-all duration-200
          cursor-text
        `}
      >
        {/* Value display */}
        <div className="min-w-0 flex-1">
          {value ? (
            <span className="
              text-[15px] text-white font-medium
              group-hover:text-white/90
              transition-colors duration-150
            ">
              {value}
            </span>
          ) : (
            <span className="
              text-[15px] text-slate-600
              group-hover:text-slate-500
              transition-colors duration-150
            ">
              {placeholder || `Enter ${label.toLowerCase()}...`}
            </span>
          )}
        </div>

        {/* Secondary value (amount) - subtle pill */}
        {secondaryValue && (
          <span className="
            shrink-0
            text-xs font-mono
            text-slate-400
            bg-white/[0.04]
            px-2.5 py-1
            rounded-full
            border border-white/[0.04]
            group-hover:bg-white/[0.06]
            group-hover:border-white/[0.08]
            transition-all duration-200
          ">
            {secondaryValue}
          </span>
        )}
      </button>
    </div>
  )
}
