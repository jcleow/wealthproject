'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Check, User, Calendar } from 'lucide-react'
import { usePersonFilter } from '@/contexts/PersonFilterContext'
import { useCreatePersonMutation } from '@/hooks/queries/usePersonsQuery'
import { getSuggestedColor } from '@/types/person'

interface PersonSelectorProps {
  value: string | null | undefined
  onChange: (personId: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
  error?: boolean
  /** Visual theme: 'dark' (default) or 'monet' for light impressionist style */
  variant?: 'dark' | 'monet'
  /** Whether to show the "Add new person" option */
  showCreate?: boolean
}

/**
 * Dropdown to select a person, with inline creation capability.
 * Only shows included persons.
 */
// Monet theme colors
const monetTheme = {
  cardBg: 'rgba(255, 255, 255, 0.7)',
  cardBorder: 'rgba(155, 139, 180, 0.15)',
  dropdownBg: 'rgba(255, 255, 255, 0.95)',
  dropdownBorder: 'rgba(155, 139, 180, 0.2)',
  textPrimary: '#3D3D3D',
  textSecondary: '#6B6B6B',
  textMuted: '#9B9B9B',
  sage: '#7FB285',
  sageLight: '#B5D4B8',
  hoverBg: 'rgba(127, 178, 133, 0.1)',
  selectedBg: 'rgba(127, 178, 133, 0.15)',
}

export function PersonSelector({
  value,
  onChange,
  placeholder = 'Select person',
  disabled = false,
  className = '',
  required = false,
  error = false,
  variant = 'dark',
  showCreate = true,
}: PersonSelectorProps) {
  const isMonet = variant === 'monet'
  const { includedPersons, persons } = usePersonFilter()
  const createMutation = useCreatePersonMutation()

  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDateOfBirth, setNewDateOfBirth] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsCreating(false)
        setNewName('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when creating
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCreating])

  const selectedPerson = value ? persons.find((p) => p.id === value) : null

  const handleSelect = (personId: string | null) => {
    onChange(personId)
    setIsOpen(false)
  }

  const handleStartCreate = () => {
    setIsCreating(true)
    setNewName('')
  }

  const handleCancelCreate = () => {
    setIsCreating(false)
    setNewName('')
    setNewDateOfBirth('')
  }

  const handleConfirmCreate = async () => {
    if (!newName.trim() || !newDateOfBirth) return
    const suggestedColor = getSuggestedColor(persons)
    const created = await createMutation.mutateAsync({
      name: newName.trim(),
      displayColor: suggestedColor,
      dateOfBirth: newDateOfBirth,
      gender: 'male', // Default for quick create
      residencyStatus: 'citizen', // Default for quick create
    })
    onChange(created.id)
    setIsCreating(false)
    setNewName('')
    setNewDateOfBirth('')
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center justify-between gap-2 w-full
          px-3.5 py-2.5
          rounded-xl border
          text-left text-sm
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={isMonet ? {
          background: monetTheme.cardBg,
          border: `1px solid ${error ? '#E8A898' : isOpen ? monetTheme.sage : monetTheme.cardBorder}`,
          boxShadow: isOpen ? `0 0 0 2px ${monetTheme.sage}20` : 'none',
        } : {
          background: 'rgba(255, 255, 255, 0.03)',
          border: `1px solid ${error ? 'rgba(239, 68, 68, 0.5)' : isOpen ? '#10b981' : 'rgba(255, 255, 255, 0.08)'}`,
          boxShadow: isOpen ? '0 0 0 1px rgba(16, 185, 129, 0.2)' : 'none',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedPerson ? (
            <>
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedPerson.displayColor || '#64748b' }}
              />
              <span
                className="truncate"
                style={{ color: isMonet ? monetTheme.textPrimary : 'white' }}
              >
                {selectedPerson.name}
              </span>
            </>
          ) : (
            <span style={{ color: isMonet ? monetTheme.textMuted : '#6b7280' }}>
              {placeholder}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: isMonet ? monetTheme.textMuted : '#9ca3af' }}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl overflow-hidden"
          style={isMonet ? {
            background: monetTheme.dropdownBg,
            border: `1px solid ${monetTheme.dropdownBorder}`,
            boxShadow: '0 8px 32px rgba(155, 139, 180, 0.15)',
            backdropFilter: 'blur(12px)',
          } : {
            background: '#0c0c0c',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
            {/* Unassigned option - only show if not required */}
            {!required && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-all"
                style={isMonet ? {
                  background: !value ? monetTheme.selectedBg : 'transparent',
                  color: monetTheme.textMuted,
                } : {
                  background: !value ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: !value ? 'white' : '#cbd5e1',
                }}
              >
                <span className="w-4 flex-shrink-0">
                  {!value && <Check className="h-4 w-4" style={isMonet ? { color: monetTheme.sage } : { color: '#34d399' }} />}
                </span>
                <span className="italic">Unassigned</span>
              </button>
            )}

            {/* Person options */}
            {includedPersons.map((person) => {
              const isSelected = person.id === value
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => handleSelect(person.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-all"
                  style={isMonet ? {
                    background: isSelected ? monetTheme.selectedBg : 'transparent',
                    color: isSelected ? monetTheme.textPrimary : monetTheme.textSecondary,
                  } : {
                    background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                    color: isSelected ? 'white' : '#cbd5e1',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && isMonet) {
                      e.currentTarget.style.background = monetTheme.hoverBg
                    } else if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <span className="w-4 flex-shrink-0">
                    {isSelected && <Check className="h-4 w-4" style={isMonet ? { color: monetTheme.sage } : { color: '#34d399' }} />}
                  </span>
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: person.displayColor || '#64748b' }}
                  />
                  <span className="truncate">{person.name}</span>
                </button>
              )
            })}

            {includedPersons.length === 0 && (
              <div
                className="px-3 py-2 text-xs italic"
                style={isMonet ? { color: monetTheme.textMuted } : { color: '#6b7280' }}
              >
                No persons available
              </div>
            )}
          </div>

          {/* Create new person - only show if showCreate is true */}
          {showCreate && (
            <div style={isMonet ? { borderTop: `1px solid ${monetTheme.cardBorder}` } : { borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              {isCreating ? (
                <div className="p-2 space-y-2">
                  {/* Name row */}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 flex-shrink-0" style={isMonet ? { color: monetTheme.textMuted } : { color: '#9ca3af' }} />
                    <input
                      ref={inputRef}
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Person name"
                      className="flex-1 rounded-md px-2 py-1 text-sm focus:outline-none"
                      style={isMonet ? {
                        background: 'rgba(255, 255, 255, 0.5)',
                        border: `1px solid ${monetTheme.cardBorder}`,
                        color: monetTheme.textPrimary,
                      } : {
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          handleCancelCreate()
                        }
                      }}
                    />
                  </div>
                  {/* Date of birth row */}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 flex-shrink-0" style={isMonet ? { color: monetTheme.textMuted } : { color: '#9ca3af' }} />
                    <input
                      type="date"
                      value={newDateOfBirth}
                      onChange={(e) => setNewDateOfBirth(e.target.value)}
                      className="flex-1 rounded-md px-2 py-1 text-sm focus:outline-none"
                      style={isMonet ? {
                        background: 'rgba(255, 255, 255, 0.5)',
                        border: `1px solid ${monetTheme.cardBorder}`,
                        color: monetTheme.textPrimary,
                      } : {
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                      }}
                    />
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-1 pt-1">
                    <button
                      type="button"
                      onClick={handleCancelCreate}
                      className="px-2 py-1 rounded-md text-xs"
                      style={isMonet ? { color: monetTheme.textMuted } : { color: '#9ca3af' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCreate}
                      disabled={!newName.trim() || !newDateOfBirth || createMutation.isPending}
                      className="px-2 py-1 rounded-md text-xs disabled:opacity-50"
                      style={isMonet ? {
                        color: monetTheme.sage,
                        background: monetTheme.selectedBg,
                      } : {
                        color: '#34d399',
                        background: 'rgba(16, 185, 129, 0.1)',
                      }}
                    >
                      {createMutation.isPending ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm transition-colors"
                  style={isMonet ? { color: monetTheme.sage } : { color: '#34d399' }}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add new person</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
