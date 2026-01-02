"use client"

import * as LucideIcons from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { ComponentType, RefObject } from 'react'

const ChevronDownIcon = LucideIcons.ChevronDown as ComponentType<{ className?: string }>
const SearchIcon = LucideIcons.Search as ComponentType<{ className?: string }>
const PaletteIcon = LucideIcons.Palette as ComponentType<{ className?: string }>
const CheckIcon = LucideIcons.Check as ComponentType<{ className?: string }>

const ICON_OPTIONS = Object.entries(LucideIcons)
  .filter(([key, component]) => {
    if (key === 'default' || key === 'createLucideIcon') return false
    const type = typeof component
    return type === 'function' || type === 'object'
  })
  .map(([key, component]) => {
    const kebab = key
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/_/g, '-')
      .toLowerCase()
    return { name: kebab, label: kebab, Icon: component as ComponentType<{ className?: string }> }
  })

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
  '#f43f5e', '#84cc16', '#10b981', '#0ea5e9', '#8b5cf6',
]

function useClickOutside(ref: RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return
      handler()
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}

interface IconPickerProps {
  iconName: string
  iconColor: string
  searchQuery: string
  onIconChange: (name: string) => void
  onColorChange: (color: string) => void
  onSearchChange: (query: string) => void
  disabled?: boolean
  /** Use compact styling with smaller size */
  compact?: boolean
}

export function IconPicker({
  iconName,
  iconColor,
  searchQuery,
  onIconChange,
  onColorChange,
  onSearchChange,
  disabled,
  compact,
}: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'icon' | 'color'>('icon')
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update popover position based on trigger button location
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPopoverPosition({
        top: rect.bottom + 8, // 8px gap below trigger
        left: rect.left,
      })
    }
  }, [])

  useClickOutside(popoverRef, () => setIsOpen(false))

  // Update position when opening and on scroll/resize
  useEffect(() => {
    if (isOpen) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isOpen, updatePosition])

  const SelectedIcon = ICON_OPTIONS.find((opt) => opt.name === iconName)?.Icon
  const searchTerm = searchQuery.trim().toLowerCase()
  const hasSearch = searchTerm.length > 0
  const filteredIcons = hasSearch
    ? ICON_OPTIONS.filter(
        (opt) => opt.name.toLowerCase().includes(searchTerm) || opt.label.toLowerCase().includes(searchTerm)
      ).slice(0, 24)
    : ICON_OPTIONS.slice(0, 24)

  useEffect(() => {
    if (isOpen && activeTab === 'icon' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, activeTab])

  const handleIconSelect = (name: string) => {
    onIconChange(name)
    onSearchChange(name)
  }

  return (
    <div className="relative">
      {/* Trigger Button - Icon badge that sits inline */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          group relative flex items-center justify-center
          ${compact ? 'h-7 w-7 rounded-lg border' : 'h-[42px] w-[42px] rounded-xl border-2'}
          border-white/[0.08] hover:border-white/[0.2]
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          overflow-hidden
          ${isOpen ? 'border-white/[0.25] ring-2 ring-white/[0.1]' : ''}
        `}
        style={{ backgroundColor: iconColor || '#1f2937' }}
        aria-label="Change icon"
      >
        {/* Subtle inner glow - only for non-compact */}
        {!compact && (
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3), transparent 60%)`
            }}
          />
        )}

        {/* Icon */}
        {SelectedIcon ? (
          <SelectedIcon className={`relative ${compact ? 'h-3.5 w-3.5' : 'h-5 w-5'} text-white drop-shadow-sm`} />
        ) : (
          <div className={`relative ${compact ? 'h-3.5 w-3.5' : 'h-5 w-5'} rounded bg-white/20`} />
        )}

        {/* Hover indicator - only for non-compact */}
        {!compact && (
          <div className={`
            absolute inset-0 flex items-center justify-center
            bg-black/50 backdrop-blur-sm
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            ${disabled ? 'hidden' : ''}
          `}>
            <ChevronDownIcon className="h-4 w-4 text-white" />
          </div>
        )}
      </button>

      {/* Popover - rendered via portal to avoid clipping in scrollable containers */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: popoverPosition.top,
            left: popoverPosition.left,
            zIndex: 9999,
          }}
          className={`
            w-72
            rounded-2xl
            border border-white/[0.12]
            bg-[#0c0c0c]
            shadow-2xl shadow-black/60
            overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-200
          `}
        >
          {/* Tab Header */}
          <div className="flex border-b border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveTab('icon')}
              className={`
                flex-1 flex items-center justify-center gap-2
                px-4 py-3
                text-xs font-medium uppercase tracking-wider
                transition-all duration-200
                ${activeTab === 'icon'
                  ? 'text-white bg-white/[0.05] border-b-2 border-white/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'}
              `}
            >
              <SearchIcon className="h-3.5 w-3.5" />
              Icon
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('color')}
              className={`
                flex-1 flex items-center justify-center gap-2
                px-4 py-3
                text-xs font-medium uppercase tracking-wider
                transition-all duration-200
                ${activeTab === 'color'
                  ? 'text-white bg-white/[0.05] border-b-2 border-white/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'}
              `}
            >
              <PaletteIcon className="h-3.5 w-3.5" />
              Color
            </button>
          </div>

          {/* Icon Tab Content */}
          {activeTab === 'icon' && (
            <div className="p-3">
              {/* Search Input */}
              <div className="relative mb-3">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  ref={inputRef}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className={`
                    w-full pl-9 pr-3 py-2.5
                    rounded-xl
                    border border-white/[0.08] focus:border-white/[0.2]
                    bg-white/[0.03] focus:bg-white/[0.05]
                    text-sm text-white placeholder:text-slate-500
                    outline-none
                    transition-all duration-200
                  `}
                  placeholder="Search icons..."
                />
              </div>

              {/* Icon Grid */}
              <div className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {filteredIcons.map((opt) => {
                  const isSelected = opt.name === iconName
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => handleIconSelect(opt.name)}
                      title={opt.label}
                      className={`
                        relative flex items-center justify-center
                        h-10 w-10
                        rounded-lg
                        border transition-all duration-200
                        ${isSelected
                          ? 'border-white/30 bg-white/[0.1]'
                          : 'border-transparent hover:border-white/[0.1] hover:bg-white/[0.05]'}
                      `}
                    >
                      <opt.Icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 flex items-center justify-center">
                          <CheckIcon className="h-2 w-2 text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {hasSearch && filteredIcons.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500">
                  No icons match &ldquo;{searchTerm}&rdquo;
                </div>
              )}
            </div>
          )}

          {/* Color Tab Content */}
          {activeTab === 'color' && (
            <div className="p-4">
              {/* Preset Colors */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {PRESET_COLORS.map((color) => {
                  const isSelected = color === iconColor
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => onColorChange(color)}
                      className={`
                        relative h-10 w-10
                        rounded-xl
                        border-2 transition-all duration-200
                        hover:scale-110
                        ${isSelected
                          ? 'border-white/50 ring-2 ring-white/20'
                          : 'border-white/[0.08] hover:border-white/[0.2]'}
                      `}
                      style={{ backgroundColor: color }}
                    >
                      {/* Inner shine */}
                      <div
                        className="absolute inset-0 rounded-[10px] opacity-40"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)'
                        }}
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <CheckIcon className="h-4 w-4 text-white drop-shadow-md" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Custom Color Picker */}
              <div className="flex items-center gap-3 pt-3 border-t border-white/[0.08]">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Custom</span>
                <div className="relative flex-1">
                  <input
                    type="color"
                    value={iconColor}
                    onChange={(e) => onColorChange(e.target.value)}
                    className={`
                      h-10 w-full
                      rounded-xl
                      border border-white/[0.08]
                      bg-transparent
                      cursor-pointer
                      [&::-webkit-color-swatch-wrapper]:p-1
                      [&::-webkit-color-swatch]:rounded-lg
                      [&::-webkit-color-swatch]:border-none
                    `}
                  />
                </div>
                <div
                  className="h-8 px-3 flex items-center rounded-lg bg-white/[0.05] text-xs text-slate-300 font-mono"
                >
                  {iconColor.toUpperCase()}
                </div>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
