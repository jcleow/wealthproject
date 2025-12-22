"use client"

import { useEffect, useState, useCallback } from 'react'
import type { ScenarioEvent, ScenarioImpact } from '@/types/scenario'
import { useCreateScenarioEventMutation, useUpdateScenarioEventMutation, useDeleteScenarioEventMutation } from '@/hooks/queries/useScenarioEventsQuery'
import { useScenarioEvent } from '@/hooks/useScenarioEvent'
import { financialApi } from '@/api/financial'
import { Modal } from '@/components/ui/Modal'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { useScenarioEventForm, useImpactItemSelector, useFinancialItems } from './hooks'
import { ModalHeader, ModalFooter, ScenarioFormFields, ImpactList, getTargetTypeLabel } from './components'
import { validateScenarioEvent, expandImpactsForPayload } from './logic'

const CalendarClockIcon = LucideIcons.CalendarClock as LucideIcon | undefined

// Helper to update a financial item's name by finding it in the loaded data and sending the full payload
// TODO: Optimize by using a Map/index for O(1) lookup instead of O(N) find()
function updateFinancialItemName(
  targetType: string,
  itemId: string,
  newName: string,
  financialItems: ReturnType<typeof useFinancialItems>
): Promise<unknown> | null {
  switch (targetType) {
    case 'income': {
      const item = financialItems.incomes.find(i => i.id === itemId)
      if (!item) return null
      return financialApi.updateIncome(itemId, { ...item, name: newName })
    }
    case 'expense': {
      const item = financialItems.expenses.find(i => i.id === itemId)
      if (!item) return null
      return financialApi.updateExpense(itemId, { ...item, name: newName })
    }
    case 'asset': {
      const item = financialItems.assets.find(i => i.id === itemId)
      if (!item) return null
      return financialApi.updateAsset(itemId, { ...item, name: newName })
    }
    case 'liability': {
      const item = financialItems.liabilities.find(i => i.id === itemId)
      if (!item) return null
      return financialApi.updateLiability(itemId, { ...item, name: newName })
    }
    case 'investment': {
      const item = financialItems.investments?.find(i => i.id === itemId)
      if (!item) return null
      return financialApi.updateInvestment(itemId, { ...item, name: newName })
    }
    case 'cash': {
      const item = financialItems.cashAccounts?.find(i => i.id === itemId)
      if (!item) return null
      return financialApi.updateCashAccount(itemId, { ...item, name: newName })
    }
    default:
      return null
  }
}

interface ScenarioEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: (event: ScenarioEvent) => void
  onDeleted?: () => void
  event?: ScenarioEvent
  anchorYear?: number | null
  anchorMonth?: number | null
  onJumpToDate?: (year: number, month: number) => void
}

export function ScenarioEventModal({ isOpen, onClose, onSaved, onDeleted, event, anchorYear, anchorMonth, onJumpToDate }: ScenarioEventModalProps) {
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
    // Only reset selections when creating new (no hydratedEvent)
    // For editing, the useImpactItemSelector hook handles hydrating newItemNames from impact.name
    if (!hydratedEvent) {
      itemSelector.resetSelections()
    }
  }, [hydratedEvent, isOpen])

  const handleImpactChange = useCallback((index: number, update: Partial<ScenarioImpact>) => {
    updateImpact(index, update)
    if ('startMonth' in update || 'targetType' in update) {
      itemSelector.setSelectedItemId(prev => ({ ...prev, [index]: undefined }))
      itemSelector.setItemSearchQuery(prev => ({ ...prev, [index]: '' }))
    }
    if ('parentId' in update && update.parentId) {
      const stable = financialItems.resolveStableTargetId(update.targetType || '', update.parentId) ?? update.parentId
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

      // Update financial item names for start impacts that have been renamed
      const updatePromises: Promise<unknown>[] = []
      form.impacts.forEach((impact, index) => {
        if (impact.impactKind === 'start') {
          const itemId = itemSelector.selectedItemId[index]
          const newName = itemSelector.newItemNames[index]
          const originalImpact = hydratedEvent?.impacts?.[index]
          const originalName = originalImpact?.name

          // Only update if there's an existing item and the name changed
          if (itemId && newName && newName !== originalName) {
            const updatePromise = updateFinancialItemName(impact.targetType, itemId, newName, financialItems)
            if (updatePromise) {
              updatePromises.push(updatePromise)
            }
          }
        }
      })

      // Fire and forget - don't block on these updates
      if (updatePromises.length > 0) {
        Promise.all(updatePromises).catch(console.error)
      }

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} overlayClassName="bg-black/80 backdrop-blur-sm p-4 sm:p-6">
      <div className="
        relative
        overflow-hidden
        w-full min-w-[56rem] max-w-4xl
        rounded-2xl
        border border-white/[0.08]
        bg-[#0a0a0a]/98
        text-white
        backdrop-blur-xl
        shadow-2xl shadow-black/50
      ">
        {/* Subtle gradient accent at top */}
        <div className="
          absolute top-0 left-0 right-0 h-px
          bg-gradient-to-r from-transparent via-blue-500/30 to-transparent
        " />

        {/* Ambient glow effects */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Content container */}
        <div className="relative max-h-[85vh] overflow-y-auto p-8 custom-scrollbar">
          {/* Loading state */}
          {isFetching && (
            <div className="
              mb-6 px-4 py-3
              rounded-xl
              border border-white/[0.06]
              bg-white/[0.02]
              flex items-center gap-3
              animate-pulse
            ">
              <div className="h-4 w-4 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
              <span className="text-sm text-slate-400">Loading scenario...</span>
            </div>
          )}

          <ModalHeader
            isEditing={!!event}
            onClose={onClose}
            disabled={loadingState}
            isIncluded={form.isIncluded}
            onToggleIncluded={(value) => setForm(p => ({ ...p, isIncluded: value }))}
          />

          <ScenarioFormFields
            form={form}
            onFieldChange={(k, v) => setForm(p => ({ ...p, [k]: v }))}
            disabled={loadingState}
            anchorYear={anchorYear}
            anchorMonth={anchorMonth}
            onJumpToDate={onJumpToDate}
          />

          {form.occursOn ? (
            <ImpactList
              impacts={form.impacts}
              onUpdate={handleImpactChange}
              onAdd={addImpact}
              onRemove={removeImpact}
              loading={loadingState}
              itemSelector={itemSelector}
              financialItems={financialItems}
            />
          ) : (
            <div className="
              mt-8
              px-6 py-8
              rounded-2xl
              border border-dashed border-white/[0.08]
              bg-white/[0.01]
              text-center
            ">
              <div className="
                inline-flex items-center justify-center
                h-12 w-12 mb-4
                rounded-2xl
                bg-white/[0.03]
                border border-white/[0.06]
              ">
                {CalendarClockIcon && <CalendarClockIcon className="h-5 w-5 text-slate-500" />}
              </div>
              <p className="text-sm text-slate-400">
                Select an <span className="text-white font-medium">&ldquo;Occurs On&rdquo;</span> date above to define impacts
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="
              mt-6 px-4 py-3
              rounded-xl
              border border-rose-500/20
              bg-rose-500/5
              flex items-start gap-3
            ">
              <div className="h-5 w-5 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-rose-400 text-xs font-bold">!</span>
              </div>
              <p className="text-sm text-rose-400">{error}</p>
            </div>
          )}

          {/* Hint when no impacts */}
          {form.occursOn && form.impacts.length === 0 && (
            <p className="mt-4 text-sm text-amber-400/70 text-center">
              Add at least one impact to save this event.
            </p>
          )}

          <ModalFooter
            isEditing={!!event}
            confirmDelete={confirmDelete}
            onConfirmDelete={setConfirmDelete}
            onDelete={handleDelete}
            onSave={handleSave}
            onClose={onClose}
            saving={saving}
            deleting={deleting}
            disabled={loadingState || form.impacts.length === 0}
          />
        </div>
      </div>
    </Modal>
  )
}
