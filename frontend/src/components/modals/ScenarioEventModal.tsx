"use client"

import { useEffect, useState } from 'react'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import type { ScenarioEvent, ScenarioImpact } from '@/types/scenario'
import { financialApi } from '@/services/financialApi'

interface ScenarioEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: (event: ScenarioEvent) => void
  event?: ScenarioEvent
}

const defaultImpact: ScenarioImpact = {
  target_type: 'asset',
  impact_kind: 'delta',
  amount: 0,
  currency: 'SGD',
  cadence: 'monthly',
  start_month: '',
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

export function ScenarioEventModal({ isOpen, onClose, onSaved, event }: ScenarioEventModalProps) {
  const [name, setName] = useState('')
  const [occursOn, setOccursOn] = useState('')
  const [description, setDescription] = useState('')
  const [displayIcon, setDisplayIcon] = useState('sparkles')
  const [iconColor, setIconColor] = useState('#0ea5e9')
  const [tags, setTags] = useState<string>('')
  const [isIncluded, setIsIncluded] = useState(true)
  const [impacts, setImpacts] = useState<ScenarioImpact[]>([{ ...defaultImpact }])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [iconSearch, setIconSearch] = useState('')
  const PlusIcon = LucideIcons.Plus as LucideIcon | undefined
  const TrashIcon = LucideIcons.Trash2 as LucideIcon | undefined
  const CloseIcon = LucideIcons.X as LucideIcon | undefined
  const SparklesIcon = LucideIcons.Sparkles as LucideIcon | undefined

  const iconOptions = ICON_OPTIONS
  const SelectedIcon = iconOptions.find((opt) => opt.name === displayIcon)?.Icon

  const handleExample = () => {
    const exampleOccurs = new Date()
    exampleOccurs.setMonth(exampleOccurs.getMonth() + 2)
    const monthStr = exampleOccurs.toISOString().slice(0, 7)
    setName('Job loss (example)')
    setDescription('Income pauses for 6 months; rebuild savings and adjust spending.')
    setOccursOn(monthStr)
    setDisplayIcon('briefcase')
    setIconColor('#0ea5e9')
    setTags('career,risk,cashflow')
    setIsIncluded(true)
    setImpacts([
      {
        target_type: 'income',
        impact_kind: 'delta',
        amount: -500000, // -$5,000 in cents
        currency: 'SGD',
        cadence: 'monthly',
        start_month: monthStr,
        end_month: undefined,
        notes: 'Income down by ~$5k/month',
      },
      {
        target_type: 'expense',
        impact_kind: 'delta',
        amount: 150000, // $1,500 in cents
        currency: 'SGD',
        cadence: 'one_time',
        start_month: monthStr,
        notes: 'Use savings buffer for 1 month',
      },
    ])
    setIconSearch('briefcase')
  }

  useEffect(() => {
    if (!isOpen) return
    if (event) {
      setName(event.name ?? '')
      setOccursOn(event.occurs_on ?? '')
      setDescription(event.description ?? '')
      setDisplayIcon(event.display_icon ?? 'sparkles')
      setIconColor(event.display_color ?? '#0ea5e9')
      setTags((event.tags ?? []).join(','))
      setIsIncluded(event.is_included ?? true)
      setImpacts(event.impacts && event.impacts.length > 0 ? event.impacts : [{ ...defaultImpact }])
      setIconSearch(event.display_icon ?? '')
    } else {
      setName('')
      setOccursOn('')
      setDescription('')
      setDisplayIcon('sparkles')
      setIconColor('#0ea5e9')
      setTags('')
      setIsIncluded(true)
      setImpacts([{ ...defaultImpact }])
      setIconSearch('')
    }
  }, [event, isOpen])

  if (!isOpen) return null

  const handleImpactChange = (index: number, update: Partial<ScenarioImpact>) => {
    setImpacts((prev) => prev.map((impact, idx) => (idx === index ? { ...impact, ...update } : impact)))
  }

  const addImpact = () => setImpacts((prev) => [...prev, { ...defaultImpact, start_month: occursOn.slice(0, 7) }])

  const removeImpact = (index: number) => setImpacts((prev) => prev.filter((_, idx) => idx !== index))

  const handleSave = async () => {
    setError(null)
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    if (!occursOn) {
      setError('Occurs on date is required.')
      return
    }
    const payload: ScenarioEvent = {
      name: name.trim(),
      description: description.trim(),
      occurs_on: occursOn,
      display_icon: displayIcon.trim() || 'sparkles',
      display_color: iconColor,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      is_included: isIncluded,
      impacts: impacts.map((impact) => ({
        ...impact,
        amount: Number(impact.amount) || 0,
        currency: 'SGD',
        start_month: impact.start_month || occursOn.slice(0, 7),
      })),
    }
    setSaving(true)
    try {
      const saved = event?.id
        ? await financialApi.updateScenarioEvent(event.id, { ...event, ...payload })
        : await financialApi.createScenarioEvent(payload)
      onClose()
      onSaved?.(saved)
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to create scenario.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl border border-white/10 bg-[#0b1222] p-6 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Scenario</p>
              <h2 className="text-2xl font-semibold">{event ? 'Edit Scenario Event' : 'Create Scenario Event'}</h2>
              <p className="text-sm text-gray-400">Define event details and financial impacts.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-100 transition hover:bg-white/10"
                onClick={handleExample}
                title="Autofill an example scenario"
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

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-gray-300">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
              placeholder="e.g., Job Loss"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-gray-300">Occurs on (month)</span>
            <input
              type="month"
              value={occursOn}
              onChange={(e) => setOccursOn(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-gray-300">Icon</span>
            <div className="flex items-center gap-2">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10"
                style={{ backgroundColor: iconColor || '#111827' }}
                aria-label="Icon color preview"
              >
                {SelectedIcon ? <SelectedIcon className="h-5 w-5 text-white" /> : null}
              </span>
              <input
                value={iconSearch}
                onChange={(e) => {
                  setIconSearch(e.target.value)
                  setDisplayIcon(e.target.value || displayIcon)
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                placeholder="Search icon e.g., briefcase, heart, home"
              />
              <input
                type="color"
                value={iconColor}
                onChange={(e) => setIconColor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-white/10 bg-white/5"
                title="Icon background color"
              />
            </div>
            <div className="relative">
              <div className="mt-2 grid max-h-60 grid-cols-3 gap-2 overflow-auto rounded-xl border border-white/10 bg-[#0f172a]/90 p-3 shadow-xl">
                {iconOptions
                  .filter(
                    (opt) =>
                      opt.name.toLowerCase().includes(iconSearch.trim().toLowerCase()) ||
                      opt.label.toLowerCase().includes(iconSearch.trim().toLowerCase())
                  )
                  .slice(0, 24)
                  .map((opt, idx) => (
                    <button
                      key={`${opt.name}-${idx}`}
                      type="button"
                      onClick={() => {
                        setDisplayIcon(opt.name)
                        setIconSearch(opt.name)
                      }}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-left text-xs text-gray-100 transition hover:bg-white/10"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/20">
                      {(() => {
                        const IconComp = opt.Icon
                        return IconComp ? <IconComp className="h-4 w-4" /> : null
                      })()}
                    </span>
                      <span className="truncate">
                        {opt.label} <span className="text-gray-400">({opt.name})</span>
                      </span>
                    </button>
                ))}
                {iconOptions.filter(
                  (opt) =>
                    opt.name.toLowerCase().includes(iconSearch.trim().toLowerCase()) ||
                    opt.label.toLowerCase().includes(iconSearch.trim().toLowerCase())
                ).length === 0 && (
                  <div className="col-span-3 text-center text-xs text-gray-400">No icons match that search.</div>
                )}
              </div>
            </div>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-gray-300">Tags (comma-separated)</span>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
              placeholder="career, income, risk"
            />
          </label>
          <div className="md:col-span-2 space-y-1 text-sm">
            <span className="text-gray-300">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
              placeholder="What is this scenario about?"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-200">
            <input
              type="checkbox"
              checked={isIncluded}
              onChange={(e) => setIsIncluded(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-0"
            />
            Include in projections
          </label>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Impacts</p>
              <p className="text-xs text-gray-400">Start/stop gates first, then overrides, then deltas.</p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 transition hover:bg-white/10"
            onClick={addImpact}
          >
            {PlusIcon ? <PlusIcon className="h-4 w-4" /> : '+'}
            Add impact
          </button>
        </div>

          <div className="space-y-3">
            {impacts.map((impact, index) => (
              <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Impact {index + 1}</p>
                  {impacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImpact(index)}
                      className="text-rose-200 transition hover:text-rose-100"
                    >
                      {TrashIcon ? <TrashIcon className="h-4 w-4" /> : '✕'}
                    </button>
                  )}
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-xs">
                    <span className="text-gray-300">Target type</span>
                    <select
                      value={impact.target_type}
                      onChange={(e) => handleImpactChange(index, { target_type: e.target.value as ScenarioImpact['target_type'] })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
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
                      value={impact.impact_kind}
                      onChange={(e) => handleImpactChange(index, { impact_kind: e.target.value as ScenarioImpact['impact_kind'] })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                    >
                      <option value="start">Start</option>
                      <option value="stop">Stop</option>
                      <option value="override">Override</option>
                      <option value="delta">Delta</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-gray-300">Amount (in cents)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={
                        Number.isFinite(impact.amount)
                          ? new Intl.NumberFormat('en-US').format(impact.amount)
                          : ''
                      }
                      onChange={(e) => {
                        const numeric = Number(e.target.value.replace(/[^0-9-]/g, ''))
                        handleImpactChange(index, {
                          amount: Number.isNaN(numeric) ? 0 : numeric,
                        })
                      }}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                      placeholder="e.g., 50,000 for $500"
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-gray-300">Cadence</span>
                    <select
                      value={impact.cadence}
                      onChange={(e) => handleImpactChange(index, { cadence: e.target.value as ScenarioImpact['cadence'] })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
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
                      value={impact.start_month}
                      onChange={(e) => handleImpactChange(index, { start_month: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-gray-300">End month (optional)</span>
                    <input
                      type="month"
                      value={impact.end_month ?? ''}
                      onChange={(e) => handleImpactChange(index, { end_month: e.target.value || undefined })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
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
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-gray-300 transition hover:bg-white/5"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save scenario'}
          </button>
        </div>
      </div>
    </div>
  )
}
