'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import type { Person } from '@/types/person'

// ============================================================================
// PERSON HELPERS
// ============================================================================

function getPersonAge(dateOfBirth: string): number {
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function getRelationshipLabel(relationship: string): string {
  if (relationship === 'self') return 'You'
  return relationship.charAt(0).toUpperCase() + relationship.slice(1)
}

// ============================================================================
// PERSON VIEW DROPDOWN
// Supports both single-select and multi-select modes.
// Matches Pencil dark design: avatar circles, initials, age/relationship.
// ============================================================================

interface PersonViewDropdownMultiProps {
  mode?: 'multi'
  persons: Person[]
  selectedIds: Set<string> | null
  onToggle: (personId: string) => void
  onSelectAll?: () => void
  value?: never
  onChange?: never
}

interface PersonViewDropdownSingleProps {
  mode: 'single'
  persons: Person[]
  value: string | null | undefined
  onChange: (personId: string) => void
  selectedIds?: never
  onToggle?: never
}

type PersonViewDropdownProps = PersonViewDropdownMultiProps | PersonViewDropdownSingleProps

export function PersonViewDropdown(props: PersonViewDropdownProps) {
  const { persons } = props
  const isSingle = props.mode === 'single'
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Extract mode-specific values upfront to avoid TS narrowing issues
  const singleValue = isSingle ? props.value : null
  const multiSelectedIds = isSingle ? null : (props.selectedIds as Set<string> | null)
  const singleOnChange = isSingle ? props.onChange : null
  const multiOnToggle = isSingle ? null : (props.onToggle as (id: string) => void)
  const multiOnSelectAll = isSingle ? null : (props.onSelectAll as (() => void) | undefined)

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Reset focused index when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1)
    }
  }, [isOpen])

  // Scroll focused item into view
  useEffect(() => {
    if (!isOpen || focusedIndex < 0 || !listRef.current) return
    const buttons = listRef.current.querySelectorAll<HTMLButtonElement>('[role="option"]')
    buttons[focusedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [isOpen, focusedIndex])

  // Handle person row click
  const handlePersonClick = (personId: string) => {
    if (isSingle) {
      singleOnChange!(personId)
      setIsOpen(false)
    } else {
      multiOnToggle!(personId)
    }
  }

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        setIsOpen(false)
        break
      case 'ArrowDown':
        event.preventDefault()
        setFocusedIndex((prev) => prev < 0 ? 0 : (prev + 1) % persons.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setFocusedIndex((prev) => prev < 0 ? persons.length - 1 : (prev - 1 + persons.length) % persons.length)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < persons.length) {
          const targetPersonId = persons[focusedIndex].id
          if (isSingle) {
            singleOnChange!(targetPersonId)
            setIsOpen(false)
          } else {
            multiOnToggle!(targetPersonId)
          }
        }
        break
    }
  }, [isOpen, focusedIndex, persons, isSingle, singleOnChange, multiOnToggle])

  // Build trigger label
  let triggerLabel: string
  if (isSingle) {
    const selectedPerson = persons.find((p) => p.id === singleValue)
    triggerLabel = selectedPerson?.name ?? 'Select person'
  } else {
    const selectedCount = multiSelectedIds === null ? persons.length : multiSelectedIds.size
    triggerLabel = `${selectedCount} person${selectedCount !== 1 ? 's' : ''}`
  }

  // Determine if a person row is selected
  const isPersonSelected = (personId: string): boolean => {
    if (isSingle) return singleValue === personId
    // null = all selected (no filter); empty Set = none selected
    return multiSelectedIds === null || multiSelectedIds.has(personId)
  }

  // Single-select: show avatar dot + name. Multi-select: show "Viewing for N persons"
  const triggerContent = isSingle ? (
    <>
      {(() => {
        const selectedPerson = persons.find((p) => p.id === singleValue)
        const avatarColor = selectedPerson?.displayColor || '#64748b'
        return (
          <div
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: avatarColor }}
          />
        )
      })()}
      <span className="font-medium text-slate-200">{triggerLabel}</span>
    </>
  ) : (
    <>
      <span className="text-slate-500">Viewing for</span>
      <span className="font-medium text-slate-200">{triggerLabel}</span>
    </>
  )

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-2 rounded-sm px-3 py-1.5 text-xs transition-all duration-200"
        style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
      >
        {triggerContent}
        <ChevronDown
          className="h-3.5 w-3.5 text-slate-500 transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          aria-multiselectable={!isSingle}
          onKeyDown={handleKeyDown}
          className="absolute right-0 top-full z-30 mt-1 w-[240px] rounded-lg py-2 shadow-xl"
          style={{
            background: '#111113',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Select All row (multi-select only) */}
          {!isSingle && multiOnSelectAll && persons.length > 1 && (() => {
            const allSelected = multiSelectedIds === null
            return (
              <>
                <button
                  type="button"
                  onClick={multiOnSelectAll}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 transition-colors hover:bg-white/[0.04]"
                >
                  <div
                    className="flex h-4 w-4 shrink-0 items-center justify-center"
                    style={{
                      borderRadius: 3,
                      background: allSelected ? '#F0F0F0' : 'transparent',
                      border: allSelected ? 'none' : '1.5px solid #52525B',
                    }}
                  >
                    {allSelected && <Check className="h-2.5 w-2.5 text-[#111113]" />}
                  </div>
                  <span className="text-xs font-medium text-slate-400">
                    Select All
                  </span>
                </button>
                <div className="mx-3 my-1 h-px" style={{ background: 'rgba(255, 255, 255, 0.06)' }} />
              </>
            )
          })()}

          {persons.map((person, index) => {
            const isSelected = isPersonSelected(person.id)
            const isFocused = index === focusedIndex
            const age = getPersonAge(person.dateOfBirth)
            const relationshipLabel = getRelationshipLabel(person.relationship ?? 'self')
            const avatarColor = person.displayColor || '#64748b'

            return (
              <button
                key={person.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handlePersonClick(person.id)}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 transition-colors hover:bg-white/[0.04]"
                style={{
                  background: isFocused ? 'rgba(255, 255, 255, 0.06)' : undefined,
                  outline: isFocused ? '1px solid rgba(255, 255, 255, 0.15)' : undefined,
                  outlineOffset: '-1px',
                }}
              >
                {/* Checkbox (multi) / Radio dot (single) */}
                {isSingle ? (
                  <div
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                    style={{
                      border: isSelected ? '5px solid #F0F0F0' : '1.5px solid #52525B',
                      background: isSelected ? '#F0F0F0' : 'transparent',
                    }}
                  />
                ) : (
                  <div
                    className="flex h-4 w-4 shrink-0 items-center justify-center"
                    style={{
                      borderRadius: 3,
                      background: isSelected ? '#F0F0F0' : 'transparent',
                      border: isSelected ? 'none' : '1.5px solid #52525B',
                    }}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5 text-[#111113]" />}
                  </div>
                )}

                {/* Avatar circle */}
                <div
                  className="h-7 w-7 shrink-0 rounded-full"
                  style={{ background: avatarColor }}
                />

                {/* Info */}
                <div className="flex flex-col items-start gap-px min-w-0">
                  <span className="text-xs font-medium text-slate-200 truncate w-full text-left">
                    {person.name}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Age {age} · {relationshipLabel}
                  </span>
                </div>
              </button>
            )
          })}

          {persons.length === 0 && (
            <div className="px-3.5 py-3 text-xs text-center text-slate-500">
              No persons added yet
            </div>
          )}
        </div>
      )}
    </div>
  )
}
