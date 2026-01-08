'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  Handle,
  Position,
  Panel,
  useNodesState,
  useEdgesState,
  reconnectEdge,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { formatCurrency } from '@/lib/format'

// ============================================================================
// CONSTANTS
// ============================================================================

// CPF contribution rates by age (2025)
const CPF_RATES = {
  '35': { total: 0.37, employee: 0.20, employer: 0.17, oa: 0.23, sa: 0.06, ma: 0.08 },
  '45': { total: 0.37, employee: 0.20, employer: 0.17, oa: 0.21, sa: 0.07, ma: 0.09 },
  '50': { total: 0.37, employee: 0.20, employer: 0.17, oa: 0.19, sa: 0.08, ma: 0.10 },
  '55': { total: 0.37, employee: 0.20, employer: 0.17, oa: 0.15, sa: 0.115, ma: 0.105 },
  '60': { total: 0.295, employee: 0.15, employer: 0.145, oa: 0.12, sa: 0.035, ma: 0.105 },
  '65': { total: 0.205, employee: 0.095, employer: 0.11, oa: 0.035, sa: 0.025, ma: 0.105 },
  '70': { total: 0.165, employee: 0.075, employer: 0.09, oa: 0.035, sa: 0.01, ma: 0.08 },
} as const

const OW_CEILING = 7400
const FRS_2025 = 213000
// const BRS_2025 = 106500 // Available for property pledge option

// CPF LIFE payout factors (per $1,000 of RA balance)
const PAYOUT_FACTORS = {
  standard: { 65: 5.50, 66: 5.90, 67: 6.30, 68: 6.80, 69: 7.30, 70: 7.90 },
  basic: { 65: 5.00, 66: 5.40, 67: 5.80, 68: 6.20, 69: 6.70, 70: 7.20 },
  escalating: { 65: 4.40, 66: 4.70, 67: 5.00, 68: 5.40, 69: 5.80, 70: 6.30 },
} as const

type AgeGroup = keyof typeof CPF_RATES

function getAgeGroup(age: number): AgeGroup {
  if (age <= 35) return '35'
  if (age <= 45) return '45'
  if (age <= 50) return '50'
  if (age <= 55) return '55'
  if (age <= 60) return '60'
  if (age <= 65) return '65'
  return '70'
}

// ============================================================================
// SECTION BOUNDARY NODE
// ============================================================================

function SectionNode({ data }: { data: { label: string; color: string; width: number; height: number } }) {
  const borderColor = {
    emerald: 'border-emerald-500/30',
    blue: 'border-blue-500/30',
    violet: 'border-violet-500/30',
    amber: 'border-amber-500/30',
    purple: 'border-purple-500/30',
  }[data.color] || 'border-white/10'

  const bgColor = {
    emerald: 'bg-emerald-500/5',
    blue: 'bg-blue-500/5',
    violet: 'bg-violet-500/5',
    amber: 'bg-amber-500/5',
    purple: 'bg-purple-500/5',
  }[data.color] || 'bg-white/5'

  const textColor = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    violet: 'text-violet-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
  }[data.color] || 'text-white'

  return (
    <div
      className={`rounded-2xl border-2 border-dashed ${borderColor} ${bgColor} pointer-events-none`}
      style={{ width: data.width, height: data.height }}
    >
      <div className={`absolute -top-3 left-4 px-2 text-xs font-semibold uppercase tracking-wider ${textColor} bg-[#0a0a0a]`}>
        {data.label}
      </div>
    </div>
  )
}

// ============================================================================
// STAGE 1: SALARY INPUT NODE
// ============================================================================

function SalaryInputNode({ data }: { data: {
  salary: number
  age: number
  onChange: (field: string, value: number) => void
}}) {
  return (
    <div className={`min-w-[180px]
rounded-xl border border-white/[0.08]
bg-[#0f1728]/95
shadow-xl backdrop-blur`}>
      {/* Handles on all 4 sides */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-emerald-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-emerald-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-emerald-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-emerald-500 !w-3 !h-3" />

      {/* Drag handle area */}
      <div className={`px-4 pt-3 pb-2
border-b border-white/[0.06]
cursor-move
drag-handle`}>
        <div className={`text-xs font-medium tracking-wide text-emerald-400
uppercase`}>
          Your Profile
        </div>
      </div>
      <div className="p-4 pt-3">

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Monthly Salary</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input
              type="number"
              value={data.salary}
              onChange={(e) => data.onChange('salary', Number(e.target.value))}
              className={`w-full
py-2 pl-7 pr-3
rounded-lg border border-white/[0.08] focus:border-emerald-500/50 focus:outline-none
bg-white/[0.02]
text-lg font-semibold text-white
transition`}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Current Age</label>
          <input
            type="number"
            value={data.age}
            onChange={(e) => data.onChange('age', Number(e.target.value))}
            min={21}
            max={70}
            className={`w-full
py-2 px-3
rounded-lg border border-white/[0.08] focus:border-emerald-500/50 focus:outline-none
bg-white/[0.02]
text-white
transition`}
          />
        </div>
      </div>
      </div>
    </div>
  )
}

// ============================================================================
// STAGE 1: CPF CONTRIBUTION NODE
// ============================================================================

function ContributionNode({ data }: { data: {
  oaContrib: number
  saContrib: number
  maContrib: number
  totalContrib: number
  employeeContrib: number
  takeHome: number
}}) {
  return (
    <div className={`min-w-[160px]
rounded-xl border border-emerald-500/30
bg-emerald-500/10
shadow-xl backdrop-blur`}>
      {/* Handles on all 4 sides */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-emerald-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-emerald-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-emerald-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-emerald-500 !w-3 !h-3" />

      <div className={`px-4 pt-3 pb-2
border-b border-emerald-500/20
cursor-move
drag-handle`}>
        <div className={`text-xs font-medium tracking-wide text-emerald-400
uppercase`}>
          Monthly CPF
        </div>
      </div>

      <div className="p-4 pt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-blue-400">OA:</span>
          <span className="text-white">{formatCurrency(data.oaContrib)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-emerald-400">SA:</span>
          <span className="text-white">{formatCurrency(data.saContrib)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-amber-400">MA:</span>
          <span className="text-white">{formatCurrency(data.maContrib)}</span>
        </div>
        <div className={`flex justify-between
pt-2
border-t border-white/10
font-medium`}>
          <span className="text-slate-300">Total:</span>
          <span className="text-white">{formatCurrency(data.totalContrib)}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>Take-home:</span>
          <span className="text-green-400">{formatCurrency(data.takeHome)}</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// STAGE 2: ACCUMULATED BALANCES NODE
// ============================================================================

function BalancesNode({ data }: { data: {
  oaBalance: number
  saBalance: number
  maBalance: number
  yearsWorked: number
  onChange: (field: string, value: number) => void
}}) {
  const total = data.oaBalance + data.saBalance + data.maBalance

  return (
    <div className={`min-w-[180px]
rounded-xl border border-blue-500/30
bg-blue-500/10
shadow-xl backdrop-blur`}>
      {/* Handles on all 4 sides */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-blue-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-blue-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-blue-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-blue-500 !w-3 !h-3" />

      <div className={`px-4 pt-3 pb-2
border-b border-blue-500/20
cursor-move
drag-handle`}>
        <div className="text-xs font-medium uppercase tracking-wide text-blue-400">
          Balances at 55
        </div>
      </div>

      <div className="p-4 pt-3 space-y-2">
        <div>
          <label className="text-xs text-slate-500">OA Balance</label>
          <div className="relative">
            <span className={`absolute left-2 top-1/2
text-slate-400 text-xs
-translate-y-1/2`}>$</span>
            <input
              type="number"
              value={data.oaBalance}
              onChange={(e) => data.onChange('oaBalance', Number(e.target.value))}
              className={`w-full
py-1 pl-5 pr-2
rounded border border-white/[0.08] focus:border-blue-500/50 focus:outline-none
bg-white/[0.02]
text-sm text-blue-300`}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500">SA Balance</label>
          <div className="relative">
            <span className={`absolute left-2 top-1/2
text-slate-400 text-xs
-translate-y-1/2`}>$</span>
            <input
              type="number"
              value={data.saBalance}
              onChange={(e) => data.onChange('saBalance', Number(e.target.value))}
              className={`w-full
py-1 pl-5 pr-2
rounded border border-white/[0.08] focus:border-emerald-500/50 focus:outline-none
bg-white/[0.02]
text-sm text-emerald-300`}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500">MA Balance</label>
          <div className="relative">
            <span className={`absolute left-2 top-1/2
text-slate-400 text-xs
-translate-y-1/2`}>$</span>
            <input
              type="number"
              value={data.maBalance}
              onChange={(e) => data.onChange('maBalance', Number(e.target.value))}
              className={`w-full
py-1 pl-5 pr-2
rounded border border-white/[0.08] focus:border-amber-500/50 focus:outline-none
bg-white/[0.02]
text-sm text-amber-300`}
            />
          </div>
        </div>
        <div className="pt-2 border-t border-white/10 flex justify-between text-sm">
          <span className="text-slate-400">Total:</span>
          <span className="font-medium text-white">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// STAGE 2: HOUSING NODE
// ============================================================================

function HousingNode({ data }: { data: {
  propertyPrice: number
  cpfUsedForHousing: number
  oaAfterHousing: number
  onChange: (field: string, value: number) => void
}}) {
  return (
    <div className={`min-w-[160px]
rounded-xl border border-violet-500/30
bg-violet-500/10
shadow-xl backdrop-blur`}>
      {/* Handles on all 4 sides */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-violet-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-violet-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-violet-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-violet-500 !w-3 !h-3" />

      <div className={`px-4 pt-3 pb-2
border-b border-violet-500/20
cursor-move
drag-handle`}>
        <div className="text-xs font-medium uppercase tracking-wide text-violet-400">
          Housing (Optional)
        </div>
      </div>

      <div className="p-4 pt-3 space-y-2">
        <div>
          <label className="text-xs text-slate-500">CPF Used for Property</label>
          <div className="relative">
            <span className={`absolute left-2 top-1/2
text-slate-400 text-xs
-translate-y-1/2`}>$</span>
            <input
              type="number"
              value={data.cpfUsedForHousing}
              onChange={(e) => data.onChange('cpfUsedForHousing', Number(e.target.value))}
              className={`w-full
py-1 pl-5 pr-2
rounded border border-white/[0.08] focus:border-violet-500/50 focus:outline-none
bg-white/[0.02]
text-sm text-violet-300`}
            />
          </div>
        </div>
        <div className="pt-2 border-t border-white/10 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>OA after housing:</span>
            <span className="text-blue-300">{formatCurrency(data.oaAfterHousing)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// STAGE 3: RA CREATION NODE
// ============================================================================

function RACreationNode({ data }: { data: {
  saBalance: number
  oaBalance: number
  saToRa: number
  oaToRa: number
  raBalance: number
  targetSum: number
  shortfall: number
}}) {
  const metTarget = data.shortfall <= 0

  return (
    <div className={`min-w-[180px]
rounded-xl border border-amber-500/30
bg-amber-500/10
shadow-xl backdrop-blur`}>
      {/* Handles on all 4 sides */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-amber-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-amber-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-amber-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-amber-500 !w-3 !h-3" />

      <div className={`px-4 pt-3 pb-2
border-b border-amber-500/20
cursor-move
drag-handle`}>
        <div className="text-xs font-medium uppercase tracking-wide text-amber-400">
          Age 55: RA Created
        </div>
      </div>

      <div className="p-4 pt-3 space-y-2 text-sm">
        <div className="text-xs text-slate-400">Transfers to RA:</div>
        <div className="flex justify-between">
          <span className="text-emerald-400">From SA:</span>
          <span className="text-white">{formatCurrency(data.saToRa)}</span>
        </div>
        {data.oaToRa > 0 && (
          <div className="flex justify-between">
            <span className="text-blue-400">From OA:</span>
            <span className="text-white">{formatCurrency(data.oaToRa)}</span>
          </div>
        )}
        <div className="pt-2 border-t border-white/10">
          <div className="flex justify-between font-medium">
            <span className="text-purple-400">RA Balance:</span>
            <span className="text-white">{formatCurrency(data.raBalance)}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-slate-400">Target (FRS):</span>
            <span className={metTarget ? 'text-emerald-400' : 'text-red-400'}>
              {formatCurrency(data.targetSum)}
            </span>
          </div>
          {!metTarget && (
            <div className="text-xs text-red-400 mt-1">
              Shortfall: {formatCurrency(data.shortfall)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// STAGE 4: CPF LIFE PAYOUT NODE
// ============================================================================

function PayoutNode({ data }: { data: {
  raBalance: number
  monthlyPayout: number
  yearlyPayout: number
  plan: string
}}) {
  return (
    <div className={`min-w-[160px]
rounded-xl border border-purple-500/30
bg-purple-500/10
shadow-xl backdrop-blur`}>
      {/* Handles on all 4 sides */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-purple-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-purple-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-purple-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-purple-500 !w-3 !h-3" />

      <div className={`px-4 pt-3 pb-2
border-b border-purple-500/20
cursor-move
drag-handle`}>
        <div className="text-xs font-medium uppercase tracking-wide text-purple-400">
          CPF LIFE (Age 65+)
        </div>
      </div>

      <div className="p-4 pt-3 space-y-2">
        <div className="text-2xl font-bold text-white">
          {formatCurrency(data.monthlyPayout)}
          <span className="text-sm text-slate-400 font-normal">/mo</span>
        </div>
        <div className="text-sm text-slate-400">
          {formatCurrency(data.yearlyPayout)}/year
        </div>
        <div className="pt-2 border-t border-white/10 text-xs">
          <span className="text-slate-400">Plan: </span>
          <span className="text-purple-300 capitalize">{data.plan}</span>
        </div>
        <div className="text-xs text-emerald-400">
          Payouts for life
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// STAGE 4: REMAINING BALANCES NODE
// ============================================================================

function RemainingNode({ data }: { data: {
  oaRemaining: number
  maRemaining: number
  withdrawable: number
}}) {
  return (
    <div className={`min-w-[140px]
rounded-xl border border-green-500/30
bg-green-500/10
shadow-xl backdrop-blur`}>
      {/* Handles on all 4 sides */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-green-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-green-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-green-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-green-500 !w-3 !h-3" />

      <div className={`px-4 pt-3 pb-2
border-b border-green-500/20
cursor-move
drag-handle`}>
        <div className="text-xs font-medium uppercase tracking-wide text-green-400">
          Other Balances
        </div>
      </div>

      <div className="p-4 pt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-blue-400">OA:</span>
          <span className="text-white">{formatCurrency(data.oaRemaining)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-amber-400">MA:</span>
          <span className="text-white">{formatCurrency(data.maRemaining)}</span>
        </div>
        {data.withdrawable > 0 && (
          <div className="pt-2 border-t border-white/10">
            <div className="text-xs text-slate-400">Withdrawable:</div>
            <div className="text-lg font-bold text-green-400">
              {formatCurrency(data.withdrawable)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// NODE TYPES
// ============================================================================

const nodeTypes = {
  section: SectionNode,
  salaryInput: SalaryInputNode,
  contribution: ContributionNode,
  balances: BalancesNode,
  housing: HousingNode,
  raCreation: RACreationNode,
  payout: PayoutNode,
  remaining: RemainingNode,
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CPFJourneyCalculatorProps {
  className?: string
}

export function CPFJourneyCalculator({ className }: CPFJourneyCalculatorProps) {
  // Input state
  const [salary, setSalary] = useState(6000)
  const [age, setAge] = useState(30)
  const [oaBalance, setOaBalance] = useState(150000)
  const [saBalance, setSaBalance] = useState(80000)
  const [maBalance, setMaBalance] = useState(50000)
  const [cpfUsedForHousing, setCpfUsedForHousing] = useState(100000)

  const handleChange = useCallback((field: string, value: number) => {
    switch (field) {
      case 'salary': setSalary(value); break
      case 'age': setAge(value); break
      case 'oaBalance': setOaBalance(value); break
      case 'saBalance': setSaBalance(value); break
      case 'maBalance': setMaBalance(value); break
      case 'cpfUsedForHousing': setCpfUsedForHousing(value); break
    }
  }, [])

  // Calculations
  const calculations = useMemo(() => {
    // Stage 1: Monthly contributions
    const ageGroup = getAgeGroup(age)
    const rates = CPF_RATES[ageGroup]
    const cappedWage = Math.min(salary, OW_CEILING)
    const totalContrib = cappedWage * rates.total
    const employeeContrib = cappedWage * rates.employee
    const oaContrib = cappedWage * rates.oa
    const saContrib = cappedWage * rates.sa
    const maContrib = cappedWage * rates.ma
    const takeHome = salary - employeeContrib

    // Stage 2: Housing impact
    const oaAfterHousing = Math.max(0, oaBalance - cpfUsedForHousing)

    // Stage 3: RA Creation at 55
    const targetSum = FRS_2025
    const saToRa = Math.min(saBalance, targetSum)
    const remainingNeeded = Math.max(0, targetSum - saToRa)
    const oaToRa = Math.min(oaAfterHousing, remainingNeeded)
    const raBalance = saToRa + oaToRa
    const shortfall = Math.max(0, targetSum - raBalance)

    // Stage 4: Remaining balances
    const oaRemaining = oaAfterHousing - oaToRa
    const maRemaining = maBalance
    const withdrawable = shortfall === 0 ? oaRemaining : 0

    // Stage 4: CPF LIFE payouts (Standard plan at 65)
    const monthlyPayout = (raBalance / 1000) * PAYOUT_FACTORS.standard[65]
    const yearlyPayout = monthlyPayout * 12

    return {
      // Stage 1
      oaContrib, saContrib, maContrib, totalContrib, employeeContrib, takeHome,
      // Stage 2
      oaAfterHousing,
      // Stage 3
      saToRa, oaToRa, raBalance, targetSum, shortfall,
      // Stage 4
      oaRemaining, maRemaining, withdrawable, monthlyPayout, yearlyPayout,
    }
  }, [salary, age, oaBalance, saBalance, maBalance, cpfUsedForHousing])

  // Layout positions
  const sectionY = 0
  const nodeY = 50

  // Initial nodes (only created once)
  const initialNodes: Node[] = useMemo(() => [
    // Section boundaries (background)
    {
      id: 'section-1',
      type: 'section',
      position: { x: 0, y: sectionY },
      data: { label: '1. Monthly Contributions', color: 'emerald', width: 380, height: 280 },
      draggable: false,
      selectable: false,
      zIndex: -1,
    },
    {
      id: 'section-2',
      type: 'section',
      position: { x: 400, y: sectionY },
      data: { label: '2. Accumulated Balances', color: 'blue', width: 420, height: 280 },
      draggable: false,
      selectable: false,
      zIndex: -1,
    },
    {
      id: 'section-3',
      type: 'section',
      position: { x: 840, y: sectionY },
      data: { label: '3. Age 55 (RA Creation)', color: 'amber', width: 220, height: 280 },
      draggable: false,
      selectable: false,
      zIndex: -1,
    },
    {
      id: 'section-4',
      type: 'section',
      position: { x: 1080, y: sectionY },
      data: { label: '4. Retirement (65+)', color: 'purple', width: 340, height: 280 },
      draggable: false,
      selectable: false,
      zIndex: -1,
    },
    // Stage 1: Salary & Contributions
    {
      id: 'salary',
      type: 'salaryInput',
      position: { x: 20, y: nodeY },
      data: { salary: 6000, age: 30, onChange: () => {} },
      dragHandle: '.drag-handle',
    },
    {
      id: 'contribution',
      type: 'contribution',
      position: { x: 210, y: nodeY },
      data: { oaContrib: 0, saContrib: 0, maContrib: 0, totalContrib: 0, employeeContrib: 0, takeHome: 0 },
      dragHandle: '.drag-handle',
    },
    // Stage 2: Balances & Housing
    {
      id: 'balances',
      type: 'balances',
      position: { x: 420, y: nodeY },
      data: { oaBalance: 150000, saBalance: 80000, maBalance: 50000, yearsWorked: 25, onChange: () => {} },
      dragHandle: '.drag-handle',
    },
    {
      id: 'housing',
      type: 'housing',
      position: { x: 620, y: nodeY + 120 },
      data: { propertyPrice: 500000, cpfUsedForHousing: 100000, oaAfterHousing: 50000, onChange: () => {} },
      dragHandle: '.drag-handle',
    },
    // Stage 3: RA Creation
    {
      id: 'ra-creation',
      type: 'raCreation',
      position: { x: 860, y: nodeY },
      data: { saBalance: 80000, oaBalance: 50000, saToRa: 80000, oaToRa: 50000, raBalance: 130000, targetSum: 213000, shortfall: 83000 },
      dragHandle: '.drag-handle',
    },
    // Stage 4: CPF LIFE & Remaining
    {
      id: 'payout',
      type: 'payout',
      position: { x: 1100, y: nodeY },
      data: { raBalance: 130000, monthlyPayout: 715, yearlyPayout: 8580, plan: 'standard' },
      dragHandle: '.drag-handle',
    },
    {
      id: 'remaining',
      type: 'remaining',
      position: { x: 1270, y: nodeY },
      data: { oaRemaining: 0, maRemaining: 50000, withdrawable: 0 },
      dragHandle: '.drag-handle',
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []) // Only create once

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)

  // Update node data when calculations change (preserving positions)
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        switch (node.id) {
          case 'salary':
            return { ...node, data: { salary, age, onChange: handleChange } }
          case 'contribution':
            return {
              ...node,
              data: {
                oaContrib: calculations.oaContrib,
                saContrib: calculations.saContrib,
                maContrib: calculations.maContrib,
                totalContrib: calculations.totalContrib,
                employeeContrib: calculations.employeeContrib,
                takeHome: calculations.takeHome,
              },
            }
          case 'balances':
            return {
              ...node,
              data: { oaBalance, saBalance, maBalance, yearsWorked: 55 - age, onChange: handleChange },
            }
          case 'housing':
            return {
              ...node,
              data: {
                propertyPrice: 500000,
                cpfUsedForHousing,
                oaAfterHousing: calculations.oaAfterHousing,
                onChange: handleChange,
              },
            }
          case 'ra-creation':
            return {
              ...node,
              data: {
                saBalance,
                oaBalance: calculations.oaAfterHousing,
                saToRa: calculations.saToRa,
                oaToRa: calculations.oaToRa,
                raBalance: calculations.raBalance,
                targetSum: calculations.targetSum,
                shortfall: calculations.shortfall,
              },
            }
          case 'payout':
            return {
              ...node,
              data: {
                raBalance: calculations.raBalance,
                monthlyPayout: calculations.monthlyPayout,
                yearlyPayout: calculations.yearlyPayout,
                plan: 'standard',
              },
            }
          case 'remaining':
            return {
              ...node,
              data: {
                oaRemaining: calculations.oaRemaining,
                maRemaining: calculations.maRemaining,
                withdrawable: calculations.withdrawable,
              },
            }
          default:
            return node
        }
      })
    )
  }, [salary, age, oaBalance, saBalance, maBalance, cpfUsedForHousing, calculations, handleChange, setNodes])

  const initialEdges: Edge[] = useMemo(() => [
    // Stage 1 connections
    {
      id: 'e-salary-contrib',
      source: 'salary',
      sourceHandle: 'right',
      target: 'contribution',
      targetHandle: 'left',
      animated: true,
      reconnectable: true,
      style: { stroke: '#10b981', strokeWidth: 2 },
    },
    // Stage 1 → 2
    {
      id: 'e-contrib-balances',
      source: 'contribution',
      sourceHandle: 'right',
      target: 'balances',
      targetHandle: 'left',
      animated: true,
      reconnectable: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      label: 'Years of saving',
      labelStyle: { fill: '#64748b', fontSize: 10 },
      labelBgStyle: { fill: '#0a0a0a', fillOpacity: 0.8 },
    },
    // Stage 2: Housing
    {
      id: 'e-balances-housing',
      source: 'balances',
      sourceHandle: 'bottom',
      target: 'housing',
      targetHandle: 'top',
      animated: true,
      reconnectable: true,
      style: { stroke: '#8b5cf6', strokeWidth: 2 },
    },
    // Stage 2 → 3
    {
      id: 'e-housing-ra',
      source: 'housing',
      sourceHandle: 'right',
      target: 'ra-creation',
      targetHandle: 'left',
      animated: true,
      reconnectable: true,
      style: { stroke: '#f59e0b', strokeWidth: 2 },
    },
    // Stage 3 → 4
    {
      id: 'e-ra-payout',
      source: 'ra-creation',
      sourceHandle: 'right',
      target: 'payout',
      targetHandle: 'left',
      animated: true,
      reconnectable: true,
      style: { stroke: '#a855f7', strokeWidth: 2 },
      label: 'CPF LIFE',
      labelStyle: { fill: '#a855f7', fontSize: 10 },
      labelBgStyle: { fill: '#0a0a0a', fillOpacity: 0.8 },
    },
    {
      id: 'e-ra-remaining',
      source: 'ra-creation',
      sourceHandle: 'right',
      target: 'remaining',
      targetHandle: 'left',
      animated: true,
      reconnectable: true,
      style: { stroke: '#22c55e', strokeWidth: 2 },
    },
  ], [])

  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Handle edge reconnection
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els))
    },
    [setEdges]
  )

  // Handle new connections
  const onConnect = useCallback(
    (connection: { source: string | null; target: string | null; sourceHandle?: string | null; targetHandle?: string | null }) => {
      if (connection.source && connection.target) {
        const newEdge: Edge = {
          id: `e-${connection.source}-${connection.target}-${Date.now()}`,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle ?? undefined,
          targetHandle: connection.targetHandle ?? undefined,
          animated: true,
          style: { stroke: '#64748b', strokeWidth: 2 },
        }
        setEdges((eds) => [...eds, newEdge])
      }
    },
    [setEdges]
  )

  return (
    <div className={`h-[700px] rounded-xl border border-white/[0.08] bg-[#0a0a0a] ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={1.5}
        edgesReconnectable
        defaultEdgeOptions={{
          type: 'smoothstep',
          reconnectable: true,
        }}
        connectionLineStyle={{ stroke: '#64748b', strokeWidth: 2 }}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls
          className={`!bg-slate-800 !border-white/10 !rounded-lg [&>button]:!bg-slate-700 [&>button]:!border-white/10 [&>button:hover]:!bg-slate-600 [&>button>svg]:!fill-white`}
        />
        <Panel position="top-right" className="bg-slate-800/80 rounded-lg p-2 text-xs text-slate-400">
          Drag nodes • Drag connectors • Scroll to zoom
        </Panel>
      </ReactFlow>

      {/* Summary Footer */}
      <div className={`flex items-center justify-between
px-4 py-3
border-t border-white/[0.06]
text-sm`}>
        <div className="flex gap-4">
          <div>
            <span className="text-slate-400">Monthly CPF: </span>
            <span className="font-medium text-emerald-400">{formatCurrency(calculations.totalContrib)}</span>
          </div>
          <div>
            <span className="text-slate-400">RA at 55: </span>
            <span className="font-medium text-purple-400">{formatCurrency(calculations.raBalance)}</span>
          </div>
          <div>
            <span className="text-slate-400">Monthly Payout: </span>
            <span className="font-medium text-purple-400">{formatCurrency(calculations.monthlyPayout)}</span>
          </div>
          <div>
            <span className="text-slate-400">Withdrawable: </span>
            <span className="font-medium text-green-400">{formatCurrency(calculations.withdrawable)}</span>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          FRS: {formatCurrency(FRS_2025)} (2025)
        </div>
      </div>
    </div>
  )
}
