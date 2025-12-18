"use client"

import * as LucideIcons from 'lucide-react'
import type { ComponentType } from 'react'

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

interface IconPickerProps {
  iconName: string
  iconColor: string
  searchQuery: string
  onIconChange: (name: string) => void
  onColorChange: (color: string) => void
  onSearchChange: (query: string) => void
  disabled?: boolean
}

export function IconPicker({
  iconName,
  iconColor,
  searchQuery,
  onIconChange,
  onColorChange,
  onSearchChange,
  disabled,
}: IconPickerProps) {
  const SelectedIcon = ICON_OPTIONS.find((opt) => opt.name === iconName)?.Icon
  const searchTerm = searchQuery.trim().toLowerCase()
  const hasSearch = searchTerm.length > 0
  const filteredIcons = hasSearch
    ? ICON_OPTIONS.filter(
        (opt) => opt.name.toLowerCase().includes(searchTerm) || opt.label.toLowerCase().includes(searchTerm)
      )
    : []

  const renderIconOption = (IconComp?: ComponentType<{ className?: string }>) =>
    IconComp ? <IconComp className="h-4 w-4" /> : null

  return (
    <label className="space-y-1.5 text-sm">
      <span className="text-sm font-medium text-slate-300">Icon</span>
      <div className="flex items-center gap-2">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08]"
          style={{ backgroundColor: iconColor || '#111827' }}
          aria-label="Icon color preview"
        >
          {SelectedIcon ? <SelectedIcon className="h-5 w-5 text-white" /> : null}
        </span>
        <input
          value={searchQuery}
          onChange={(e) => {
            const next = e.target.value
            onSearchChange(next)
            if (next) onIconChange(next)
          }}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-white placeholder:text-slate-500 transition-all focus:border-blue-500/50 focus:bg-white/[0.05] focus:outline-none disabled:opacity-50"
          placeholder="Search icon e.g., briefcase, heart, home"
          disabled={disabled}
        />
        <input
          type="color"
          value={iconColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.03]"
          title="Icon background color"
          disabled={disabled}
        />
      </div>
      <div className="relative">
        <div className="mt-2 grid max-h-48 grid-cols-3 gap-1.5 overflow-auto rounded-lg border border-white/[0.08] bg-[#0a0a0a]/90 p-2 shadow-lg shadow-black/30">
          {!hasSearch && (
            <div className="col-span-3 py-3 text-center text-xs text-slate-500">Type to search for an icon.</div>
          )}
          {hasSearch &&
            filteredIcons.slice(0, 24).map((opt, idx) => (
              <button
                key={`${opt.name}-${idx}`}
                type="button"
                onClick={() => {
                  onIconChange(opt.name)
                  onSearchChange(opt.name)
                }}
                className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-left text-xs text-slate-300 transition-all hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
                disabled={disabled}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-white/[0.05]">
                  {renderIconOption(opt.Icon)}
                </span>
                <span className="truncate text-[11px]">{opt.label}</span>
              </button>
            ))}
          {hasSearch && filteredIcons.length === 0 && (
            <div className="col-span-3 py-3 text-center text-xs text-slate-500">No icons match that search.</div>
          )}
        </div>
      </div>
    </label>
  )
}
