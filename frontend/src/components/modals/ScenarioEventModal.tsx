"use client"

import { useEffect, useRef, useState } from 'react'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import type { ScenarioEvent, ScenarioImpact } from '@/types/scenario'
import { useCreateScenarioEventMutation, useUpdateScenarioEventMutation } from '@/hooks/queries/useScenarioEventsQuery'
import { useScenarioEvent } from '@/hooks/useScenarioEvent'
import { Modal } from '@/components/ui/Modal'

interface ScenarioEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: (event: ScenarioEvent) => void
  event?: ScenarioEvent
}

const defaultImpact: ScenarioImpact = {
  targetType: 'asset',
  impactKind: 'delta',
  amount: 0,
  currency: 'SGD',
  cadence: 'monthly',
  startMonth: '',
  notes: '',
}

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

export function ScenarioEventModal({
  isOpen,
  onClose,
  onSaved,
  event,
}: ScenarioEventModalProps) {
  const { data: fetchedEvent, isFetching } = useScenarioEvent(event?.id, isOpen && Boolean(event?.id), event)
  const hydratedEvent = fetchedEvent ?? event
  const normalizeMonth = (value?: string | null) => (value ? value.slice(0, 7) : '')
  const [form, setForm] = useState<{
    name: string
    occursOn: string
    description: string
    displayIcon: string
    iconColor: string
    isIncluded: boolean
    impacts: ScenarioImpact[]
    iconSearch: string
  }>({
    name: '',
    occursOn: '',
    description: '',
    displayIcon: 'sparkles',
    iconColor: '#0ea5e9',
    isIncluded: true,
    impacts: [{ ...defaultImpact }],
    iconSearch: '',
  })
  const [error, setError] = useState<string | null>(null)
  const prevOccursOn = useRef<string>('')

  const createMutation = useCreateScenarioEventMutation()
  const updateMutation = useUpdateScenarioEventMutation()
  const saving = createMutation.isLoading || updateMutation.isLoading
  const PlusIcon = LucideIcons.Plus as LucideIcon | undefined
  const TrashIcon = LucideIcons.Trash2 as LucideIcon | undefined
  const CloseIcon = LucideIcons.X as LucideIcon | undefined
  const SparklesIcon = LucideIcons.Sparkles as LucideIcon | undefined

  const iconOptions = ICON_OPTIONS
  const SelectedIcon = iconOptions.find((opt) => opt.name === form.displayIcon)?.Icon
  const searchTerm = form.iconSearch.trim().toLowerCase()
  const hasSearch = searchTerm.length > 0
  const filteredIcons = hasSearch
    ? iconOptions.filter(
        (opt) => opt.name.toLowerCase().includes(searchTerm) || opt.label.toLowerCase().includes(searchTerm)
      )
    : []

  // Hydrate form when event changes
  useEffect(() => {
    if (!isOpen) return
    if (hydratedEvent) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[ScenarioEventModal] hydrating form', {
          id: hydratedEvent.id,
          impacts: hydratedEvent.impacts?.length ?? 0,
          occursOn: hydratedEvent.occursOn,
        })
      }
      setForm({
        name: hydratedEvent.name ?? '',
        occursOn: normalizeMonth(hydratedEvent.occursOn),
        description: hydratedEvent.description ?? '',
        displayIcon: hydratedEvent.displayIcon ?? 'sparkles',
        iconColor: hydratedEvent.displayColor ?? '#0ea5e9',
        isIncluded: hydratedEvent.isIncluded ?? true,
        impacts:
          hydratedEvent.impacts && hydratedEvent.impacts.length > 0
            ? hydratedEvent.impacts.map((impact) => ({
                ...impact,
                startMonth: normalizeMonth(impact.startMonth) || normalizeMonth(hydratedEvent.occursOn),
                endMonth: normalizeMonth(impact.endMonth) || undefined,
              }))
            : [{ ...defaultImpact, startMonth: normalizeMonth(hydratedEvent.occursOn) }],
        iconSearch: hydratedEvent.displayIcon ?? '',
      })
      prevOccursOn.current = hydratedEvent.occursOn ?? ''
    } else {
      setForm({
        name: '',
        occursOn: '',
        description: '',
        displayIcon: 'sparkles',
        iconColor: '#0ea5e9',
        isIncluded: true,
        impacts: [{ ...defaultImpact }],
        iconSearch: '',
      })
      prevOccursOn.current = ''
    }
  }, [hydratedEvent, isOpen])

  // Keep impacts aligned to occurs_on unless user overrides
  useEffect(() => {
    if (!form.occursOn) return
    const month = form.occursOn.slice(0, 7)
    setForm((prev) => ({
      ...prev,
      impacts: prev.impacts.map((impact) => {
        if (!impact.startMonth || impact.startMonth === prevOccursOn.current.slice(0, 7)) {
          return { ...impact, startMonth: month }
        }
        return impact
      }),
    }))
    prevOccursOn.current = form.occursOn
  }, [form.occursOn])

  const handleImpactChange = (index: number, update: Partial<ScenarioImpact>) => {
    setForm((prev) => ({
      ...prev,
      impacts: prev.impacts.map((impact, idx) => (idx === index ? { ...impact, ...update } : impact)),
    }))
  }

  const addImpact = () =>
    setForm((prev) => ({
      ...prev,
      impacts: [
        ...prev.impacts,
        { ...defaultImpact, startMonth: prev.occursOn ? prev.occursOn.slice(0, 7) : defaultImpact.startMonth },
      ],
    }))

  const removeImpact = (index: number) =>
    setForm((prev) => ({ ...prev, impacts: prev.impacts.filter((_, idx) => idx !== index) }))

  const handleSave = async () => {
    setError(null)
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    if (!form.occursOn) {
      setError('Occurs on date is required.')
      return
    }
    const payload: ScenarioEvent = {
      name: form.name.trim(),
      description: form.description.trim(),
      occursOn: form.occursOn,
      displayIcon: form.displayIcon.trim() || 'sparkles',
      displayColor: form.iconColor,
      tags: [],
      isIncluded: form.isIncluded,
      impacts: form.impacts.map((impact) => ({
        ...impact,
        amount: Number(impact.amount) || 0,
        currency: 'SGD',
        startMonth: impact.startMonth || form.occursOn.slice(0, 7),
      })),
    }
    try {
      const existingEvent = hydratedEvent ?? event
      const eventId = existingEvent?.id
      const saved = eventId
        ? await updateMutation.mutateAsync({ id: eventId, event: { ...existingEvent, ...payload } as ScenarioEvent })
        : await createMutation.mutateAsync(payload)
      onSaved?.(saved)
      onClose()
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to create scenario.'
      setError(message)
    }
  }

  const loadingState = saving || isFetching

  const renderIconOption = (IconComp?: ComponentType<{ className?: string }>) => (IconComp ? <IconComp className="h-4 w-4" /> : null)

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl border border-white/10 bg-[#0b1222] p-6 text-white shadow-2xl">
        {isFetching && (
          <div className="mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 animate-pulse">
            Loading scenario...
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Scenario</p>
            <h2 className="text-2xl font-semibold">{event ? 'Edit Scenario Event' : 'Create a new scenario'}</h2>
            <p className="text-sm text-gray-400">Define event details and financial impacts.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-100 transition hover:bg-white/10 disabled:opacity-60"
              onClick={() => {
                const exampleOccurs = new Date()
                exampleOccurs.setMonth(exampleOccurs.getMonth() + 2)
                const monthStr = exampleOccurs.toISOString().slice(0, 7)
                setForm((prev) => ({
                  ...prev,
                  name: 'Job loss (example)',
                  description: 'Income pauses for 6 months; rebuild savings and adjust spending.',
                  occursOn: monthStr,
                  displayIcon: 'briefcase',
                  iconColor: '#0ea5e9',
                  isIncluded: true,
                  impacts: [
                    {
                      targetType: 'income',
                      impactKind: 'delta',
                      amount: -500000,
                      currency: 'SGD',
                      cadence: 'monthly',
                      startMonth: monthStr,
                      endMonth: undefined,
                      notes: 'Income down by ~$5k/month',
                    },
                    {
                      targetType: 'expense',
                      impactKind: 'delta',
                      amount: 150000,
                      currency: 'SGD',
                      cadence: 'one_time',
                      startMonth: monthStr,
                      notes: 'Use savings buffer for 1 month',
                    },
                  ],
                  iconSearch: 'briefcase',
                }))
              }}
              disabled={loadingState}
            >
              {SparklesIcon ? <SparklesIcon className="h-4 w-4 text-blue-200" /> : '★'}
              Example
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-gray-300 transition hover:bg-white/10"
              onClick={onClose}
              aria-label="Close scenario modal"
            >
              {CloseIcon ? <CloseIcon className="h-4 w-4" /> : '×'}
            </button>
      </div>
    </div>

    <div className="mt-4 flex items-center justify-between">
      <div className="text-sm text-gray-300">Include in projections</div>
      <button
        type="button"
        onClick={() => setForm((prev) => ({ ...prev, isIncluded: !prev.isIncluded }))}
        className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
          form.isIncluded
            ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100 hover:border-emerald-300/60'
            : 'border-slate-600 bg-slate-800/60 text-slate-300 hover:border-slate-500'
        }`}
        aria-pressed={form.isIncluded}
      >
        <span
          className={`flex h-4 w-8 items-center rounded-full p-[2px] transition ${
            form.isIncluded ? 'bg-emerald-400/70 justify-end' : 'bg-slate-600 justify-start'
          }`}
        >
          <span className="h-3 w-3 rounded-full bg-white" />
        </span>
        {form.isIncluded ? 'Enabled' : 'Disabled'}
      </button>
    </div>

    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <label className="space-y-1 text-sm">
        <span className="text-gray-300">Name</span>
        <input
          value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
              placeholder="e.g., Job Loss"
              disabled={loadingState}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-gray-300">Occurs on (month)</span>
            <input
              type="month"
              value={form.occursOn}
              onChange={(e) => setForm((prev) => ({ ...prev, occursOn: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert"
              disabled={loadingState}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-gray-300">Icon</span>
            <div className="flex items-center gap-2">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10"
                style={{ backgroundColor: form.iconColor || '#111827' }}
                aria-label="Icon color preview"
              >
                {SelectedIcon ? <SelectedIcon className="h-5 w-5 text-white" /> : null}
              </span>
              <input
                value={form.iconSearch}
                onChange={(e) => {
                  const next = e.target.value
                  setForm((prev) => ({
                    ...prev,
                    iconSearch: next,
                    displayIcon: next || prev.displayIcon,
                  }))
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                placeholder="Search icon e.g., briefcase, heart, home"
                disabled={loadingState}
              />
              <input
                type="color"
                value={form.iconColor}
                onChange={(e) => setForm((prev) => ({ ...prev, iconColor: e.target.value }))}
                className="h-10 w-16 cursor-pointer rounded-lg border border-white/10 bg-white/5"
                title="Icon background color"
                disabled={loadingState}
              />
            </div>
            <div className="relative">
              <div className="mt-2 grid max-h-60 grid-cols-3 gap-2 overflow-auto rounded-xl border border-white/10 bg-[#0f172a]/90 p-3 shadow-xl">
                {!hasSearch && (
                  <div className="col-span-3 text-center text-xs text-gray-400">Type to search for an icon.</div>
                )}
                {hasSearch &&
                  filteredIcons.slice(0, 24).map((opt, idx) => (
                    <button
                      key={`${opt.name}-${idx}`}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, displayIcon: opt.name, iconSearch: opt.name }))
                      }}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-left text-xs text-gray-100 transition hover:bg-white/10"
                      disabled={loadingState}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/20">
                        {renderIconOption(opt.Icon)}
                      </span>
                      <span className="truncate">
                        {opt.label} <span className="text-gray-400">({opt.name})</span>
                      </span>
                    </button>
                  ))}
                {hasSearch && filteredIcons.length === 0 && (
                  <div className="col-span-3 text-center text-xs text-gray-400">No icons match that search.</div>
                )}
              </div>
            </div>
          </label>
          <div className="md:col-span-2 space-y-1 text-sm">
            <span className="text-gray-300">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
              placeholder="What is this scenario about?"
          disabled={loadingState}
        />
      </div>
    </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Impacts</p>
              <p className="text-xs text-gray-400">
                Start/stop to gate timing; override replaces amounts; delta adds or subtracts.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 transition hover:bg-white/10 disabled:opacity-60"
              onClick={addImpact}
              disabled={loadingState}
            >
              {PlusIcon ? <PlusIcon className="h-4 w-4" /> : '+'}
              Add impact
            </button>
          </div>

          <div className="space-y-3">
            {form.impacts.map((impact, index) => (
              <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Impact {index + 1}</p>
                  {form.impacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImpact(index)}
                      className="text-rose-200 transition hover:text-rose-100 disabled:opacity-60"
                      disabled={loadingState}
                    >
                      {TrashIcon ? <TrashIcon className="h-4 w-4" /> : '✕'}
                    </button>
                  )}
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-xs">
                    <span className="text-gray-300">Target type</span>
                    <select
                      value={impact.targetType}
                      onChange={(e) => handleImpactChange(index, { targetType: e.target.value as ScenarioImpact['targetType'] })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                      disabled={loadingState}
                    >
                      <option value="asset">Asset</option>
                      <option value="liability">Liability</option>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-gray-300">Impact kind</span>
                    <select
                      value={impact.impactKind}
                      onChange={(e) => handleImpactChange(index, { impactKind: e.target.value as ScenarioImpact['impactKind'] })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                      disabled={loadingState}
                    >
                      <option value="start">Start</option>
                      <option value="stop">Stop</option>
                      <option value="override">Override</option>
                      <option value="delta">Delta</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-gray-300">Amount</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={Number.isFinite(impact.amount) ? new Intl.NumberFormat('en-US').format(impact.amount) : ''}
                      onChange={(e) => {
                        const numeric = Number(e.target.value.replace(/[^0-9-]/g, ''))
                        handleImpactChange(index, {
                          amount: Number.isNaN(numeric) ? 0 : numeric,
                        })
                      }}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                      placeholder="e.g., 50,000 for $500"
                      disabled={loadingState}
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-gray-300">Cadence</span>
                    <select
                      value={impact.cadence}
                      onChange={(e) => handleImpactChange(index, { cadence: e.target.value as ScenarioImpact['cadence'] })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                      disabled={loadingState}
                    >
                      <option value="one_time">One-time</option>
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-gray-300">Start month (YYYY-MM)</span>
                    <input
                      type="month"
                      value={impact.startMonth ?? ''}
                      onChange={(e) => handleImpactChange(index, { startMonth: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert"
                      disabled={loadingState}
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-gray-300">End month (optional)</span>
                    <input
                      type="month"
                      value={impact.endMonth ?? ''}
                      onChange={(e) => handleImpactChange(index, { endMonth: e.target.value || undefined })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert"
                      disabled={loadingState}
                    />
                  </label>
                  <label className="md:col-span-2 space-y-1 text-xs">
                    <span className="text-gray-300">Notes</span>
                    <textarea
                      value={impact.notes ?? ''}
                      onChange={(e) => handleImpactChange(index, { notes: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                      placeholder="Context for this impact"
                      disabled={loadingState}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-100 transition hover:bg-white/10"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
            onClick={handleSave}
            disabled={loadingState}
          >
            {saving ? 'Saving…' : event ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
