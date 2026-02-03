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
  /** Visual theme: 'dark' (default) or 'monet' for light impressionist style */
  variant?: 'dark' | 'monet'
}

// Monet theme colors
const monetTheme = {
  cardBg: 'rgba(255, 255, 255, 0.85)',
  cardBorder: 'rgba(155, 139, 180, 0.2)',
  dropdownBg: 'rgba(255, 255, 255, 0.98)',
  dropdownBorder: 'rgba(155, 139, 180, 0.25)',
  textPrimary: '#3D3D3D',
  textSecondary: '#6B6B6B',
  textMuted: '#9B9B9B',
  sage: '#7FB285',
  hoverBg: 'rgba(127, 178, 133, 0.1)',
  selectedBg: 'rgba(127, 178, 133, 0.15)',
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
  variant = 'dark',
}: CustomDropdownProps<T>) {
  const isMonet = variant === 'monet'
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)
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

  // Handle opening - calculate position synchronously before render
  const handleOpen = () => {
    if (disabled) return
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
    setIsOpen(!isOpen)
  }

  // Clear position when closed
  useEffect(() => {
    if (!isOpen) {
      setDropdownPosition(null)
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
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-all duration-150"
        style={isMonet ? {
          background: isSelected ? monetTheme.selectedBg : 'transparent',
          color: isSelected ? monetTheme.textPrimary : monetTheme.textSecondary,
        } : {
          background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
          color: isSelected ? 'white' : '#cbd5e1',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = isMonet ? monetTheme.hoverBg : 'rgba(255, 255, 255, 0.05)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'transparent'
          } else {
            e.currentTarget.style.background = isMonet ? monetTheme.selectedBg : 'rgba(59, 130, 246, 0.15)'
          }
        }}
      >
        {showIcon && option.icon && (
          <span className={`w-4 shrink-0 ${option.iconColor || ''}`}>
            {option.icon}
          </span>
        )}
        {!showIcon && (
          <span className="w-4 shrink-0">
            {isSelected && CheckIcon && (
              <CheckIcon className="h-3.5 w-3.5" style={{ color: isMonet ? monetTheme.sage : '#60a5fa' }} />
            )}
          </span>
        )}
        <span className="truncate">{option.label}</span>
        {showIcon && isSelected && CheckIcon && (
          <CheckIcon className="h-3.5 w-3.5 ml-auto" style={{ color: isMonet ? monetTheme.sage : '#60a5fa' }} />
        )}
      </button>
    )
  }

  const dropdownMenu = isOpen && dropdownPosition && typeof document !== 'undefined' ? createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 max-h-[300px] overflow-y-auto"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        minWidth: Math.max(dropdownPosition.width, parseInt(minWidth) || 140),
        background: isMonet ? monetTheme.dropdownBg : '#0c0c0c',
        border: `1px solid ${isMonet ? monetTheme.dropdownBorder : 'rgba(255, 255, 255, 0.12)'}`,
        boxShadow: isMonet ? '0 8px 32px rgba(155, 139, 180, 0.2)' : '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        backdropFilter: isMonet ? 'blur(12px)' : undefined,
      }}
    >
      {groups ? (
        groups.map((group) => (
          <div key={group.label}>
            <div
              className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider sticky top-0"
              style={{
                color: isMonet ? monetTheme.textMuted : '#64748b',
                background: isMonet ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.02)',
              }}
            >
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
        onClick={handleOpen}
        disabled={disabled}
        className={`
          flex items-center justify-between gap-2
          ${showIcon ? 'pl-8' : 'pl-3'} pr-8 py-2
          rounded-lg
          text-sm text-left
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
        `}
        style={isMonet ? {
          minWidth,
          background: monetTheme.cardBg,
          border: `1px solid ${isOpen ? monetTheme.sage : monetTheme.cardBorder}`,
          color: monetTheme.textPrimary,
          boxShadow: isOpen ? `0 0 0 2px ${monetTheme.sage}20` : undefined,
        } : {
          minWidth,
          background: 'rgba(255, 255, 255, 0.03)',
          border: `1px solid ${isOpen ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
          color: 'white',
        }}
      >
        {showIcon && icon && (
          <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${iconColor || ''}`}>
            {icon}
          </div>
        )}
        <span className="truncate">{getLabel()}</span>
        {ChevronDownIcon && (
          <ChevronDownIcon
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: isMonet ? monetTheme.textMuted : '#64748b' }}
          />
        )}
      </button>

      {dropdownMenu}
    </div>
  )
}
