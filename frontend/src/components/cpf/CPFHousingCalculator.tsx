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
import { CurrencyInput } from '@/components/ui/CurrencyInput'

// 2025 BRS
const BRS_2025 = 106500

// Custom dropdown for CPF Housing selects
function HousingDropdown<T extends string>({
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
          text-sm text-white text-left
          transition
          ${isOpen ? 'border-blue-500/50' : ''}`}
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
                  key={opt.value}
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
                      ? 'bg-blue-500/15 text-white'
                      : 'text-slate-300 hover:bg-white/[0.05]'
                    }
                  `}
                >
                  <span className="w-4 shrink-0">
                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-400" />}
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

// Property Input Node
function PropertyInputNode({ data }: { data: {
  purchasePrice: number
  valuation: number
  oaBalance: number
  totalCpf: number
  loanType: 'hdb' | 'bank'
  propertyType: 'bto' | 'resale' | 'private'
  onChange: (field: string, value: number | string) => void
}}) {
  return (
    <div className={`min-w-[240px]
p-4
rounded-xl border border-white/[0.08]
bg-[#0f1728]/95
shadow-xl backdrop-blur`}>
      <div className={`mb-3
text-xs font-medium tracking-wide text-blue-400
uppercase`}>
        Property Details
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Property Type</label>
          <HousingDropdown
            value={data.propertyType}
            onChange={(val) => data.onChange('propertyType', val)}
            options={[
              { value: 'bto', label: 'BTO (New HDB)' },
              { value: 'resale', label: 'HDB Resale' },
              { value: 'private', label: 'Private Property' },
            ]}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Purchase Price</label>
          <CurrencyInput
            value={data.purchasePrice}
            onChange={(val) => data.onChange('purchasePrice', val)}
            size="sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Market Valuation</label>
          <CurrencyInput
            value={data.valuation}
            onChange={(val) => data.onChange('valuation', val)}
            size="sm"
          />
        </div>

        {data.propertyType !== 'bto' && (
          <div>
            <label className="mb-1 block text-xs text-slate-400">Loan Type</label>
            <HousingDropdown
              value={data.loanType}
              onChange={(val) => data.onChange('loanType', val)}
              options={
                data.propertyType === 'resale'
                  ? [
                      { value: 'hdb', label: 'HDB Loan (2.6%)' },
                      { value: 'bank', label: 'Bank Loan (~4%)' },
                    ]
                  : [{ value: 'bank', label: 'Bank Loan (~4%)' }]
              }
            />
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-blue-500 !w-3 !h-3" />
    </div>
  )
}

// CPF Balance Input Node
function CPFBalanceNode({ data }: { data: {
  oaBalance: number
  totalCpf: number
  onChange: (field: string, value: number) => void
}}) {
  return (
    <div className={`min-w-[200px]
p-4
rounded-xl border border-white/[0.08]
bg-[#0f1728]/95
shadow-xl backdrop-blur`}>
      <Handle type="target" position={Position.Left} className="!bg-emerald-500 !w-3 !h-3" />

      <div className={`mb-3
text-xs font-medium tracking-wide text-emerald-400
uppercase`}>
        Your CPF Balances
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-slate-400">OA Balance</label>
          <CurrencyInput
            value={data.oaBalance}
            onChange={(val) => data.onChange('oaBalance', val)}
            size="sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Total CPF (OA+SA+MA)</label>
          <CurrencyInput
            value={data.totalCpf}
            onChange={(val) => data.onChange('totalCpf', val)}
            size="sm"
          />
        </div>

        <div className="pt-2 border-t border-white/10">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">BRS Requirement:</span>
            <span className={data.totalCpf >= BRS_2025 ? 'text-emerald-400' : 'text-red-400'}>
              {formatCurrency(BRS_2025)}
            </span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-slate-400">Status:</span>
            <span className={data.totalCpf >= BRS_2025 ? 'text-emerald-400' : 'text-red-400'}>
              {data.totalCpf >= BRS_2025 ? '✓ BRS Met' : '✗ Below BRS'}
            </span>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-emerald-500 !w-3 !h-3" />
    </div>
  )
}

// VL/WL Calculation Node
function LimitsNode({ data }: { data: {
  vl: number
  wl: number
  propertyType: string
  loanType: string
  brsmet: boolean
}}) {
  const showLimits = data.propertyType !== 'bto'

  return (
    <div className={`min-w-[200px]
p-4
rounded-xl border border-violet-500/30
bg-violet-500/10
shadow-xl backdrop-blur`}>
      <Handle type="target" position={Position.Left} className="!bg-violet-500 !w-3 !h-3" />

      <div className={`mb-2
text-xs font-medium tracking-wide text-violet-400
uppercase`}>
        CPF Usage Limits
      </div>

      {!showLimits ? (
        <div className="text-sm text-white">
          <p className="text-emerald-400 font-medium">No Limits!</p>
          <p className="text-xs text-slate-400 mt-1">BTO has no withdrawal limits. Use OA freely for downpayment and instalments.</p>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <div>
            <div className="text-xs text-slate-500 mb-1">Valuation Limit (VL)</div>
            <div className="font-medium text-white text-lg">{formatCurrency(data.vl)}</div>
            <p className="text-xs text-slate-500">= min(Price, Valuation)</p>
          </div>

          {data.loanType === 'bank' && (
            <div className="pt-2 border-t border-white/10">
              <div className="text-xs text-slate-500 mb-1">Withdrawal Limit (WL)</div>
              <div className="font-medium text-white text-lg">{formatCurrency(data.wl)}</div>
              <p className="text-xs text-slate-500">= 120% × VL (max for bank loan)</p>
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-violet-500 !w-3 !h-3" />
    </div>
  )
}

// Result Node
function ResultNode({ data }: { data: {
  maxUsable: number
  oaBalance: number
  actualUsable: number
  canUseExtra: boolean
  reason: string
  color: 'green' | 'amber' | 'red'
}}) {
  const colorClasses = {
    green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    red: 'border-red-500/30 bg-red-500/10 text-red-400',
  }[data.color]

  return (
    <div className={`rounded-xl border p-4 shadow-xl backdrop-blur min-w-[220px] ${colorClasses}`}>
      <Handle type="target" position={Position.Left} className="!bg-current !w-3 !h-3" />

      <div className="mb-2 text-xs font-medium uppercase tracking-wide">
        Maximum CPF Usable
      </div>

      <div className="text-2xl font-bold text-white">
        {formatCurrency(data.actualUsable)}
      </div>

      <div className="mt-3 space-y-2 text-xs">
        <div className="flex justify-between text-slate-400">
          <span>Your OA:</span>
          <span>{formatCurrency(data.oaBalance)}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Max Allowed:</span>
          <span>{formatCurrency(data.maxUsable)}</span>
        </div>
        <div className="pt-2 border-t border-white/10">
          <p className="text-slate-300">{data.reason}</p>
        </div>
      </div>
    </div>
  )
}

const nodeTypes = {
  propertyInput: PropertyInputNode,
  cpfBalance: CPFBalanceNode,
  limits: LimitsNode,
  result: ResultNode,
}

interface CPFHousingCalculatorProps {
  className?: string
}

export function CPFHousingCalculator({ className }: CPFHousingCalculatorProps) {
  const [purchasePrice, setPurchasePrice] = useState(500000)
  const [valuation, setValuation] = useState(480000)
  const [oaBalance, setOaBalance] = useState(150000)
  const [totalCpf, setTotalCpf] = useState(200000)
  const [loanType, setLoanType] = useState<'hdb' | 'bank'>('bank')
  const [propertyType, setPropertyType] = useState<'bto' | 'resale' | 'private'>('resale')

  const handleChange = (field: string, value: number | string) => {
    switch (field) {
      case 'purchasePrice': setPurchasePrice(value as number); break
      case 'valuation': setValuation(value as number); break
      case 'oaBalance': setOaBalance(value as number); break
      case 'totalCpf': setTotalCpf(value as number); break
      case 'loanType': setLoanType(value as 'hdb' | 'bank'); break
      case 'propertyType':
        setPropertyType(value as 'bto' | 'resale' | 'private')
        // Reset loan type for private property
        if (value === 'private') setLoanType('bank')
        break
    }
  }

  const calculations = useMemo(() => {
    const vl = Math.min(purchasePrice, valuation)
    const wl = vl * 1.2
    const brsMet = totalCpf >= BRS_2025

    let maxUsable: number
    let reason: string
    let color: 'green' | 'amber' | 'red'

    if (propertyType === 'bto') {
      // BTO has no limits
      maxUsable = Infinity
      reason = 'BTO has no CPF withdrawal limits. You can use your full OA balance.'
      color = 'green'
    } else if (loanType === 'hdb') {
      // HDB loan - can exceed VL if BRS met
      if (brsMet) {
        maxUsable = Infinity
        reason = 'BRS met! You can use OA beyond Valuation Limit for HDB loan.'
        color = 'green'
      } else {
        maxUsable = vl
        reason = 'Below BRS. CPF capped at Valuation Limit. Top up CPF to unlock more.'
        color = 'amber'
      }
    } else {
      // Bank loan - WL is max, but need BRS for VL→WL
      if (brsMet) {
        maxUsable = wl
        reason = 'BRS met! You can use OA up to Withdrawal Limit (120% of VL).'
        color = 'green'
      } else {
        maxUsable = vl
        reason = 'Below BRS. Capped at Valuation Limit. Cannot access extra 20%.'
        color = 'amber'
      }
    }

    const actualUsable = Math.min(oaBalance, maxUsable === Infinity ? oaBalance : maxUsable)

    return { vl, wl, brsMet, maxUsable, actualUsable, reason, color }
  }, [purchasePrice, valuation, oaBalance, totalCpf, loanType, propertyType])

  const nodes: Node[] = useMemo(() => [
    {
      id: 'property',
      type: 'propertyInput',
      position: { x: -350, y: 0 },
      data: { purchasePrice, valuation, oaBalance, totalCpf, loanType, propertyType, onChange: handleChange },
    },
    {
      id: 'cpf',
      type: 'cpfBalance',
      position: { x: -50, y: -50 },
      data: { oaBalance, totalCpf, onChange: handleChange },
    },
    {
      id: 'limits',
      type: 'limits',
      position: { x: -50, y: 200 },
      data: { vl: calculations.vl, wl: calculations.wl, propertyType, loanType, brsmet: calculations.brsMet },
    },
    {
      id: 'result',
      type: 'result',
      position: { x: 250, y: 80 },
      data: {
        maxUsable: calculations.maxUsable,
        oaBalance,
        actualUsable: calculations.actualUsable,
        canUseExtra: calculations.brsMet,
        reason: calculations.reason,
        color: calculations.color,
      },
    },
  ], [purchasePrice, valuation, oaBalance, totalCpf, loanType, propertyType, calculations])

  const edges: Edge[] = useMemo(() => [
    {
      id: 'e-property-cpf',
      source: 'property',
      target: 'cpf',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2 },
    },
    {
      id: 'e-property-limits',
      source: 'property',
      target: 'limits',
      animated: true,
      style: { stroke: '#8b5cf6', strokeWidth: 2 },
    },
    {
      id: 'e-cpf-result',
      source: 'cpf',
      target: 'result',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2 },
    },
    {
      id: 'e-limits-result',
      source: 'limits',
      target: 'result',
      animated: true,
      style: { stroke: '#8b5cf6', strokeWidth: 2 },
    },
  ], [])

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
            <span className="text-slate-400">Valuation Limit: </span>
            <span className="font-medium text-violet-400">{formatCurrency(calculations.vl)}</span>
          </div>
          <div>
            <span className="text-slate-400">Withdrawal Limit: </span>
            <span className="font-medium text-violet-400">{formatCurrency(calculations.wl)}</span>
          </div>
          <div>
            <span className="text-slate-400">Max Usable: </span>
            <span className={`font-medium ${calculations.color === 'green' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {formatCurrency(calculations.actualUsable)}
            </span>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          BRS: {formatCurrency(BRS_2025)} (2025)
        </div>
      </div>
    </div>
  )
}
