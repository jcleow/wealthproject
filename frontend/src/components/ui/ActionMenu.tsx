'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface ActionMenuItemBase {
  label: string
  icon?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export interface ActionMenuItem extends ActionMenuItemBase {
  type?: 'item'
  onClick: () => void
}

export interface ActionMenuSubmenu extends ActionMenuItemBase {
  type: 'submenu'
  children: ActionMenuItem[]
}

export interface ActionMenuDivider {
  type: 'divider'
}

export type ActionMenuEntry = ActionMenuItem | ActionMenuSubmenu | ActionMenuDivider

// ============================================================================
// Constants
// ============================================================================

const MENU_STYLE: React.CSSProperties = {
  background: '#111113',
  border: '1px solid rgba(255, 255, 255, 0.08)',
}

const MENU_ITEM_CLASS =
  'flex w-full items-center gap-2.5 rounded px-3 py-2 text-[13px] transition-colors hover:bg-white/[0.04]'

// ============================================================================
// ActionMenu
// ============================================================================

interface ActionMenuProps {
  items: ActionMenuEntry[]
  /** Width of the main dropdown in px */
  menuWidth?: number
  /** Width of submenu dropdowns in px */
  submenuWidth?: number
  /** Custom trigger element. Defaults to a "..." button. */
  trigger?: React.ReactNode
  /** Additional className for the trigger wrapper */
  triggerClassName?: string
}

export function ActionMenu({
  items,
  menuWidth = 210,
  submenuWidth = 200,
  trigger,
  triggerClassName,
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSubmenuIndex, setActiveSubmenuIndex] = useState<number | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const submenuTriggerRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const submenuRef = useRef<HTMLDivElement>(null)

  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const [submenuPos, setSubmenuPos] = useState({ top: 0, left: 0 })

  // Position the main dropdown below the trigger, right-aligned
  const updateDropdownPos = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const rightAlignedLeft = rect.right - menuWidth
    const clampedLeft = Math.max(8, Math.min(rightAlignedLeft, window.innerWidth - menuWidth - 8))
    setDropdownPos({
      top: rect.bottom + 4,
      left: clampedLeft,
    })
  }, [menuWidth])

  // Position the submenu beside the dropdown, flipping if needed
  const updateSubmenuPos = useCallback(
    (index: number) => {
      if (!dropdownRef.current) return
      const dropdownRect = dropdownRef.current.getBoundingClientRect()
      const submenuTrigger = submenuTriggerRefs.current.get(index)
      if (!submenuTrigger) return
      const triggerRect = submenuTrigger.getBoundingClientRect()
      const rightEdge = dropdownRect.right + 4 + submenuWidth
      const fitsRight = rightEdge <= window.innerWidth
      setSubmenuPos({
        top: triggerRect.top,
        left: fitsRight
          ? dropdownRect.right + 4
          : dropdownRect.left - submenuWidth - 4,
      })
    },
    [submenuWidth]
  )

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      if (submenuRef.current?.contains(target)) return
      setIsOpen(false)
      setActiveSubmenuIndex(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Reposition dropdown when opening
  useEffect(() => {
    if (isOpen) updateDropdownPos()
  }, [isOpen, updateDropdownPos])

  // Reposition submenu when active index changes
  useEffect(() => {
    if (activeSubmenuIndex !== null) updateSubmenuPos(activeSubmenuIndex)
  }, [activeSubmenuIndex, updateSubmenuPos])

  const close = () => {
    setIsOpen(false)
    setActiveSubmenuIndex(null)
  }

  return (
    <div className={cn('relative', triggerClassName)}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setIsOpen(!isOpen)
          setActiveSubmenuIndex(null)
        }}
        className={
          trigger
            ? undefined
            : 'flex h-[30px] w-[30px] items-center justify-center rounded-md hover:bg-white/[0.04] transition-colors border border-white/[0.08]'
        }
      >
        {trigger ?? <MoreHorizontal className="h-3.5 w-3.5 text-slate-200" />}
      </button>

      {/* Main dropdown */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] rounded-lg py-1.5 shadow-xl"
            style={{ ...MENU_STYLE, top: dropdownPos.top, left: dropdownPos.left, width: menuWidth }}
          >
            {items.map((entry, index) => {
              if (entry.type === 'divider') {
                return (
                  <div
                    key={`divider-${index}`}
                    className="my-1 h-px w-full"
                    style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                  />
                )
              }

              if (entry.type === 'submenu') {
                const isActive = activeSubmenuIndex === index
                return (
                  <button
                    key={`submenu-${index}`}
                    ref={(el) => {
                      if (el) submenuTriggerRefs.current.set(index, el)
                      else submenuTriggerRefs.current.delete(index)
                    }}
                    type="button"
                    onMouseEnter={() => setActiveSubmenuIndex(index)}
                    onClick={() => setActiveSubmenuIndex(isActive ? null : index)}
                    className={cn(
                      MENU_ITEM_CLASS,
                      'justify-between',
                      isActive && 'bg-white/[0.04]'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      {entry.icon && (
                        <span className="flex h-3.5 w-3.5 items-center justify-center text-slate-500">
                          {entry.icon}
                        </span>
                      )}
                      <span className={cn('text-slate-200', isActive && 'font-medium')}>
                        {entry.label}
                      </span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                )
              }

              // Regular item
              return (
                <button
                  key={`item-${index}`}
                  type="button"
                  onClick={() => {
                    entry.onClick()
                    close()
                  }}
                  className={cn(MENU_ITEM_CLASS, entry.className)}
                  style={entry.style}
                >
                  {entry.icon && (
                    <span className="flex h-3.5 w-3.5 items-center justify-center text-slate-500">
                      {entry.icon}
                    </span>
                  )}
                  <span className="text-slate-200">{entry.label}</span>
                </button>
              )
            })}
          </div>,
          document.body
        )}

      {/* Submenu */}
      {isOpen &&
        activeSubmenuIndex !== null &&
        (() => {
          const submenuEntry = items[activeSubmenuIndex]
          if (!submenuEntry || submenuEntry.type !== 'submenu') return null
          return createPortal(
            <div
              ref={submenuRef}
              className="fixed z-[10000] rounded-lg py-1.5 shadow-xl"
              style={{ ...MENU_STYLE, top: submenuPos.top, left: submenuPos.left, width: submenuWidth }}
              onMouseLeave={() => setActiveSubmenuIndex(null)}
            >
              {submenuEntry.children.map((child, childIndex) => (
                <button
                  key={`submenu-child-${childIndex}`}
                  type="button"
                  onClick={() => {
                    child.onClick()
                    close()
                  }}
                  className={cn(MENU_ITEM_CLASS, child.className)}
                  style={child.style}
                >
                  {child.icon && (
                    <span className="flex h-3.5 w-3.5 items-center justify-center">
                      {child.icon}
                    </span>
                  )}
                  <span>{child.label}</span>
                </button>
              ))}
            </div>,
            document.body
          )
        })()}
    </div>
  )
}
