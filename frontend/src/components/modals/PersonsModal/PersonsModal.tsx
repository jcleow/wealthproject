'use client'

import { useState } from 'react'
import { Users, Plus, Trash2, Pencil, X, Check, Briefcase } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { usePersonFilter } from '@/contexts/PersonFilterContext'
import {
  useCreatePersonMutation,
  useUpdatePersonMutation,
  useDeletePersonMutation,
  useTogglePersonIncludedMutation,
} from '@/hooks/queries/usePersonsQuery'
import { PERSON_COLORS, getSuggestedColor } from '@/types/person'
import type { Person } from '@/types/person'

interface PersonsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PersonsModal({ isOpen, onClose }: PersonsModalProps) {
  const { persons, isLoading } = usePersonFilter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState<string>('')
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('')

  const createMutation = useCreatePersonMutation()
  const updateMutation = useUpdatePersonMutation()
  const deleteMutation = useDeletePersonMutation()
  const toggleMutation = useTogglePersonIncludedMutation()

  const handleStartAdd = () => {
    setIsAdding(true)
    setNewName('')
    setNewColor(getSuggestedColor(persons))
  }

  const handleCancelAdd = () => {
    setIsAdding(false)
    setNewName('')
    setNewColor('')
  }

  const handleConfirmAdd = async () => {
    if (!newName.trim()) return
    await createMutation.mutateAsync({
      name: newName.trim(),
      displayColor: newColor || undefined,
    })
    handleCancelAdd()
  }

  const handleStartEdit = (person: Person) => {
    setEditingId(person.id)
    setEditName(person.name)
    setEditColor(person.displayColor || '')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditColor('')
  }

  const handleConfirmEdit = async () => {
    if (!editingId || !editName.trim()) return
    await updateMutation.mutateAsync({
      id: editingId,
      updates: {
        name: editName.trim(),
        displayColor: editColor || undefined,
      },
    })
    handleCancelEdit()
  }

  const handleDelete = async (person: Person) => {
    const incomeCount = person.incomeCount || 0
    const confirmMsg = incomeCount > 0
      ? `Delete "${person.name}"? ${incomeCount} linked income(s) will be unassigned.`
      : `Delete "${person.name}"?`
    if (confirm(confirmMsg)) {
      await deleteMutation.mutateAsync(person.id)
    }
  }

  const handleToggle = async (person: Person) => {
    await toggleMutation.mutateAsync(person.id)
  }

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    toggleMutation.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={isPending ? undefined : onClose}
      overlayClassName="bg-black/60"
      className="flex flex-col overflow-hidden w-full max-w-md mx-4 rounded-xl border border-white/[0.08] bg-[#0a0a0a] shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-200">Manage Persons</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Description */}
      <div className="px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <p className="text-xs text-slate-500">
          Toggle persons to include/exclude their financial data from calculations.
          Excluded persons won&apos;t appear in dropdowns.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 max-h-[400px]">
        {isLoading ? (
          <div className="text-center py-8 text-slate-400">Loading...</div>
        ) : persons.length === 0 && !isAdding ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm mb-4">No persons created yet</p>
            <button
              type="button"
              onClick={handleStartAdd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Person
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Person List */}
            {persons.map((person) => (
              <div
                key={person.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  person.isIncluded
                    ? 'border-white/[0.08] bg-white/[0.02]'
                    : 'border-white/[0.04] bg-transparent opacity-60'
                }`}
              >
                {editingId === person.id ? (
                  // Edit mode
                  <>
                    <ColorPicker value={editColor} onChange={setEditColor} />
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleConfirmEdit}
                      disabled={updateMutation.isPending || !editName.trim()}
                      className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="p-1.5 rounded-md text-slate-400 hover:bg-white/[0.06] transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  // View mode
                  <>
                    {/* Toggle checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggle(person)}
                      disabled={toggleMutation.isPending}
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        person.isIncluded
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      {person.isIncluded && <Check className="h-3 w-3 text-white" />}
                    </button>

                    {/* Color indicator */}
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: person.displayColor || '#64748b' }}
                    />

                    {/* Name and stats */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{person.name}</div>
                      {(person.incomeCount ?? 0) > 0 && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Briefcase className="h-3 w-3" />
                          {person.incomeCount} income{person.incomeCount === 1 ? '' : 's'}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(person)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(person)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}

            {/* Add new person row */}
            {isAdding && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
                <ColorPicker value={newColor} onChange={setNewColor} />
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Person name"
                  className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-md px-2 py-1 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmAdd()
                    if (e.key === 'Escape') handleCancelAdd()
                  }}
                />
                <button
                  type="button"
                  onClick={handleConfirmAdd}
                  disabled={createMutation.isPending || !newName.trim()}
                  className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCancelAdd}
                  className="p-1.5 rounded-md text-slate-400 hover:bg-white/[0.06] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
        <div className="text-xs text-slate-500">
          {persons.filter((p) => p.isIncluded).length} of {persons.length} included
        </div>
        {persons.length > 0 && !isAdding && (
          <button
            type="button"
            onClick={handleStartAdd}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Person
          </button>
        )}
      </div>
    </Modal>
  )
}

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-6 h-6 rounded-md border-2 border-white/10 hover:border-white/20 transition-colors"
        style={{ backgroundColor: value || '#64748b' }}
      />
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 p-2 rounded-lg bg-[#1a1a1a] border border-white/[0.1] shadow-xl">
          <div className="grid grid-cols-4 gap-1">
            {PERSON_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  onChange(color)
                  setIsOpen(false)
                }}
                className={`w-6 h-6 rounded-md transition-transform hover:scale-110 ${
                  value === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
