import { type ComponentType, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
} from 'lucide-react'

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

function AvatarStack({ scenarios }: { scenarios: MockScenario[] }) {
  return (
    <div className="flex items-center -space-x-3">
      {scenarios.map((scenario) => {
        const Icon = scenario.icon
        return (
          <div
            key={scenario.id}
            className="relative h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-slate-900 shadow-lg shadow-black/30"
            aria-label={scenario.name}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${scenario.accent} opacity-90`} />
            <span className="relative flex h-full w-full items-center justify-center drop-shadow-sm">
              <Icon className="h-4 w-4 text-white" />
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
  const [activeIds, setActiveIds] = useState<Set<string>>(
    () => new Set(MOCK_SCENARIOS.slice(0, 3).map((s) => s.id))
  )
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    // Lock body scroll while dropdown is open.
    if (open) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = original
      }
    }
    return
  }, [open])

  const visibleScenarios = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return MOCK_SCENARIOS
    return MOCK_SCENARIOS.filter((s) => s.name.toLowerCase().includes(term))
  }, [search])

  const topStack = MOCK_SCENARIOS.slice(0, 3)

  return (
    <div
      className={`relative w-full rounded-full border border-white/10 bg-transparent shadow-sm shadow-black/30 ${
        open ? 'z-50 relative' : ''
      }`}
      ref={containerRef}
    >
      <div className="relative flex items-center gap-3 overflow-visible rounded-full bg-gradient-to-r from-slate-800/90 via-slate-800/85 to-slate-900/85 px-4 py-2 pr-16">
        <AvatarStack scenarios={topStack} />
        <input
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          className="w-full bg-transparent text-sm text-white placeholder:text-slate-100/80 focus:outline-none"
          placeholder="Search scenarios..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {/* carved notch via background circle */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-2px] top-1/2 z-10 h-14 w-14 -translate-y-1/2 rounded-full bg-[#0b1020]"
        />
        <button
          type="button"
          onClick={() => {
            if (onCreateScenario) onCreateScenario()
          }}
          className="absolute right-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-gradient-to-br from-sky-500/85 via-blue-600/85 to-indigo-600/85 text-white shadow-xl shadow-black/60 transition hover:scale-105 hover:border-white/40"
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
              aria-hidden
            />
            <div
              className="fixed z-40 space-y-3 rounded-2xl border border-white/10 bg-[#0f1629] p-4 shadow-2xl shadow-black/40"
              style={{
                top: dropdownStyle.top,
                left: dropdownStyle.left,
                width: Math.min(dropdownStyle.width, 520),
              }}
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {visibleScenarios.map((scenario) => {
                  const isActive = activeIds.has(scenario.id)
                  return (
                    <button
                      key={scenario.id}
                      type="button"
                      onClick={() => {
                        setActiveIds((prev) => {
                          const next = new Set(prev)
                          if (next.has(scenario.id)) {
                            next.delete(scenario.id)
                          } else {
                            next.add(scenario.id)
                          }
                          return next
                        })
                      }}
                      className="flex w-full items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2 transition hover:border-white/15 hover:bg-white/10"
                    >
                      <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-slate-900 shadow-md shadow-black/20">
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${
                            isActive ? scenario.accent : scenario.mutedAccent
                          }`}
                        />
                        <span className="relative flex h-full w-full items-center justify-center drop-shadow-sm">
                          <scenario.icon className="h-4 w-4 text-white" />
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col items-start text-left">
                        <span className="text-sm font-semibold text-white">{scenario.name}</span>
                        <span className="text-xs text-slate-400">
                          {isActive ? 'Included in projection' : 'Visible only (muted)'}
                        </span>
                      </div>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded border ${
                          isActive
                            ? 'border-emerald-400/70 bg-emerald-400/10 text-emerald-200'
                            : 'border-slate-600 bg-slate-800/80 text-slate-400'
                        }`}
                        aria-label={isActive ? 'Active' : 'Inactive'}
                      >
                        {isActive ? <Check className="h-3 w-3" /> : <MinusCircle className="h-3 w-3" />}
                      </span>
                    </button>
                  )
                })}
                {visibleScenarios.length === 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/10 px-3 py-3 text-sm text-slate-400">
                    <MinusCircle className="h-4 w-4" />
                    No scenarios match your search.
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-xs text-slate-300">
                <span>Inactive scenarios stay on the chart but appear muted.</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-100">
                    <span className="h-2 w-5 rounded-full bg-emerald-300" />
                    Active
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-slate-700/40 px-3 py-1 text-slate-200">
                    <span className="h-2 w-5 rounded-full bg-slate-500" />
                    Muted
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  )
}
