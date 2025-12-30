'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Check, X, User } from 'lucide-react'
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
}

/**
 * Dropdown to select a person, with inline creation capability.
 * Only shows included persons.
 */
export function PersonSelector({
  value,
  onChange,
  placeholder = 'Select person',
  disabled = false,
  className = '',
  required = false,
  error = false,
}: PersonSelectorProps) {
  const { includedPersons, persons } = usePersonFilter()
  const createMutation = useCreatePersonMutation()

  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
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
  }

  const handleConfirmCreate = async () => {
    if (!newName.trim()) return
    const suggestedColor = getSuggestedColor(persons)
    const created = await createMutation.mutateAsync({
      name: newName.trim(),
      displayColor: suggestedColor,
    })
    onChange(created.id)
    setIsCreating(false)
    setNewName('')
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
          rounded-lg border border-white/[0.08]
          bg-white/[0.03]
          text-left text-sm
          transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/[0.15] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20'}
          ${isOpen ? 'border-emerald-500 ring-1 ring-emerald-500/20' : ''}
        `}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedPerson ? (
            <>
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedPerson.displayColor || '#64748b' }}
              />
              <span className="text-white truncate">{selectedPerson.name}</span>
            </>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-white/[0.12] bg-[#0c0c0c] shadow-xl shadow-black/50 overflow-hidden">
          <div className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
            {/* Unassigned option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`
                w-full flex items-center gap-2
                px-3 py-2
                text-sm text-left
                transition-all
                ${!value ? 'bg-emerald-500/15 text-white' : 'text-slate-300 hover:bg-white/[0.05]'}
              `}
            >
              <span className="w-4 flex-shrink-0">
                {!value && <Check className="h-4 w-4 text-emerald-400" />}
              </span>
              <span className="text-gray-400 italic">Unassigned</span>
            </button>

            {/* Person options */}
            {includedPersons.map((person) => {
              const isSelected = person.id === value
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => handleSelect(person.id)}
                  className={`
                    w-full flex items-center gap-2
                    px-3 py-2
                    text-sm text-left
                    transition-all
                    ${isSelected ? 'bg-emerald-500/15 text-white' : 'text-slate-300 hover:bg-white/[0.05]'}
                  `}
                >
                  <span className="w-4 flex-shrink-0">
                    {isSelected && <Check className="h-4 w-4 text-emerald-400" />}
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
              <div className="px-3 py-2 text-xs text-gray-500 italic">
                No persons available
              </div>
            )}
          </div>

          {/* Create new person */}
          <div className="border-t border-white/[0.08]">
            {isCreating ? (
              <div className="flex items-center gap-2 p-2">
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Person name"
                  className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-md px-2 py-1 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleConfirmCreate()
                    }
                    if (e.key === 'Escape') {
                      handleCancelCreate()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleConfirmCreate}
                  disabled={!newName.trim() || createMutation.isPending}
                  className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCancelCreate}
                  className="p-1 rounded-md text-gray-400 hover:bg-white/[0.06]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartCreate}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add new person</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
