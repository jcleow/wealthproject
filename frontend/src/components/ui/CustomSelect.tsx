"use client"

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface CustomSelectProps {
  value: string | number
  onChange: (value: string | number) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Style variant - defaults to 'default' */
  variant?: 'default' | 'compact' | 'minimal'
  /** ID for accessibility */
  id?: string
}

/**
 * A custom dropdown select component that renders dropdowns below the trigger
 * to avoid overlay issues within modals. Uses the same styling as other
 * glassmorphic dropdowns in the codebase.
 */
export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  variant = 'default',
  id,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const selectedOption = options.find(opt => opt.value === value)

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  // Style variants
  const triggerStyles = {
    default: `
      flex items-center justify-between gap-2
      w-full px-3 py-2
      rounded-lg
      border border-white/[0.08] hover:border-white/[0.15]
      bg-white/[0.03] hover:bg-white/[0.05]
      text-sm text-white text-left
      disabled:opacity-50 disabled:cursor-not-allowed
      transition-all duration-200
    `,
    compact: `
      flex items-center justify-between gap-2
      px-3 py-2
      rounded-lg
      border border-white/[0.08] hover:border-white/[0.15]
      bg-white/[0.03] hover:bg-white/[0.05]
      text-sm text-white text-left
      disabled:opacity-50 disabled:cursor-not-allowed
      transition-all duration-200
    `,
    minimal: `
      flex items-center justify-between gap-1
      appearance-none cursor-pointer
      bg-transparent
      text-sm font-medium text-white
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
  }

  const dropdownStyles = {
    default: `
      absolute left-0 top-full z-[100] mt-1
      w-full min-w-[140px]
      rounded-xl
      border border-white/[0.12]
      bg-[#0c0c0c]
      shadow-2xl shadow-black/60
      overflow-hidden
      animate-in fade-in slide-in-from-top-2 duration-150
    `,
    compact: `
      absolute left-0 top-full z-[100] mt-1
      min-w-[120px]
      rounded-xl
      border border-white/[0.12]
      bg-[#0c0c0c]
      shadow-2xl shadow-black/60
      overflow-hidden
      animate-in fade-in slide-in-from-top-2 duration-150
    `,
    minimal: `
      absolute left-0 top-full z-[100] mt-1
      min-w-[120px]
      rounded-lg
      border border-white/[0.12]
      bg-[#0c0c0c]
      shadow-xl shadow-black/50
      overflow-hidden
      animate-in fade-in slide-in-from-top-2 duration-150
    `,
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        id={id}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          ${triggerStyles[variant]}
          ${isOpen ? 'border-blue-500/40' : ''}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedOption ? 'text-white' : 'text-slate-500'}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className={dropdownStyles[variant]} role="listbox">
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  className={`
                    w-full flex items-center gap-2
                    px-3 py-2
                    text-sm text-left
                    transition-all duration-150
                    ${option.disabled
                      ? 'opacity-50 cursor-not-allowed text-slate-500'
                      : isSelected
                        ? 'bg-blue-500/15 text-white'
                        : 'text-slate-300 hover:bg-white/[0.05]'
                    }
                  `}
                >
                  <span className="w-4 shrink-0">
                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-400" />}
                  </span>
                  <span className="flex-1">{option.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
