'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ChevronDown, Check } from 'lucide-react'

import { formatCurrency } from '@/lib/format'

// CPF LIFE payout factors (per $1,000 of RA balance)
const PAYOUT_FACTORS = {
  standard: { 65: 5.50, 66: 5.90, 67: 6.30, 68: 6.80, 69: 7.30, 70: 7.90 },
  basic: { 65: 5.00, 66: 5.40, 67: 5.80, 68: 6.20, 69: 6.70, 70: 7.20 },
  escalating: { 65: 4.40, 66: 4.70, 67: 5.00, 68: 5.40, 69: 5.80, 70: 6.30 },
} as const

type PlanType = keyof typeof PAYOUT_FACTORS
type StartAge = 65 | 66 | 67 | 68 | 69 | 70

// Custom dropdown for CPF selects
function CPFDropdown<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as globalThis.Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className={`w-full
          flex items-center justify-between
          py-2 px-3
          rounded-lg border border-white/[0.08]
          bg-white/[0.02] hover:bg-white/[0.04]
          text-white text-left
          transition
          ${isOpen ? 'border-purple-500/50' : ''}`}
      >
        <span>{selectedOption?.label ?? ''}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="
          absolute left-0 top-full z-[100] mt-1
          w-full
          rounded-xl
          border border-white/[0.12]
          bg-[#0c0c0c]
          shadow-2xl shadow-black/60
          overflow-hidden
          animate-in fade-in slide-in-from-top-2 duration-150
        ">
          <div className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                  className={`
                    w-full flex items-center gap-2
                    px-3 py-2
                    text-sm text-left
                    transition-all duration-150
                    ${isSelected
                      ? 'bg-purple-500/15 text-white'
                      : 'text-slate-300 hover:bg-white/[0.05]'
                    }
                  `}
                >
                  <span className="w-4 shrink-0">
                    {isSelected && <Check className="h-3.5 w-3.5 text-purple-400" />}
                  </span>
                  <span>{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// RA Input Node
function RAInputNode({ data }: { data: {
  raBalance: number
  startAge: StartAge
  onChange: (field: string, value: number) => void
}}) {
  return (
    <div className={`min-w-[220px]
p-4
rounded-xl border border-white/[0.08]
bg-[#0f1728]/95
shadow-xl backdrop-blur`}>
      <div className={`mb-3
text-xs font-medium tracking-wide text-purple-400
uppercase`}>
        Retirement Account
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-slate-400">RA Balance at 65</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input
              type="number"
              value={data.raBalance}
              onChange={(e) => data.onChange('raBalance', Number(e.target.value))}
              className={`w-full
py-2 pl-7 pr-3
rounded-lg border border-white/[0.08] focus:border-purple-500/50 focus:outline-none
bg-white/[0.02]
text-lg font-semibold text-white
transition`}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Start Payout At</label>
          <CPFDropdown
            value={data.startAge}
            onChange={(val) => data.onChange('startAge', val)}
            options={[
              { value: 65, label: 'Age 65 (earliest)' },
              { value: 66, label: 'Age 66 (+7% bonus)' },
              { value: 67, label: 'Age 67 (+14% bonus)' },
              { value: 68, label: 'Age 68 (+21% bonus)' },
              { value: 69, label: 'Age 69 (+28% bonus)' },
              { value: 70, label: 'Age 70 (+35% bonus)' },
            ]}
          />
        </div>

        {data.startAge > 65 && (
          <div className="pt-2 border-t border-white/10 text-xs text-emerald-400">
            Deferring {data.startAge - 65} year{data.startAge > 66 ? 's' : ''} = +{(data.startAge - 65) * 7}% higher payouts
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-purple-500 !w-3 !h-3" />
    </div>
  )
}

// Plan Selection Node
function PlanNode({ data }: { data: {
  planType: PlanType
  payout: number
  description: string
  pros: string[]
  cons: string[]
  color: string
  isSelected: boolean
  onClick: () => void
}}) {
  const colorClasses = {
    blue: data.isSelected ? 'border-blue-500 bg-blue-500/20' : 'border-blue-500/30 bg-blue-500/10',
    green: data.isSelected ? 'border-emerald-500 bg-emerald-500/20' : 'border-emerald-500/30 bg-emerald-500/10',
    amber: data.isSelected ? 'border-amber-500 bg-amber-500/20' : 'border-amber-500/30 bg-amber-500/10',
  }[data.color] || 'border-white/10 bg-white/5'

  const textColor = {
    blue: 'text-blue-400',
    green: 'text-emerald-400',
    amber: 'text-amber-400',
  }[data.color] || 'text-white'

  return (
    <div
      onClick={data.onClick}
      className={`rounded-xl border-2 p-4 shadow-xl backdrop-blur min-w-[180px] cursor-pointer transition-all hover:scale-105 ${colorClasses}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-current !w-3 !h-3" />

      <div className={`mb-1 text-xs font-medium uppercase tracking-wide ${textColor}`}>
        {data.planType.charAt(0).toUpperCase() + data.planType.slice(1)} Plan
      </div>

      <div className="text-2xl font-bold text-white">
        {formatCurrency(data.payout)}
        <span className="text-sm text-slate-400">/mo</span>
      </div>

      <div className="mt-2 text-xs text-slate-400">
        {data.description}
      </div>

      <div className="mt-3 space-y-1">
        {data.pros.map((pro, i) => (
          <div key={i} className="text-xs text-emerald-400">✓ {pro}</div>
        ))}
        {data.cons.map((con, i) => (
          <div key={i} className="text-xs text-red-400">✗ {con}</div>
        ))}
      </div>

      {data.isSelected && (
        <div className="mt-2 text-xs text-center text-white/80 font-medium">
          ← Selected
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-current !w-3 !h-3" />
    </div>
  )
}

// Lifetime Projection Node
function ProjectionNode({ data }: { data: {
  monthlyPayout: number
  planType: PlanType
  startAge: number
}}) {
  const years = [5, 10, 15, 20, 25, 30]

  // Calculate cumulative payouts (escalating increases 2% per year)
  const calculateCumulative = (years: number) => {
    if (data.planType === 'escalating') {
      let total = 0
      let currentPayout = data.monthlyPayout
      for (let y = 0; y < years; y++) {
        total += currentPayout * 12
        currentPayout *= 1.02
      }
      return total
    }
    return data.monthlyPayout * 12 * years
  }

  return (
    <div className={`min-w-[200px]
p-4
rounded-xl border border-green-500/30
bg-green-500/10
shadow-xl backdrop-blur`}>
      <Handle type="target" position={Position.Left} className="!bg-green-500 !w-3 !h-3" />

      <div className={`mb-2
text-xs font-medium tracking-wide text-green-400
uppercase`}>
        Lifetime Projection
      </div>

      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2 text-slate-400">
          <span>After</span>
          <span className="text-right">Received</span>
        </div>

        {years.map((y) => {
          const age = data.startAge + y
          return (
            <div key={y} className="grid grid-cols-2 gap-2">
              <span className="text-slate-300">{y}y (age {age})</span>
              <span className="text-right text-white font-medium">
                {formatCurrency(calculateCumulative(y))}
              </span>
            </div>
          )
        })}
      </div>

      {data.planType === 'escalating' && (
        <div className="mt-3 pt-2 border-t border-white/10 text-xs text-amber-400">
          Payouts increase 2% yearly
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-white/10 text-xs text-slate-500">
        Payouts continue for life
      </div>
    </div>
  )
}

const nodeTypes = {
  raInput: RAInputNode,
  plan: PlanNode,
  projection: ProjectionNode,
}

interface CPFLifeEstimatorProps {
  className?: string
}

export function CPFLifeEstimator({ className }: CPFLifeEstimatorProps) {
  const [raBalance, setRaBalance] = useState(200000)
  const [startAge, setStartAge] = useState<StartAge>(65)
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('standard')

  const handleChange = (field: string, value: number) => {
    if (field === 'raBalance') setRaBalance(value)
    if (field === 'startAge') setStartAge(value as StartAge)
  }

  const payouts = useMemo(() => {
    const raInThousands = raBalance / 1000
    return {
      standard: raInThousands * PAYOUT_FACTORS.standard[startAge],
      basic: raInThousands * PAYOUT_FACTORS.basic[startAge],
      escalating: raInThousands * PAYOUT_FACTORS.escalating[startAge],
    }
  }, [raBalance, startAge])

  const nodes: Node[] = useMemo(() => [
    {
      id: 'ra',
      type: 'raInput',
      position: { x: -350, y: 100 },
      data: { raBalance, startAge, onChange: handleChange },
    },
    {
      id: 'standard',
      type: 'plan',
      position: { x: -50, y: -30 },
      data: {
        planType: 'standard' as PlanType,
        payout: payouts.standard,
        description: 'Highest monthly income',
        pros: ['Highest payout'],
        cons: ['Lower bequest'],
        color: 'blue',
        isSelected: selectedPlan === 'standard',
        onClick: () => setSelectedPlan('standard'),
      },
    },
    {
      id: 'basic',
      type: 'plan',
      position: { x: -50, y: 150 },
      data: {
        planType: 'basic' as PlanType,
        payout: payouts.basic,
        description: 'Leave more to family',
        pros: ['Highest bequest'],
        cons: ['Lower payout'],
        color: 'green',
        isSelected: selectedPlan === 'basic',
        onClick: () => setSelectedPlan('basic'),
      },
    },
    {
      id: 'escalating',
      type: 'plan',
      position: { x: -50, y: 330 },
      data: {
        planType: 'escalating' as PlanType,
        payout: payouts.escalating,
        description: 'Payouts grow 2%/year',
        pros: ['Inflation hedge'],
        cons: ['Lowest start'],
        color: 'amber',
        isSelected: selectedPlan === 'escalating',
        onClick: () => setSelectedPlan('escalating'),
      },
    },
    {
      id: 'projection',
      type: 'projection',
      position: { x: 220, y: 100 },
      data: {
        monthlyPayout: payouts[selectedPlan],
        planType: selectedPlan,
        startAge,
      },
    },
  ], [raBalance, startAge, payouts, selectedPlan])

  const edges: Edge[] = useMemo(() => [
    {
      id: 'e-ra-standard',
      source: 'ra',
      target: 'standard',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: selectedPlan === 'standard' ? 3 : 1 },
    },
    {
      id: 'e-ra-basic',
      source: 'ra',
      target: 'basic',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: selectedPlan === 'basic' ? 3 : 1 },
    },
    {
      id: 'e-ra-escalating',
      source: 'ra',
      target: 'escalating',
      animated: true,
      style: { stroke: '#f59e0b', strokeWidth: selectedPlan === 'escalating' ? 3 : 1 },
    },
    {
      id: 'e-standard-proj',
      source: 'standard',
      target: 'projection',
      animated: selectedPlan === 'standard',
      style: { stroke: '#3b82f6', strokeWidth: selectedPlan === 'standard' ? 3 : 1, opacity: selectedPlan === 'standard' ? 1 : 0.3 },
    },
    {
      id: 'e-basic-proj',
      source: 'basic',
      target: 'projection',
      animated: selectedPlan === 'basic',
      style: { stroke: '#10b981', strokeWidth: selectedPlan === 'basic' ? 3 : 1, opacity: selectedPlan === 'basic' ? 1 : 0.3 },
    },
    {
      id: 'e-escalating-proj',
      source: 'escalating',
      target: 'projection',
      animated: selectedPlan === 'escalating',
      style: { stroke: '#f59e0b', strokeWidth: selectedPlan === 'escalating' ? 3 : 1, opacity: selectedPlan === 'escalating' ? 1 : 0.3 },
    },
  ], [selectedPlan])

  return (
    <div className={`h-[700px] rounded-xl border border-white/[0.08] bg-[#0a0a0a] ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.5}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls
          className={`!bg-slate-800 !border-white/10 !rounded-lg [&>button]:!bg-slate-700 [&>button]:!border-white/10 [&>button:hover]:!bg-slate-600 [&>button>svg]:!fill-white`}
        />
      </ReactFlow>

      {/* Summary Footer */}
      <div className={`flex items-center justify-between
px-4 py-3
border-t border-white/[0.06]
text-sm`}>
        <div className="flex gap-6">
          <div>
            <span className="text-slate-400">RA Balance: </span>
            <span className="font-medium text-purple-400">{formatCurrency(raBalance)}</span>
          </div>
          <div>
            <span className="text-slate-400">Monthly ({selectedPlan}): </span>
            <span className="font-medium text-emerald-400">{formatCurrency(payouts[selectedPlan])}</span>
          </div>
          <div>
            <span className="text-slate-400">Yearly: </span>
            <span className="font-medium text-emerald-400">{formatCurrency(payouts[selectedPlan] * 12)}</span>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          Click a plan to compare
        </div>
      </div>
    </div>
  )
}
