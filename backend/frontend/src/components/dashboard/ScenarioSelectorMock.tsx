import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, MinusCircle, Search } from 'lucide-react'

type MockScenario = {
  id: string
  name: string
  icon: string
  accent: string
  mutedAccent: string
}

const MOCK_SCENARIOS: MockScenario[] = [
  {
    id: 'scn-gro',
    name: 'Growth Push',
    icon: 'GR',
    accent: 'from-blue-500/80 to-indigo-400/90',
    mutedAccent: 'from-blue-900/60 to-indigo-900/60',
  },
  {
    id: 'scn-shield',
    name: 'Inflation Shield',
    icon: 'IS',
    accent: 'from-emerald-500/80 to-teal-400/90',
    mutedAccent: 'from-emerald-900/60 to-teal-900/60',
  },
  {
    id: 'scn-down',
    name: 'Downturn Defense',
    icon: 'DD',
    accent: 'from-amber-500/80 to-orange-400/90',
    mutedAccent: 'from-amber-900/60 to-orange-900/60',
  },
  {
    id: 'scn-home',
    name: 'Home Upgrade',
    icon: 'HU',
    accent: 'from-rose-500/80 to-pink-400/90',
    mutedAccent: 'from-rose-900/60 to-pink-900/60',
  },
  {
    id: 'scn-college',
    name: 'College Fund',
    icon: 'CF',
    accent: 'from-sky-500/80 to-cyan-400/90',
    mutedAccent: 'from-sky-900/60 to-cyan-900/60',
  },
]

function AvatarStack({ scenarios }: { scenarios: MockScenario[] }) {
  return (
    <div className="flex items-center -space-x-3">
      {scenarios.map((scenario) => (
        <div
          key={scenario.id}
          className="relative h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-slate-900 shadow-lg shadow-black/30"
          aria-label={scenario.name}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br ${scenario.accent} opacity-90`}
          />
          <span className="relative flex h-full w-full items-center justify-center text-[11px] font-semibold uppercase text-white drop-shadow-sm">
            {scenario.icon}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ScenarioSelectorMock() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeIds, setActiveIds] = useState<Set<string>>(
    () => new Set(MOCK_SCENARIOS.slice(0, 3).map((s) => s.id))
  )
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const visibleScenarios = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return MOCK_SCENARIOS
    return MOCK_SCENARIOS.filter((s) => s.name.toLowerCase().includes(term))
  }, [search])

  const summaryText =
    activeIds.size === MOCK_SCENARIOS.length
      ? 'All scenarios active'
      : `${activeIds.size} of ${MOCK_SCENARIOS.length} active`

  const topStack = MOCK_SCENARIOS.slice(0, 3)

  return (
    <div className="w-full rounded-2xl border border-white/5 bg-white/3 backdrop-blur" ref={containerRef}>
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
            Scenario filter (mock)
            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/70">
              Preview only
            </span>
          </div>
          <p className="max-w-2xl text-sm text-slate-300">
            Toggle which scenarios feed the net worth projection. Unchecked scenarios stay visible but
            render as muted lines on the chart.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AvatarStack scenarios={topStack} />
          <div className="hidden text-sm text-slate-200 md:block">{summaryText}</div>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
          >
            <span className="hidden text-sm text-slate-200 md:inline">Adjust selection</span>
            <ChevronDown className="h-4 w-4 text-slate-300 group-hover:text-white" />
          </button>
        </div>
      </div>

      {open && (
        <div className="relative">
          <div className="absolute right-4 top-0 z-10 w-full max-w-xl rounded-xl border border-white/10 bg-[#0f1629] p-4 shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                placeholder="Search scenarios..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
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
                    className="flex w-full items-center gap-3 rounded-lg border border-white/5 bg-white/2 px-3 py-2 transition hover:border-white/15 hover:bg-white/5"
                  >
                    <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-slate-900 shadow-md shadow-black/20">
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${
                          isActive ? scenario.accent : scenario.mutedAccent
                        }`}
                      />
                      <span className="relative flex h-full w-full items-center justify-center text-[11px] font-semibold uppercase text-white drop-shadow-sm">
                        {scenario.icon}
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
                <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-3 text-sm text-slate-400">
                  <MinusCircle className="h-4 w-4" />
                  No scenarios match your search.
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-white/3 px-3 py-2 text-xs text-slate-300">
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
        </div>
      )}
    </div>
  )
}
