"use client"

import { useState, useRef, useEffect, type ReactNode } from 'react'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ChevronDownIcon = LucideIcons.ChevronDown as LucideIcon | undefined
const CheckIcon = LucideIcons.Check as LucideIcon | undefined

export interface DropdownOption<T extends string = string> {
  value: T
  label: string
  icon?: ReactNode
  iconColor?: string
}

export interface DropdownGroup<T extends string = string> {
  label: string
  options: DropdownOption<T>[]
}

interface CustomDropdownProps<T extends string = string> {
  value: T
  onChange: (value: T) => void
  options?: DropdownOption<T>[]
  groups?: DropdownGroup<T>[]
  disabled?: boolean
  minWidth?: string
  showIcon?: boolean
  icon?: ReactNode
  iconColor?: string
  className?: string
}

export function CustomDropdown<T extends string = string>({
  value,
  onChange,
  options,
  groups,
  disabled,
  minWidth = '140px',
  showIcon = false,
  icon,
  iconColor,
  className = '',
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Find label for current value
  const getLabel = () => {
    if (options) {
      const opt = options.find(o => o.value === value)
      return opt?.label ?? value
    }
    if (groups) {
      for (const group of groups) {
        const opt = group.options.find(o => o.value === value)
        if (opt) return opt.label
      }
    }
    return value
  }

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (val: T) => {
    onChange(val)
    setIsOpen(false)
  }

  const renderOption = (option: DropdownOption<T>) => {
    const isSelected = option.value === value
    return (
      <button
        key={option.value}
        type="button"
        onClick={() => handleSelect(option.value)}
        className={`
          w-full flex items-center gap-2
          px-3 py-2
          text-sm text-left
          transition-all duration-150
          ${isSelected
            ? 'bg-blue-500/15 text-white'
            : 'text-slate-300 hover:bg-white/[0.05]'
          }
        `}
      >
        {showIcon && option.icon && (
          <span className={`w-4 shrink-0 ${option.iconColor || ''}`}>
            {option.icon}
          </span>
        )}
        {!showIcon && (
          <span className="w-4 shrink-0">
            {isSelected && CheckIcon && (
              <CheckIcon className="h-3.5 w-3.5 text-blue-400" />
            )}
          </span>
        )}
        <span className="truncate">{option.label}</span>
        {showIcon && isSelected && CheckIcon && (
          <CheckIcon className="h-3.5 w-3.5 text-blue-400 ml-auto" />
        )}
      </button>
    )
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center justify-between gap-2
          ${showIcon ? 'pl-8' : 'pl-3'} pr-8 py-2
          rounded-lg
          border border-white/[0.08] hover:border-white/[0.15]
          bg-white/[0.03] hover:bg-white/[0.05]
          text-sm text-white text-left
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          ${isOpen ? 'border-blue-500/40' : ''}
        `}
        style={{ minWidth }}
      >
        {showIcon && icon && (
          <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${iconColor || ''}`}>
            {icon}
          </div>
        )}
        <span className="truncate">{getLabel()}</span>
        {ChevronDownIcon && (
          <ChevronDownIcon
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {isOpen && (
        <div className="
          absolute left-0 top-full z-[100] mt-1
          min-w-full
          rounded-xl
          border border-white/[0.12]
          bg-[#0c0c0c]
          shadow-2xl shadow-black/60
          overflow-hidden
          animate-in fade-in slide-in-from-top-2 duration-150
        " style={{ minWidth }}>
          {groups ? (
            groups.map((group) => (
              <div key={group.label}>
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-white/[0.02]">
                  {group.label}
                </div>
                {group.options.map(renderOption)}
              </div>
            ))
          ) : (
            options?.map(renderOption)
          )}
        </div>
      )}
    </div>
  )
}
