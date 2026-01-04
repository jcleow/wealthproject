"use client"

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Update dropdown position when opened
  // Use viewport coordinates directly since we're using position: fixed
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [isOpen])

  // Close on outside click (check both button container and portaled menu)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const clickedInsideButton = ref.current?.contains(target)
      const clickedInsideMenu = menuRef.current?.contains(target)
      if (!clickedInsideButton && !clickedInsideMenu) {
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

  const dropdownMenu = isOpen && typeof document !== 'undefined' ? createPortal(
    <div
      ref={menuRef}
      className="
        fixed z-[9999]
        rounded-xl
        border border-white/[0.12]
        bg-[#0c0c0c]
        shadow-2xl shadow-black/60
        overflow-hidden
        animate-in fade-in slide-in-from-top-2 duration-150
        max-h-[300px] overflow-y-auto
      "
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        minWidth: Math.max(dropdownPosition.width, parseInt(minWidth) || 140),
      }}
    >
      {groups ? (
        groups.map((group) => (
          <div key={group.label}>
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-white/[0.02] sticky top-0">
              {group.label}
            </div>
            {group.options.map(renderOption)}
          </div>
        ))
      ) : (
        options?.map(renderOption)
      )}
    </div>,
    document.body
  ) : null

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        ref={buttonRef}
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

      {dropdownMenu}
    </div>
  )
}
