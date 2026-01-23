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
import { useTheme } from '@/lib/theme'

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
  const { theme, isMonet } = useTheme()

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
        style={{
          background: theme.controlBg,
          borderColor: isOpen ? theme.blue : theme.controlBorder,
          color: theme.textPrimary,
        }}
        className={`w-full
          flex items-center justify-between
          py-2 px-3
          rounded-lg border
          text-sm text-left
          transition`}
      >
        <span>{selectedOption?.label ?? ''}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: theme.textMuted }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            background: isMonet ? 'rgba(255, 255, 255, 0.95)' : '#0c0c0c',
            border: `1px solid ${isMonet ? theme.cardBorder : 'rgba(255, 255, 255, 0.12)'}`,
            boxShadow: isMonet ? `0 8px 32px ${theme.shadowMedium}` : '0 8px 32px rgba(0, 0, 0, 0.6)',
          }}
          className="
            absolute left-0 top-full z-[100] mt-1
            w-full
            rounded-xl
            overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-150
          "
        >
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
                  style={{
                    background: isSelected
                      ? isMonet ? 'rgba(123, 163, 201, 0.15)' : 'rgba(96, 165, 250, 0.15)'
                      : 'transparent',
                    color: isSelected ? theme.textPrimary : theme.textSecondary,
                  }}
                  className="
                    w-full flex items-center gap-2
                    px-3 py-2
                    text-sm text-left
                    transition-all duration-150
                    hover:opacity-80
                  "
                >
                  <span className="w-4 shrink-0">
                    {isSelected && <Check className="h-3.5 w-3.5" style={{ color: theme.blue }} />}
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
  const { theme, isMonet } = useTheme()

  return (
    <div
      style={{
        background: isMonet ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 40, 0.95)',
        border: `1px solid ${theme.cardBorder}`,
      }}
      className="min-w-[240px] p-4 rounded-xl shadow-xl backdrop-blur"
    >
      <div
        style={{ color: theme.blue }}
        className="mb-3 text-xs font-medium tracking-wide uppercase"
      >
        Property Details
      </div>

      <div className="space-y-3">
        <div>
          <label style={{ color: theme.textMuted }} className="mb-1 block text-xs">Property Type</label>
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
          <label style={{ color: theme.textMuted }} className="mb-1 block text-xs">Purchase Price</label>
          <CurrencyInput
            value={data.purchasePrice}
            onChange={(val) => data.onChange('purchasePrice', val)}
            size="sm"
          />
        </div>

        <div>
          <label style={{ color: theme.textMuted }} className="mb-1 block text-xs">Market Valuation</label>
          <CurrencyInput
            value={data.valuation}
            onChange={(val) => data.onChange('valuation', val)}
            size="sm"
          />
        </div>

        {data.propertyType !== 'bto' && (
          <div>
            <label style={{ color: theme.textMuted }} className="mb-1 block text-xs">Loan Type</label>
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

      <Handle type="source" position={Position.Right} style={{ background: theme.blue }} className="!w-3 !h-3" />
    </div>
  )
}

// CPF Balance Input Node
function CPFBalanceNode({ data }: { data: {
  oaBalance: number
  totalCpf: number
  onChange: (field: string, value: number) => void
}}) {
  const { theme, isMonet } = useTheme()

  return (
    <div
      style={{
        background: isMonet ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 40, 0.95)',
        border: `1px solid ${theme.cardBorder}`,
      }}
      className="min-w-[200px] p-4 rounded-xl shadow-xl backdrop-blur"
    >
      <Handle type="target" position={Position.Left} style={{ background: theme.sage }} className="!w-3 !h-3" />

      <div
        style={{ color: theme.sage }}
        className="mb-3 text-xs font-medium tracking-wide uppercase"
      >
        Your CPF Balances
      </div>

      <div className="space-y-3">
        <div>
          <label style={{ color: theme.textMuted }} className="mb-1 block text-xs">OA Balance</label>
          <CurrencyInput
            value={data.oaBalance}
            onChange={(val) => data.onChange('oaBalance', val)}
            size="sm"
          />
        </div>

        <div>
          <label style={{ color: theme.textMuted }} className="mb-1 block text-xs">Total CPF (OA+SA+MA)</label>
          <CurrencyInput
            value={data.totalCpf}
            onChange={(val) => data.onChange('totalCpf', val)}
            size="sm"
          />
        </div>

        <div style={{ borderColor: theme.surfaceBorder }} className="pt-2 border-t">
          <div className="flex justify-between text-xs">
            <span style={{ color: theme.textMuted }}>BRS Requirement:</span>
            <span style={{ color: data.totalCpf >= BRS_2025 ? theme.sage : theme.accent }}>
              {formatCurrency(BRS_2025)}
            </span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span style={{ color: theme.textMuted }}>Status:</span>
            <span style={{ color: data.totalCpf >= BRS_2025 ? theme.sage : theme.accent }}>
              {data.totalCpf >= BRS_2025 ? '\u2713 BRS Met' : '\u2717 Below BRS'}
            </span>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} style={{ background: theme.sage }} className="!w-3 !h-3" />
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
  const { theme, isMonet } = useTheme()
  const showLimits = data.propertyType !== 'bto'

  return (
    <div
      style={{
        background: isMonet ? 'rgba(168, 135, 179, 0.15)' : 'rgba(139, 92, 246, 0.1)',
        border: `1px solid ${isMonet ? 'rgba(168, 135, 179, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
      }}
      className="min-w-[200px] p-4 rounded-xl shadow-xl backdrop-blur"
    >
      <Handle type="target" position={Position.Left} style={{ background: theme.purple }} className="!w-3 !h-3" />

      <div
        style={{ color: theme.purple }}
        className="mb-2 text-xs font-medium tracking-wide uppercase"
      >
        CPF Usage Limits
      </div>

      {!showLimits ? (
        <div className="text-sm">
          <p style={{ color: theme.sage }} className="font-medium">No Limits!</p>
          <p style={{ color: theme.textMuted }} className="text-xs mt-1">BTO has no withdrawal limits. Use OA freely for downpayment and instalments.</p>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <div>
            <div style={{ color: theme.textMuted }} className="text-xs mb-1">Valuation Limit (VL)</div>
            <div style={{ color: theme.textPrimary }} className="font-medium text-lg">{formatCurrency(data.vl)}</div>
            <p style={{ color: theme.textMuted }} className="text-xs">= min(Price, Valuation)</p>
          </div>

          {data.loanType === 'bank' && (
            <div style={{ borderColor: theme.surfaceBorder }} className="pt-2 border-t">
              <div style={{ color: theme.textMuted }} className="text-xs mb-1">Withdrawal Limit (WL)</div>
              <div style={{ color: theme.textPrimary }} className="font-medium text-lg">{formatCurrency(data.wl)}</div>
              <p style={{ color: theme.textMuted }} className="text-xs">= 120% x VL (max for bank loan)</p>
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} style={{ background: theme.purple }} className="!w-3 !h-3" />
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
  const { theme, isMonet } = useTheme()

  const getResultColors = () => {
    if (data.color === 'green') {
      return {
        bg: isMonet ? 'rgba(127, 178, 133, 0.15)' : 'rgba(16, 185, 129, 0.1)',
        border: isMonet ? 'rgba(127, 178, 133, 0.3)' : 'rgba(16, 185, 129, 0.3)',
        text: theme.sage,
      }
    } else if (data.color === 'amber') {
      return {
        bg: isMonet ? 'rgba(212, 165, 116, 0.15)' : 'rgba(251, 191, 36, 0.1)',
        border: isMonet ? 'rgba(212, 165, 116, 0.3)' : 'rgba(251, 191, 36, 0.3)',
        text: theme.amber,
      }
    } else {
      return {
        bg: isMonet ? 'rgba(232, 168, 152, 0.15)' : 'rgba(239, 68, 68, 0.1)',
        border: isMonet ? 'rgba(232, 168, 152, 0.3)' : 'rgba(239, 68, 68, 0.3)',
        text: theme.accent,
      }
    }
  }

  const colors = getResultColors()

  return (
    <div
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
      className="rounded-xl p-4 shadow-xl backdrop-blur min-w-[220px]"
    >
      <Handle type="target" position={Position.Left} style={{ background: colors.text }} className="!w-3 !h-3" />

      <div style={{ color: colors.text }} className="mb-2 text-xs font-medium uppercase tracking-wide">
        Maximum CPF Usable
      </div>

      <div style={{ color: theme.textPrimary }} className="text-2xl font-bold">
        {formatCurrency(data.actualUsable)}
      </div>

      <div className="mt-3 space-y-2 text-xs">
        <div className="flex justify-between" style={{ color: theme.textMuted }}>
          <span>Your OA:</span>
          <span>{formatCurrency(data.oaBalance)}</span>
        </div>
        <div className="flex justify-between" style={{ color: theme.textMuted }}>
          <span>Max Allowed:</span>
          <span>{formatCurrency(data.maxUsable)}</span>
        </div>
        <div style={{ borderColor: theme.surfaceBorder }} className="pt-2 border-t">
          <p style={{ color: theme.textSecondary }}>{data.reason}</p>
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
  const { theme, isMonet } = useTheme()
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
      // Bank loan - WL is max, but need BRS for VL->WL
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
      style: { stroke: theme.sage, strokeWidth: 2 },
    },
    {
      id: 'e-property-limits',
      source: 'property',
      target: 'limits',
      animated: true,
      style: { stroke: theme.purple, strokeWidth: 2 },
    },
    {
      id: 'e-cpf-result',
      source: 'cpf',
      target: 'result',
      animated: true,
      style: { stroke: theme.sage, strokeWidth: 2 },
    },
    {
      id: 'e-limits-result',
      source: 'limits',
      target: 'result',
      animated: true,
      style: { stroke: theme.purple, strokeWidth: 2 },
    },
  ], [theme])

  return (
    <div
      style={{
        background: isMonet ? theme.surfaceBg : '#0a0a0a',
        border: `1px solid ${theme.cardBorder}`,
      }}
      className={`h-[700px] rounded-xl ${className}`}
    >
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
        <Background color={isMonet ? theme.primaryLight : '#1e293b'} gap={20} size={1} />
        <Controls
          className={isMonet
            ? `!bg-white/80 !border-[rgba(155,139,180,0.2)] !rounded-lg [&>button]:!bg-white/90 [&>button]:!border-[rgba(155,139,180,0.2)] [&>button:hover]:!bg-white [&>button>svg]:!fill-[#6B6B6B]`
            : `!bg-slate-800 !border-white/10 !rounded-lg [&>button]:!bg-slate-700 [&>button]:!border-white/10 [&>button:hover]:!bg-slate-600 [&>button>svg]:!fill-white`
          }
        />
      </ReactFlow>

      {/* Summary Footer */}
      <div
        style={{ borderColor: theme.surfaceBorder }}
        className="flex items-center justify-between px-4 py-3 border-t text-sm"
      >
        <div className="flex gap-6">
          <div>
            <span style={{ color: theme.textMuted }}>Valuation Limit: </span>
            <span style={{ color: theme.purple }} className="font-medium">{formatCurrency(calculations.vl)}</span>
          </div>
          <div>
            <span style={{ color: theme.textMuted }}>Withdrawal Limit: </span>
            <span style={{ color: theme.purple }} className="font-medium">{formatCurrency(calculations.wl)}</span>
          </div>
          <div>
            <span style={{ color: theme.textMuted }}>Max Usable: </span>
            <span
              style={{ color: calculations.color === 'green' ? theme.sage : theme.amber }}
              className="font-medium"
            >
              {formatCurrency(calculations.actualUsable)}
            </span>
          </div>
        </div>
        <div style={{ color: theme.textMuted }} className="text-xs">
          BRS: {formatCurrency(BRS_2025)} (2025)
        </div>
      </div>
    </div>
  )
}
