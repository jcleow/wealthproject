'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Users, Plus, Trash2, Pencil, X, Check, Briefcase, Save, Calendar, Flag } from 'lucide-react'
import { clsx } from 'clsx'
import { Modal } from '@/components/ui/Modal'
import { useColorScheme } from '@/stores'
import { usePersonFilter } from '@/contexts/PersonFilterContext'
import {
  useCreatePersonMutation,
  useUpdatePersonMutation,
  useDeletePersonMutation,
  useBulkUpdatePersonsMutation,
} from '@/hooks/queries/usePersonsQuery'
import { PERSON_COLORS, getSuggestedColor } from '@/types/person'
import type { Person, Gender } from '@/types/person'
import type { ResidencyStatus } from '@/types/cpf'
import { residencyStatusOptions } from '@/lib/validations/cpfAccount'

const genderOptions: Array<{ value: Gender; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

interface PersonsModalProps {
  isOpen: boolean
  onClose: () => void
}

// Track pending changes for batch save
interface PersonEditData {
  name: string
  displayColor: string | null
  dateOfBirth: string
  gender: Gender
  residencyStatus: ResidencyStatus
  prGrantDate: string | null
}

interface PendingChanges {
  toggles: Map<string, boolean> // personId -> new isIncluded value
  edits: Map<string, PersonEditData> // personId -> updated fields
}

export function PersonsModal({ isOpen, onClose }: PersonsModalProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const { persons, isLoading } = usePersonFilter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState<string>('')
  const [editDateOfBirth, setEditDateOfBirth] = useState('')
  const [editGender, setEditGender] = useState<Gender>('male')
  const [editResidencyStatus, setEditResidencyStatus] = useState<ResidencyStatus>('citizen')
  const [editPrGrantDate, setEditPrGrantDate] = useState<string>('')
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('')
  const [newDateOfBirth, setNewDateOfBirth] = useState('')
  const [newGender, setNewGender] = useState<Gender>('male')
  const [newResidencyStatus, setNewResidencyStatus] = useState<ResidencyStatus>('citizen')
  const [newPrGrantDate, setNewPrGrantDate] = useState<string>('')

  // Pending changes for batch save
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({
    toggles: new Map(),
    edits: new Map(),
  })

  const createMutation = useCreatePersonMutation()
  const updateMutation = useUpdatePersonMutation()
  const deleteMutation = useDeletePersonMutation()
  const bulkUpdateMutation = useBulkUpdatePersonsMutation()

  // Reset pending changes when modal opens/closes or persons change
  useEffect(() => {
    if (!isOpen) {
      setPendingChanges({ toggles: new Map(), edits: new Map() })
    }
  }, [isOpen])

  // Calculate if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return pendingChanges.toggles.size > 0 || pendingChanges.edits.size > 0
  }, [pendingChanges])

  // Get effective isIncluded state (considering pending changes)
  const getEffectiveIncluded = useCallback((person: Person): boolean => {
    if (pendingChanges.toggles.has(person.id)) {
      return pendingChanges.toggles.get(person.id)!
    }
    return person.isIncluded
  }, [pendingChanges.toggles])

  // Get effective person data (considering pending edits)
  const getEffectivePerson = useCallback((person: Person): Person => {
    const pendingEdit = pendingChanges.edits.get(person.id)
    if (pendingEdit) {
      return {
        ...person,
        name: pendingEdit.name,
        displayColor: pendingEdit.displayColor,
        dateOfBirth: pendingEdit.dateOfBirth,
        gender: pendingEdit.gender,
        residencyStatus: pendingEdit.residencyStatus,
        prGrantDate: pendingEdit.prGrantDate,
      }
    }
    return person
  }, [pendingChanges.edits])

  const handleStartAdd = () => {
    setIsAdding(true)
    setNewName('')
    setNewColor(getSuggestedColor(persons))
    setNewDateOfBirth('')
    setNewGender('male')
    setNewResidencyStatus('citizen')
    setNewPrGrantDate('')
  }

  const handleCancelAdd = () => {
    setIsAdding(false)
    setNewName('')
    setNewColor('')
    setNewDateOfBirth('')
    setNewGender('male')
    setNewResidencyStatus('citizen')
    setNewPrGrantDate('')
  }

  // Create is immediate (not batched)
  const handleConfirmAdd = async () => {
    if (!newName.trim() || !newDateOfBirth) return
    await createMutation.mutateAsync({
      name: newName.trim(),
      displayColor: newColor || undefined,
      dateOfBirth: newDateOfBirth,
      gender: newGender,
      residencyStatus: newResidencyStatus,
      prGrantDate: newPrGrantDate || undefined,
    })
    handleCancelAdd()
  }

  // Helper to format date for input[type="date"]
  const formatDateForInput = (isoDate: string | undefined | null): string => {
    if (!isoDate) return ''
    const date = new Date(isoDate)
    if (Number.isNaN(date.getTime())) return ''
    return date.toISOString().split('T')[0]
  }

  const handleStartEdit = (person: Person) => {
    const effective = getEffectivePerson(person)
    setEditingId(person.id)
    setEditName(effective.name)
    setEditColor(effective.displayColor || '')
    setEditDateOfBirth(formatDateForInput(effective.dateOfBirth))
    setEditGender(effective.gender)
    setEditResidencyStatus(effective.residencyStatus)
    setEditPrGrantDate(formatDateForInput(effective.prGrantDate))
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditColor('')
    setEditDateOfBirth('')
    setEditGender('male')
    setEditResidencyStatus('citizen')
    setEditPrGrantDate('')
  }

  // Queue edit for batch save
  const handleConfirmEdit = () => {
    if (!editingId || !editName.trim() || !editDateOfBirth) return

    setPendingChanges(prev => {
      const newEdits = new Map(prev.edits)
      newEdits.set(editingId, {
        name: editName.trim(),
        displayColor: editColor || null,
        dateOfBirth: editDateOfBirth,
        gender: editGender,
        residencyStatus: editResidencyStatus,
        prGrantDate: editPrGrantDate || null,
      })
      return { ...prev, edits: newEdits }
    })
    handleCancelEdit()
  }

  // Delete is immediate (not batched)
  const handleDelete = async (person: Person) => {
    const incomeCount = person.incomeCount || 0
    const confirmMsg = incomeCount > 0
      ? `Delete "${person.name}"? ${incomeCount} linked income(s) will be unassigned.`
      : `Delete "${person.name}"?`
    if (confirm(confirmMsg)) {
      // Remove from pending changes if exists
      setPendingChanges(prev => {
        const newToggles = new Map(prev.toggles)
        const newEdits = new Map(prev.edits)
        newToggles.delete(person.id)
        newEdits.delete(person.id)
        return { toggles: newToggles, edits: newEdits }
      })
      await deleteMutation.mutateAsync(person.id)
    }
  }

  // Queue toggle for batch save
  const handleToggle = (person: Person) => {
    setPendingChanges(prev => {
      const newToggles = new Map(prev.toggles)
      const currentEffective = getEffectiveIncluded(person)
      const newValue = !currentEffective

      // If new value equals original, remove from pending
      if (newValue === person.isIncluded) {
        newToggles.delete(person.id)
      } else {
        newToggles.set(person.id, newValue)
      }

      return { ...prev, toggles: newToggles }
    })
  }

  // Save all pending changes
  const handleSave = async () => {
    const updates: Array<{
      id: string
      isIncluded?: boolean
      name?: string
      displayColor?: string
      dateOfBirth?: string
      gender?: Gender
      residencyStatus?: ResidencyStatus
      prGrantDate?: string | null
    }> = []

    // Collect toggle updates
    pendingChanges.toggles.forEach((isIncluded, id) => {
      const existing = updates.find(u => u.id === id)
      if (existing) {
        existing.isIncluded = isIncluded
      } else {
        updates.push({ id, isIncluded })
      }
    })

    // Collect edit updates
    pendingChanges.edits.forEach((edit, id) => {
      const existing = updates.find(u => u.id === id)
      if (existing) {
        existing.name = edit.name
        existing.displayColor = edit.displayColor || undefined
        existing.dateOfBirth = edit.dateOfBirth
        existing.gender = edit.gender
        existing.residencyStatus = edit.residencyStatus
        existing.prGrantDate = edit.prGrantDate
      } else {
        updates.push({
          id,
          name: edit.name,
          displayColor: edit.displayColor || undefined,
          dateOfBirth: edit.dateOfBirth,
          gender: edit.gender,
          residencyStatus: edit.residencyStatus,
          prGrantDate: edit.prGrantDate,
        })
      }
    })

    if (updates.length > 0) {
      await bulkUpdateMutation.mutateAsync(updates)
      setPendingChanges({ toggles: new Map(), edits: new Map() })
    }
  }

  // Discard all pending changes
  const handleDiscard = () => {
    setPendingChanges({ toggles: new Map(), edits: new Map() })
  }

  // Close with confirmation if unsaved changes
  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Discard them?')) {
        setPendingChanges({ toggles: new Map(), edits: new Map() })
        onClose()
      }
    } else {
      onClose()
    }
  }

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    bulkUpdateMutation.isPending

  // Calculate included count with pending changes
  const includedCount = useMemo(() => {
    return persons.filter(p => getEffectiveIncluded(p)).length
  }, [persons, getEffectiveIncluded])

  return (
    <Modal
      isOpen={isOpen}
      onClose={isPending ? undefined : handleClose}
      overlayClassName={isMonet ? 'bg-black/30 backdrop-blur-sm' : 'bg-black/60'}
      className={clsx(
        'flex flex-col overflow-hidden w-full max-w-md mx-4 rounded-xl border shadow-2xl',
        isMonet
          ? 'border-[var(--monet-lavender)]/20 bg-white/95 backdrop-blur-xl'
          : 'border-white/[0.08] bg-[#0a0a0a]'
      )}
    >
      {/* Header */}
      <div className={clsx(
        'flex items-center justify-between px-5 py-4 border-b',
        isMonet ? 'border-[var(--monet-lavender)]/10' : 'border-white/[0.06]'
      )}>
        <div className="flex items-center gap-2">
          <Users className={clsx('h-5 w-5', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-400')} />
          <h2 className={clsx('text-lg font-semibold', isMonet ? 'text-[var(--monet-text-primary)]' : 'text-slate-200')}>Manage Persons</h2>
          {hasUnsavedChanges && (
            <span className={clsx(
              'px-1.5 py-0.5 rounded text-[10px] font-medium',
              isMonet ? 'bg-amber-500/15 text-amber-600' : 'bg-amber-500/20 text-amber-400'
            )}>
              Unsaved
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleClose}
          disabled={isPending}
          className={clsx(
            'p-1.5 rounded-md transition-colors disabled:opacity-50',
            isMonet
              ? 'text-[var(--monet-text-muted)] hover:text-[var(--monet-text-primary)] hover:bg-[var(--monet-lavender)]/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Description */}
      <div className={clsx(
        'px-5 py-3 border-b',
        isMonet ? 'border-[var(--monet-lavender)]/10 bg-[var(--monet-lavender)]/5' : 'border-white/[0.06] bg-white/[0.02]'
      )}>
        <p className={clsx('text-xs', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>
          Toggle persons to include/exclude their financial data from calculations.
          Excluded persons won&apos;t appear in dropdowns.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 max-h-[400px]">
        {isLoading ? (
          <div className={clsx('text-center py-8', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-400')}>Loading...</div>
        ) : persons.length === 0 && !isAdding ? (
          <div className="text-center py-8">
            <Users className={clsx('h-12 w-12 mx-auto mb-3', isMonet ? 'text-[var(--monet-lavender)]/30' : 'text-slate-700')} />
            <p className={clsx('text-sm mb-4', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>No persons created yet</p>
            <button
              type="button"
              onClick={handleStartAdd}
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white transition-colors',
                isMonet ? 'bg-[var(--monet-purple)] hover:bg-[var(--monet-purple)]/90' : 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Person
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Person List */}
            {persons.map((person) => {
              const effectiveIncluded = getEffectiveIncluded(person)
              const effectivePerson = getEffectivePerson(person)
              const hasPendingChanges = pendingChanges.toggles.has(person.id) || pendingChanges.edits.has(person.id)

              return (
                <div
                  key={person.id}
                  className={clsx(
                    'flex items-center gap-3 p-3 rounded-lg border transition-all',
                    effectiveIncluded
                      ? (isMonet ? 'border-[var(--monet-lavender)]/15 bg-[var(--monet-lavender)]/5' : 'border-white/[0.08] bg-white/[0.02]')
                      : (isMonet ? 'border-[var(--monet-lavender)]/10 bg-transparent opacity-60' : 'border-white/[0.04] bg-transparent opacity-60'),
                    hasPendingChanges && (isMonet ? 'ring-1 ring-amber-500/40' : 'ring-1 ring-amber-500/30')
                  )}
                >
                  {editingId === person.id ? (
                    // Edit mode - expanded form
                    <div className="flex-1 space-y-3">
                      {/* Row 1: Color and Name */}
                      <div className="flex items-center gap-3">
                        <ColorPicker value={editColor} onChange={setEditColor} isMonet={isMonet} />
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Name"
                          className={clsx(
                            'flex-1 rounded-md px-2.5 py-1.5 text-sm focus:outline-none',
                            isMonet
                              ? 'bg-white border border-[var(--monet-lavender)]/20 text-[var(--monet-text-primary)] focus:border-[var(--monet-purple)]'
                              : 'bg-white/[0.05] border border-white/[0.1] text-white focus:border-blue-500'
                          )}
                          autoFocus
                        />
                      </div>

                      {/* Row 2: Date of Birth, Gender, Residency Status */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className={clsx('block text-xs mb-1', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>Date of Birth</label>
                          <div className="relative">
                            <Calendar className={clsx('absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')} />
                            <input
                              type="date"
                              value={editDateOfBirth}
                              onChange={(e) => setEditDateOfBirth(e.target.value)}
                              className={clsx(
                                'w-full rounded-md pl-8 pr-2.5 py-1.5 text-sm focus:outline-none',
                                isMonet
                                  ? 'bg-white border border-[var(--monet-lavender)]/20 text-[var(--monet-text-primary)] focus:border-[var(--monet-purple)]'
                                  : 'bg-white/[0.05] border border-white/[0.1] text-white focus:border-blue-500'
                              )}
                            />
                          </div>
                        </div>
                        <div>
                          <label className={clsx('block text-xs mb-1', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>Gender</label>
                          <select
                            value={editGender}
                            onChange={(e) => setEditGender(e.target.value as Gender)}
                            className={clsx(
                              'w-full rounded-md px-2.5 py-1.5 text-sm focus:outline-none appearance-none cursor-pointer',
                              isMonet
                                ? 'bg-white border border-[var(--monet-lavender)]/20 text-[var(--monet-text-primary)] focus:border-[var(--monet-purple)]'
                                : 'bg-white/[0.05] border border-white/[0.1] text-white focus:border-blue-500'
                            )}
                          >
                            {genderOptions.map(option => (
                              <option key={option.value} value={option.value} className={isMonet ? 'bg-white' : 'bg-[#1a1a1a]'}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={clsx('block text-xs mb-1', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>Residency</label>
                          <div className="relative">
                            <Flag className={clsx('absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')} />
                            <select
                              value={editResidencyStatus}
                              onChange={(e) => setEditResidencyStatus(e.target.value as ResidencyStatus)}
                              className={clsx(
                                'w-full rounded-md pl-8 pr-2.5 py-1.5 text-sm focus:outline-none appearance-none cursor-pointer',
                                isMonet
                                  ? 'bg-white border border-[var(--monet-lavender)]/20 text-[var(--monet-text-primary)] focus:border-[var(--monet-purple)]'
                                  : 'bg-white/[0.05] border border-white/[0.1] text-white focus:border-blue-500'
                              )}
                            >
                              {residencyStatusOptions.map(option => (
                                <option key={option.value} value={option.value} className={isMonet ? 'bg-white' : 'bg-[#1a1a1a]'}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Row 3: PR Grant Date (conditional) */}
                      {editResidencyStatus !== 'citizen' && (
                        <div>
                          <label className={clsx('block text-xs mb-1', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>PR Grant Date</label>
                          <div className="relative">
                            <Calendar className={clsx('absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')} />
                            <input
                              type="date"
                              value={editPrGrantDate}
                              onChange={(e) => setEditPrGrantDate(e.target.value)}
                              className={clsx(
                                'w-full rounded-md pl-8 pr-2.5 py-1.5 text-sm focus:outline-none',
                                isMonet
                                  ? 'bg-white border border-[var(--monet-lavender)]/20 text-[var(--monet-text-primary)] focus:border-[var(--monet-purple)]'
                                  : 'bg-white/[0.05] border border-white/[0.1] text-white focus:border-blue-500'
                              )}
                            />
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className={clsx(
                            'px-3 py-1.5 rounded-md text-sm transition-colors',
                            isMonet
                              ? 'text-[var(--monet-text-muted)] hover:text-[var(--monet-text-primary)] hover:bg-[var(--monet-lavender)]/10'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
                          )}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmEdit}
                          disabled={!editName.trim() || !editDateOfBirth}
                          className={clsx(
                            'px-3 py-1.5 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                            isMonet
                              ? 'text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20'
                              : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                          )}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      {/* Toggle checkbox */}
                      <button
                        type="button"
                        onClick={() => handleToggle(person)}
                        className={clsx(
                          'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                          effectiveIncluded
                            ? (isMonet ? 'bg-[var(--monet-purple)] border-[var(--monet-purple)]' : 'bg-blue-600 border-blue-600')
                            : (isMonet ? 'border-[var(--monet-lavender)]/40 hover:border-[var(--monet-lavender)]/60' : 'border-slate-600 hover:border-slate-500')
                        )}
                      >
                        {effectiveIncluded && <Check className="h-3 w-3 text-white" />}
                      </button>

                      {/* Color indicator */}
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: effectivePerson.displayColor || '#64748b' }}
                      />

                      {/* Name and stats */}
                      <div className="flex-1 min-w-0">
                        <div className={clsx('text-sm font-medium truncate', isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white')}>{effectivePerson.name}</div>
                        {(person.incomeCount ?? 0) > 0 && (
                          <div className={clsx('flex items-center gap-1 text-xs', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>
                            <Briefcase className="h-3 w-3" />
                            {person.incomeCount} income{person.incomeCount === 1 ? '' : 's'}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(person)}
                        className={clsx(
                          'p-1.5 rounded-md transition-colors',
                          isMonet
                            ? 'text-[var(--monet-text-muted)] hover:text-[var(--monet-text-primary)] hover:bg-[var(--monet-lavender)]/10'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
                        )}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(person)}
                        disabled={deleteMutation.isPending}
                        className={clsx(
                          'p-1.5 rounded-md transition-colors disabled:opacity-50',
                          isMonet
                            ? 'text-[var(--monet-text-muted)] hover:text-red-600 hover:bg-red-500/10'
                            : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              )
            })}

            {/* Add new person form */}
            {isAdding && (
              <div className={clsx(
                'p-3 rounded-lg border space-y-3',
                isMonet ? 'border-[var(--monet-purple)]/30 bg-[var(--monet-purple)]/5' : 'border-blue-500/30 bg-blue-500/5'
              )}>
                {/* Row 1: Color and Name */}
                <div className="flex items-center gap-3">
                  <ColorPicker value={newColor} onChange={setNewColor} isMonet={isMonet} />
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Person name"
                    className={clsx(
                      'flex-1 rounded-md px-2.5 py-1.5 text-sm focus:outline-none',
                      isMonet
                        ? 'bg-white border border-[var(--monet-lavender)]/20 text-[var(--monet-text-primary)] placeholder:text-[var(--monet-text-muted)] focus:border-[var(--monet-purple)]'
                        : 'bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-slate-500 focus:border-blue-500'
                    )}
                    autoFocus
                  />
                </div>

                {/* Row 2: Date of Birth, Gender, Residency Status */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={clsx('block text-xs mb-1', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>Date of Birth *</label>
                    <div className="relative">
                      <Calendar className={clsx('absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')} />
                      <input
                        type="date"
                        value={newDateOfBirth}
                        onChange={(e) => setNewDateOfBirth(e.target.value)}
                        className={clsx(
                          'w-full rounded-md pl-8 pr-2.5 py-1.5 text-sm focus:outline-none',
                          isMonet
                            ? 'bg-white border border-[var(--monet-lavender)]/20 text-[var(--monet-text-primary)] focus:border-[var(--monet-purple)]'
                            : 'bg-white/[0.05] border border-white/[0.1] text-white focus:border-blue-500'
                        )}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={clsx('block text-xs mb-1', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>Gender *</label>
                    <select
                      value={newGender}
                      onChange={(e) => setNewGender(e.target.value as Gender)}
                      className={clsx(
                        'w-full rounded-md px-2.5 py-1.5 text-sm focus:outline-none appearance-none cursor-pointer',
                        isMonet
                          ? 'bg-white border border-[var(--monet-lavender)]/20 text-[var(--monet-text-primary)] focus:border-[var(--monet-purple)]'
                          : 'bg-white/[0.05] border border-white/[0.1] text-white focus:border-blue-500'
                      )}
                    >
                      {genderOptions.map(option => (
                        <option key={option.value} value={option.value} className={isMonet ? 'bg-white' : 'bg-[#1a1a1a]'}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={clsx('block text-xs mb-1', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>Residency</label>
                    <div className="relative">
                      <Flag className={clsx('absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')} />
                      <select
                        value={newResidencyStatus}
                        onChange={(e) => setNewResidencyStatus(e.target.value as ResidencyStatus)}
                        className={clsx(
                          'w-full rounded-md pl-8 pr-2.5 py-1.5 text-sm focus:outline-none appearance-none cursor-pointer',
                          isMonet
                            ? 'bg-white border border-[var(--monet-lavender)]/20 text-[var(--monet-text-primary)] focus:border-[var(--monet-purple)]'
                            : 'bg-white/[0.05] border border-white/[0.1] text-white focus:border-blue-500'
                        )}
                      >
                        {residencyStatusOptions.map(option => (
                          <option key={option.value} value={option.value} className={isMonet ? 'bg-white' : 'bg-[#1a1a1a]'}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Row 3: PR Grant Date (conditional) */}
                {newResidencyStatus !== 'citizen' && (
                  <div>
                    <label className={clsx('block text-xs mb-1', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>PR Grant Date</label>
                    <div className="relative">
                      <Calendar className={clsx('absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')} />
                      <input
                        type="date"
                        value={newPrGrantDate}
                        onChange={(e) => setNewPrGrantDate(e.target.value)}
                        className={clsx(
                          'w-full rounded-md pl-8 pr-2.5 py-1.5 text-sm focus:outline-none',
                          isMonet
                            ? 'bg-white border border-[var(--monet-lavender)]/20 text-[var(--monet-text-primary)] focus:border-[var(--monet-purple)]'
                            : 'bg-white/[0.05] border border-white/[0.1] text-white focus:border-blue-500'
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelAdd}
                    className={clsx(
                      'px-3 py-1.5 rounded-md text-sm transition-colors',
                      isMonet
                        ? 'text-[var(--monet-text-muted)] hover:text-[var(--monet-text-primary)] hover:bg-[var(--monet-lavender)]/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAdd}
                    disabled={createMutation.isPending || !newName.trim() || !newDateOfBirth}
                    className={clsx(
                      'px-3 py-1.5 rounded-md text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                      isMonet ? 'bg-[var(--monet-purple)] hover:bg-[var(--monet-purple)]/90' : 'bg-blue-600 hover:bg-blue-700'
                    )}
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Person'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={clsx(
        'flex items-center justify-between px-5 py-3 border-t',
        isMonet ? 'border-[var(--monet-lavender)]/10' : 'border-white/[0.06]'
      )}>
        <div className={clsx('text-xs', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>
          {includedCount} of {persons.length} included
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges ? (
            <>
              <button
                type="button"
                onClick={handleDiscard}
                disabled={isPending}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50',
                  isMonet
                    ? 'text-[var(--monet-text-muted)] hover:text-[var(--monet-text-primary)] hover:bg-[var(--monet-lavender)]/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
                )}
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm text-white transition-colors disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {bulkUpdateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            persons.length > 0 && !isAdding && (
              <button
                type="button"
                onClick={handleStartAdd}
                disabled={isPending}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50',
                  isMonet
                    ? 'text-[var(--monet-text-secondary)] hover:text-[var(--monet-text-primary)] hover:bg-[var(--monet-lavender)]/10'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Person
              </button>
            )
          )}
        </div>
      </div>
    </Modal>
  )
}

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  isMonet?: boolean
}

function ColorPicker({ value, onChange, isMonet = false }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-6 h-6 rounded-md border-2 transition-colors',
          isMonet
            ? 'border-[var(--monet-lavender)]/20 hover:border-[var(--monet-lavender)]/40'
            : 'border-white/10 hover:border-white/20'
        )}
        style={{ backgroundColor: value || '#64748b' }}
      />
      {isOpen && (
        <div className={clsx(
          'absolute left-0 top-full mt-1 z-50 p-2 rounded-lg border shadow-xl',
          isMonet
            ? 'bg-white border-[var(--monet-lavender)]/20'
            : 'bg-[#1a1a1a] border-white/[0.1]'
        )}>
          <div className="grid grid-cols-4 gap-1">
            {PERSON_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  onChange(color)
                  setIsOpen(false)
                }}
                className={clsx(
                  'w-6 h-6 rounded-md transition-transform hover:scale-110',
                  value === color && (isMonet ? 'ring-2 ring-[var(--monet-purple)] ring-offset-2 ring-offset-white' : 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]')
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
