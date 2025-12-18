"use client"

import { useEffect, useState, useCallback } from 'react'
import type { ScenarioEvent, ScenarioImpact } from '@/types/scenario'
import { useCreateScenarioEventMutation, useUpdateScenarioEventMutation, useDeleteScenarioEventMutation } from '@/hooks/queries/useScenarioEventsQuery'
import { useScenarioEvent } from '@/hooks/useScenarioEvent'
import { Modal } from '@/components/ui/Modal'

import { useScenarioEventForm, useImpactItemSelector, useFinancialItems } from './hooks'
import { ModalHeader, ModalFooter, ScenarioFormFields, ImpactList, getTargetTypeLabel } from './components'
import { validateScenarioEvent, expandImpactsForPayload } from './logic'

interface ScenarioEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: (event: ScenarioEvent) => void
  onDeleted?: () => void
  event?: ScenarioEvent
  anchorYear?: number | null
  anchorMonth?: number | null
}

export function ScenarioEventModal({ isOpen, onClose, onSaved, onDeleted, event, anchorYear, anchorMonth }: ScenarioEventModalProps) {
  const { data: fetchedEvent, isFetching } = useScenarioEvent(event?.id, isOpen && Boolean(event?.id), event)
  const hydratedEvent = fetchedEvent ?? event

  const { form, setForm, updateImpact, addImpact, removeImpact } = useScenarioEventForm({ hydratedEvent, isOpen })
  const financialItems = useFinancialItems()
  const itemSelector = useImpactItemSelector({
    isOpen,
    hydratedImpacts: hydratedEvent?.impacts,
    allFinancialDataLoading: financialItems.allFinancialDataLoading,
    getItemsForType: financialItems.getItemsForType,
    resolveStableTargetId: financialItems.resolveStableTargetId,
  })

  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const createMutation = useCreateScenarioEventMutation()
  const updateMutation = useUpdateScenarioEventMutation()
  const deleteMutation = useDeleteScenarioEventMutation()
  const saving = createMutation.isPending || updateMutation.isPending
  const deleting = deleteMutation.isPending
  const loadingState = saving || deleting || isFetching

  useEffect(() => {
    if (!isOpen) return
    setConfirmDelete(false)
    hydratedEvent ? itemSelector.setNewItemNames({}) : itemSelector.resetSelections()
  }, [hydratedEvent, isOpen])

  const handleImpactChange = useCallback((index: number, update: Partial<ScenarioImpact>) => {
    updateImpact(index, update)
    if ('startMonth' in update || 'targetType' in update) {
      itemSelector.setSelectedItemId(prev => ({ ...prev, [index]: undefined }))
      itemSelector.setItemSearchQuery(prev => ({ ...prev, [index]: '' }))
    }
    if ('targetId' in update && update.targetId) {
      const stable = financialItems.resolveStableTargetId(update.targetType || '', update.targetId) ?? update.targetId
      itemSelector.setSelectedItemId(prev => ({ ...prev, [index]: stable }))
    }
  }, [updateImpact, financialItems.resolveStableTargetId, itemSelector])

  const handleSave = async () => {
    setError(null)
    const normalizedIcon = form.displayIcon.trim() || hydratedEvent?.displayIcon || event?.displayIcon || ''

    const validation = validateScenarioEvent({
      name: form.name, occursOn: form.occursOn, displayIcon: normalizedIcon, impacts: form.impacts,
      selectedItemId: itemSelector.selectedItemId, newItemNames: itemSelector.newItemNames,
      getItemsForType: financialItems.getItemsForType, getTargetTypeLabel,
    })
    if (!validation.valid) return setError(validation.error ?? 'Validation failed.')

    const payload: ScenarioEvent = {
      name: form.name.trim(), description: form.description.trim(), occursOn: form.occursOn,
      displayIcon: normalizedIcon, displayColor: form.iconColor || hydratedEvent?.displayColor,
      tags: [], isIncluded: form.isIncluded,
      impacts: expandImpactsForPayload({
        impacts: form.impacts, occursOn: form.occursOn,
        selectedItemId: itemSelector.selectedItemId, newItemNames: itemSelector.newItemNames,
        resolveStableTargetId: financialItems.resolveStableTargetId,
      }),
    }

    try {
      const existingId = hydratedEvent?.id ?? event?.id
      const saved = existingId
        ? await updateMutation.mutateAsync({ id: existingId, event: { ...hydratedEvent, ...payload } as ScenarioEvent })
        : await createMutation.mutateAsync(payload)
      onSaved?.(saved)
      onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save.') }
  }

  const handleDelete = async () => {
    const id = hydratedEvent?.id ?? event?.id
    if (!id) return
    try { await deleteMutation.mutateAsync(id); onDeleted?.(); onClose() }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to delete.') }
  }

  const fillExample = () => {
    const d = new Date(); d.setFullYear(d.getFullYear() + 3); const m = d.toISOString().slice(0, 7)
    setForm(p => ({ ...p, name: 'Job Loss', description: 'Unexpected layoff.', occursOn: m,
      displayIcon: 'briefcase-business', iconColor: '#ef4444', isIncluded: true, iconSearch: 'briefcase-business',
      impacts: [{ targetType: 'income', impactKind: 'override', amount: 0, currency: 'SGD', cadence: 'monthly', startMonth: m, notes: '' }]
    }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} overlayClassName="bg-black/80 backdrop-blur-sm p-4 sm:p-6">
      <div className={`relative
overflow-hidden
w-full min-w-[56rem] max-w-4xl
rounded-2xl border border-white/[0.1]
bg-[#0a0a0a]/95
text-white
backdrop-blur-xl shadow-xl`}>
        <div className="max-h-[80vh] overflow-y-auto p-6 pr-3 custom-scrollbar">
          {isFetching && <div className={`mb-4 px-3 py-2
rounded-lg border border-white/[0.08]
bg-white/[0.03]
text-xs
animate-pulse`}>Loading...</div>}
          <ModalHeader isEditing={!!event} onExample={fillExample} onClose={onClose} disabled={loadingState} isIncluded={form.isIncluded} onToggleIncluded={(value) => setForm(p => ({ ...p, isIncluded: value }))} />
          <ScenarioFormFields form={form} onFieldChange={(k, v) => setForm(p => ({ ...p, [k]: v }))} disabled={loadingState} anchorYear={anchorYear} anchorMonth={anchorMonth} />
          {form.occursOn ? (
            <ImpactList impacts={form.impacts} onUpdate={handleImpactChange} onAdd={addImpact} onRemove={removeImpact}
              loading={loadingState} itemSelector={itemSelector} financialItems={financialItems} />
          ) : (
            <div className={`mt-6 px-4 py-6
rounded-xl border border-white/[0.06]
bg-white/[0.02]
text-center text-sm text-slate-400`}>
              Select an &quot;Occurs on&quot; month above to define impacts.
            </div>
          )}
          {error && <div className={`mt-4 px-3 py-2.5
rounded-lg border border-rose-500/20
bg-rose-500/5
text-sm text-rose-400`}>{error}</div>}
          <ModalFooter isEditing={!!event} confirmDelete={confirmDelete} onConfirmDelete={setConfirmDelete}
            onDelete={handleDelete} onSave={handleSave} onClose={onClose} saving={saving} deleting={deleting} disabled={loadingState} />
        </div>
      </div>
    </Modal>
  )
}
