import React, { type ComponentType, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  BarChart3,
  Check,
  GraduationCap,
  Home,
  LineChart,
  MinusCircle,
  Plus,
  Shield,
  Trash2,
} from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

type MockScenario = {
  id: string
  name: string
  icon: ComponentType<{ className?: string }>
  accent: string
  mutedAccent: string
}

const MOCK_SCENARIOS: MockScenario[] = [
  {
    id: 'scn-gro',
    name: 'Growth Push',
    icon: LineChart,
    accent: 'from-blue-500/80 to-indigo-400/90',
    mutedAccent: 'from-blue-900/60 to-indigo-900/60',
  },
  {
    id: 'scn-shield',
    name: 'Inflation Shield',
    icon: Shield,
    accent: 'from-emerald-500/80 to-teal-400/90',
    mutedAccent: 'from-emerald-900/60 to-teal-900/60',
  },
  {
    id: 'scn-down',
    name: 'Downturn Defense',
    icon: BarChart3,
    accent: 'from-amber-500/80 to-orange-400/90',
    mutedAccent: 'from-amber-900/60 to-orange-900/60',
  },
  {
    id: 'scn-home',
    name: 'Home Upgrade',
    icon: Home,
    accent: 'from-rose-500/80 to-pink-400/90',
    mutedAccent: 'from-rose-900/60 to-pink-900/60',
  },
  {
    id: 'scn-college',
    name: 'College Fund',
    icon: GraduationCap,
    accent: 'from-sky-500/80 to-cyan-400/90',
    mutedAccent: 'from-sky-900/60 to-cyan-900/60',
  },
]

function AvatarStack({ scenarios, activeIds }: { scenarios: MockScenario[]; activeIds: Set<string> }) {
  return (
    <div className="flex items-center -space-x-3">
      {scenarios.map((scenario) => {
        const Icon = scenario.icon
        const isActive = activeIds.has(scenario.id)
        return (
          <div
            key={scenario.id}
            className={`relative
overflow-hidden
h-9 w-9
rounded-full border border-white/10
bg-slate-900
shadow-lg shadow-black/30`}
            aria-label={scenario.name}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${
                isActive ? scenario.accent : scenario.mutedAccent
              } ${isActive ? 'opacity-90' : 'opacity-60'}`}
            />
            <span className={`relative
flex items-center justify-center
h-full w-full
drop-shadow-sm`}>
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-white/60'}`} />
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function ScenarioSelectorMock({ onCreateScenario }: { onCreateScenario?: () => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [scenarios, setScenarios] = useState<MockScenario[]>(() => [...MOCK_SCENARIOS])
  const [activeIds, setActiveIds] = useState<Set<string>>(
    () => new Set(MOCK_SCENARIOS.slice(0, 3).map((s) => s.id))
  )
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [includeEnabled] = useState(true)

  useEffect(() => {
    setMounted(true)
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      setDropdownStyle(null)
      return
    }
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setDropdownStyle({
      top: rect.bottom + 8 + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    })
  }, [open])

  // Use the reusable scroll lock hook for better handling
  useBodyScrollLock(open && includeEnabled)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  const visibleScenarios = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return scenarios
    return scenarios.filter((s) => s.name.toLowerCase().includes(term))
  }, [search, scenarios])

  const toggleScenario = (id: string) => {
    setActiveIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const deleteScenario = (id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id))
    setActiveIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const topStack = scenarios.slice(0, 3)

  return (
    <div
      className={`relative w-full rounded-full border border-white/10 bg-transparent shadow-sm shadow-black/30 ${
        open ? 'z-50 relative' : ''
      }`}
      ref={containerRef}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }}
    >
      <div className={`relative
flex items-center overflow-visible
gap-3 px-4 py-2 pr-16
rounded-full
bg-gradient-to-r from-slate-800/90 via-slate-800/85 to-slate-900/85`}>
        <AvatarStack scenarios={topStack} activeIds={activeIds} />
        <input
          ref={inputRef}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          className={`w-full
focus:outline-none
bg-transparent
text-sm text-white placeholder:text-slate-100/80
caret-white`}
          placeholder="Search scenarios..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {/* carved notch via background circle */}
        <div
          aria-hidden
          className={`absolute right-[-2px] top-1/2 z-10
h-14 w-14
pointer-events-none
rounded-full
bg-[#0b1020]
-translate-y-1/2`}
        />
        <button
          type="button"
          onClick={() => {
            if (onCreateScenario) onCreateScenario()
          }}
          className={`absolute right-1 top-1/2 z-20
flex items-center justify-center
h-10 w-10
rounded-full border border-white/25 hover:border-white/40
bg-gradient-to-br from-sky-500/85 via-blue-600/85 to-indigo-600/85
text-white
shadow-xl shadow-black/60
transition hover:scale-105
-translate-y-1/2`}
          aria-label="Create scenario"
        >
          <Plus className="h-3.5 w-3.5 text-white/90" />
        </button>
      </div>
      {open && mounted && dropdownStyle &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-md"
              onClick={() => setOpen(false)}
              onWheel={(e) => e.preventDefault()}
              onTouchMove={(e) => e.preventDefault()}
              aria-hidden
            />
            <div
              className={`fixed z-40
space-y-3 p-4
rounded-2xl border border-white/10
bg-[#0f1629]
shadow-2xl shadow-black/40`}
              style={{
                top: dropdownStyle.top,
                left: dropdownStyle.left,
                width: Math.min(dropdownStyle.width, 520),
              }}
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
            >
              <div className={`flex items-center justify-between
mb-2
text-xs text-slate-200`}>
                <span className="font-semibold">{`${scenarios.length} scenarios`}</span>
                <button
                  type="button"
                  onClick={() => {
                    const allIds = new Set(scenarios.map((s) => s.id))
                    const allSelected = activeIds.size === allIds.size
                    setActiveIds(allSelected ? new Set() : allIds)
                  }}
                  className={`px-3 py-1
rounded-full border border-white/15 hover:border-white/30
bg-white/5 hover:bg-white/10
text-[11px] font-semibold text-white
transition`}
                >
                  {activeIds.size === scenarios.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {visibleScenarios.map((scenario) => {
                  const isActive = activeIds.has(scenario.id)
                  const Icon = scenario.icon
                  return (
                    <div
                      key={scenario.id}
                      className={`flex items-center
w-full
gap-3 px-3 py-2
rounded-lg border border-white/5 hover:border-white/15
bg-white/5 hover:bg-white/10
transition`}
                    >
                      <div className={`relative
overflow-hidden
h-9 w-9
rounded-full border border-white/10
bg-slate-900
shadow-md shadow-black/20`}>
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${
                            isActive ? scenario.accent : scenario.mutedAccent
                          }`}
                        />
                        <span className={`relative
flex items-center justify-center
h-full w-full
drop-shadow-sm`}>
                          <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-white/60'}`} />
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col items-start text-left">
                        <span className="text-sm font-semibold text-white">{scenario.name}</span>
                        <span className="text-xs text-slate-400">
                          {isActive ? 'Included in projection' : 'Visible only (muted)'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleScenario(scenario.id)}
                        className={`flex h-5 w-5 items-center justify-center rounded border ${
                          isActive
                            ? 'border-emerald-400/70 bg-emerald-400/10 text-emerald-200'
                            : 'border-slate-600 bg-slate-800/80 text-slate-400'
                        }`}
                        aria-pressed={isActive}
                        aria-label={isActive ? 'Deselect scenario' : 'Select scenario'}
                      >
                        {isActive ? <Check className="h-3 w-3" /> : <MinusCircle className="h-3 w-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteScenario(scenario.id)}
                        className={`flex items-center justify-center
h-5 w-5
rounded border border-red-500/30 hover:border-red-500/50
bg-red-500/10 hover:bg-red-500/20
text-red-400 hover:text-red-300
transition`}
                        aria-label={`Delete ${scenario.name}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
                {visibleScenarios.length === 0 && (
                  <div className={`flex items-center
gap-2 px-3 py-3
rounded-lg border border-white/5
bg-white/10
text-sm text-slate-400`}>
                    <MinusCircle className="h-4 w-4" />
                    No scenarios match your search.
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-2">
                <div />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={`px-3.5 py-1.5
rounded-full border border-white/20 hover:border-white/35
bg-white/10 hover:bg-white/20
text-xs font-semibold text-white
transition`}
                >
                  Apply
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  )
}
