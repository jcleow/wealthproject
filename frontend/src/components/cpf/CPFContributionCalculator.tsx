'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
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
import { ChevronDown, Check, GitBranch, BarChart3, Workflow } from 'lucide-react'
import clsx from 'clsx'

import { formatCurrency } from '@/lib/format'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { CPFContributionSankey } from './CPFContributionSankey'
import { CPFContributionWaterfall } from './CPFContributionWaterfall'
import { useTheme, type AppTheme } from '@/lib/theme'

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

type AgeGroup = keyof typeof CPF_RATES
type VisualizationMode = 'flow' | 'sankey' | 'waterfall'

function getAgeGroup(age: number): AgeGroup {
  if (age <= 35) return '35'
  if (age <= 45) return '45'
  if (age <= 50) return '50'
  if (age <= 55) return '55'
  if (age <= 60) return '60'
  if (age <= 65) return '65'
  return '70'
}

// OW ceiling for 2025
const OW_CEILING = 7400

// Visualization mode options
const VISUALIZATION_MODES: { id: VisualizationMode; label: string; icon: typeof Workflow; description: string }[] = [
  { id: 'flow', label: 'Flow', icon: Workflow, description: 'Interactive node diagram' },
  { id: 'sankey', label: 'Sankey', icon: GitBranch, description: 'Proportional flow widths' },
  { id: 'waterfall', label: 'Waterfall', icon: BarChart3, description: 'Step-by-step breakdown' },
]

// Custom dropdown for CPF Contribution selects
function ContributionDropdown({
  value,
  onChange,
  options,
  theme,
  isMonet,
}: {
  value: number
  onChange: (value: number) => void
  options: { value: number; label: string }[]
  theme: AppTheme
  isMonet: boolean
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
        className="w-full flex items-center justify-between py-2 px-3 rounded-lg transition"
        style={{
          background: theme.controlBg,
          border: `1px solid ${isOpen ? theme.sage : theme.controlBorder}`,
          color: theme.textPrimary,
        }}
      >
        <span>{selectedOption?.label ?? ''}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: theme.textMuted }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-[100] mt-1 w-full rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          style={{
            background: isMonet ? 'rgba(255, 255, 255, 0.98)' : '#0c0c0c',
            border: `1px solid ${theme.cardBorderHover}`,
          }}
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
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-all duration-150"
                  style={{
                    background: isSelected ? (isMonet ? 'rgba(127, 178, 133, 0.15)' : 'rgba(16, 185, 129, 0.15)') : 'transparent',
                    color: isSelected ? theme.textPrimary : theme.textSecondary,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = theme.hoverBg
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <span className="w-4 shrink-0">
                    {isSelected && <Check className="h-3.5 w-3.5" style={{ color: theme.sage }} />}
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

// Standalone input panel (used for Sankey and Waterfall modes)
function InputPanel({
  salary,
  age,
  rates,
  cappedWage,
  onSalaryChange,
  onAgeChange,
  theme,
  isMonet,
}: {
  salary: number
  age: number
  rates: { total: number; employee: number; employer: number; oa: number; sa: number; ma: number }
  cappedWage: number
  onSalaryChange: (value: number) => void
  onAgeChange: (value: number) => void
  theme: AppTheme
  isMonet: boolean
}) {
  return (
    <div
      className="flex items-start gap-6 px-4 py-3"
      style={{ borderBottom: `1px solid ${theme.surfaceBorder}` }}
    >
      {/* Salary Input */}
      <div className="flex-1 max-w-[200px]">
        <label className="mb-1 block text-xs" style={{ color: theme.textMuted }}>Gross Salary</label>
        <CurrencyInput
          value={salary}
          onChange={onSalaryChange}
          size="sm"
        />
      </div>

      {/* Age Dropdown */}
      <div className="flex-1 max-w-[160px]">
        <label className="mb-1 block text-xs" style={{ color: theme.textMuted }}>Your Age</label>
        <ContributionDropdown
          value={age}
          onChange={onAgeChange}
          options={[
            { value: 30, label: '35 or below' },
            { value: 40, label: '36-45' },
            { value: 48, label: '46-50' },
            { value: 52, label: '51-55' },
            { value: 58, label: '56-60' },
            { value: 62, label: '61-65' },
            { value: 68, label: '66-70' },
            { value: 72, label: 'Above 70' },
          ]}
          theme={theme}
          isMonet={isMonet}
        />
      </div>

      {/* Rates Display */}
      <div className="flex gap-4 items-center text-sm">
        <div
          className="px-3 py-2 rounded-lg"
          style={{
            background: isMonet ? 'rgba(168, 135, 179, 0.1)' : 'rgba(139, 92, 246, 0.1)',
            border: `1px solid ${isMonet ? 'rgba(168, 135, 179, 0.2)' : 'rgba(139, 92, 246, 0.2)'}`,
          }}
        >
          <span className="text-xs" style={{ color: theme.textMuted }}>Total Rate</span>
          <p className="font-medium" style={{ color: theme.purple }}>{(rates.total * 100).toFixed(1)}%</p>
        </div>
        <div
          className="px-3 py-2 rounded-lg"
          style={{
            background: theme.surfaceBg,
            border: `1px solid ${theme.surfaceBorder}`,
          }}
        >
          <span className="text-xs" style={{ color: theme.textMuted }}>Capped Wage</span>
          <p className="font-medium" style={{ color: theme.textPrimary }}>{formatCurrency(cappedWage)}</p>
          {cappedWage >= OW_CEILING && (
            <span className="text-xs" style={{ color: theme.amber }}>At ceiling</span>
          )}
        </div>
      </div>
    </div>
  )
}

// Custom Node: Salary Input (for Flow mode)
function SalaryInputNode({ data }: { data: { salary: number; age: number; onChange: (salary: number, age: number) => void; theme: AppTheme; isMonet: boolean } }) {
  const { theme, isMonet } = data
  return (
    <div
      className="min-w-[200px] p-4 rounded-xl shadow-xl backdrop-blur"
      style={{
        background: isMonet ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 40, 0.95)',
        border: `1px solid ${theme.controlBorder}`,
      }}
    >
      <div
        className="mb-3 text-xs font-medium tracking-wide uppercase"
        style={{ color: theme.sage }}
      >
        Monthly Salary
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs" style={{ color: theme.textMuted }}>Gross Salary</label>
          <CurrencyInput
            value={data.salary}
            onChange={(val) => data.onChange(val, data.age)}
            size="sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs" style={{ color: theme.textMuted }}>Your Age</label>
          <ContributionDropdown
            value={data.age}
            onChange={(val) => data.onChange(data.salary, val)}
            options={[
              { value: 30, label: '35 or below' },
              { value: 40, label: '36-45' },
              { value: 48, label: '46-50' },
              { value: 52, label: '51-55' },
              { value: 58, label: '56-60' },
              { value: 62, label: '61-65' },
              { value: 68, label: '66-70' },
              { value: 72, label: 'Above 70' },
            ]}
            theme={theme}
            isMonet={isMonet}
          />
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!w-3 !h-3" style={{ background: theme.sage }} />
    </div>
  )
}

// Custom Node: CPF Calculator (middle)
function CalculatorNode({ data }: { data: { rates: typeof CPF_RATES['35']; cappedWage: number; theme: AppTheme; isMonet: boolean } }) {
  const { theme, isMonet } = data
  return (
    <div
      className="min-w-[180px] p-4 rounded-xl shadow-xl backdrop-blur"
      style={{
        background: isMonet ? 'rgba(168, 135, 179, 0.1)' : 'rgba(139, 92, 246, 0.1)',
        border: `1px solid ${isMonet ? 'rgba(168, 135, 179, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
      }}
    >
      <Handle type="target" position={Position.Left} className="!w-3 !h-3" style={{ background: theme.purple }} />

      <div
        className="mb-2 text-xs font-medium tracking-wide uppercase"
        style={{ color: theme.purple }}
      >
        CPF Calculator
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span style={{ color: theme.textMuted }}>Total Rate:</span>
          <span className="font-medium" style={{ color: theme.textPrimary }}>{(data.rates.total * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: theme.textMuted }}>Employee:</span>
          <span style={{ color: theme.textSecondary }}>{(data.rates.employee * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: theme.textMuted }}>Employer:</span>
          <span style={{ color: theme.textSecondary }}>{(data.rates.employer * 100).toFixed(1)}%</span>
        </div>
        <div className="pt-2 mt-2" style={{ borderTop: `1px solid ${theme.surfaceBorder}` }}>
          <div className="flex justify-between text-xs">
            <span style={{ color: theme.textMuted }}>Capped Wage:</span>
            <span style={{ color: theme.purpleLight }}>{formatCurrency(data.cappedWage)}</span>
          </div>
          {data.cappedWage < 7400 && (
            <p className="text-xs mt-1" style={{ color: theme.textMuted }}>Below OW ceiling</p>
          )}
          {data.cappedWage >= 7400 && (
            <p className="text-xs mt-1" style={{ color: theme.amber }}>Capped at $7,400</p>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!w-3 !h-3" style={{ background: theme.purple }} />
    </div>
  )
}

// Custom Node: CPF Account Output
function AccountNode({ data }: { data: { label: string; amount: number; rate: number; color: string; description: string; theme: AppTheme; isMonet: boolean } }) {
  const { theme, isMonet } = data
  const colorMap = {
    blue: {
      border: isMonet ? 'rgba(123, 163, 201, 0.3)' : 'rgba(59, 130, 246, 0.3)',
      bg: isMonet ? 'rgba(123, 163, 201, 0.1)' : 'rgba(59, 130, 246, 0.1)',
      text: theme.blue,
    },
    emerald: {
      border: isMonet ? 'rgba(127, 178, 133, 0.3)' : 'rgba(16, 185, 129, 0.3)',
      bg: isMonet ? 'rgba(127, 178, 133, 0.1)' : 'rgba(16, 185, 129, 0.1)',
      text: theme.sage,
    },
    amber: {
      border: isMonet ? 'rgba(212, 165, 116, 0.3)' : 'rgba(245, 158, 11, 0.3)',
      bg: isMonet ? 'rgba(212, 165, 116, 0.1)' : 'rgba(245, 158, 11, 0.1)',
      text: theme.amber,
    },
    green: {
      border: isMonet ? 'rgba(127, 178, 133, 0.3)' : 'rgba(34, 197, 94, 0.3)',
      bg: isMonet ? 'rgba(127, 178, 133, 0.1)' : 'rgba(34, 197, 94, 0.1)',
      text: theme.sage,
    },
  }
  const colors = colorMap[data.color as keyof typeof colorMap] || {
    border: theme.cardBorder,
    bg: theme.surfaceBg,
    text: theme.textPrimary,
  }

  return (
    <div
      className="rounded-xl p-4 shadow-xl backdrop-blur min-w-[160px]"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      <Handle type="target" position={Position.Left} className="!w-3 !h-3" style={{ background: colors.text }} />

      <div className="mb-1 text-xs font-medium uppercase tracking-wide" style={{ color: colors.text }}>
        {data.label}
      </div>

      <div className="text-2xl font-bold" style={{ color: theme.textPrimary }}>
        {formatCurrency(data.amount)}
      </div>

      <div className="mt-2 text-xs" style={{ color: theme.textMuted }}>
        {(data.rate * 100).toFixed(1)}% of wage
      </div>

      <div className="mt-1 text-xs" style={{ color: theme.textMuted }}>
        {data.description}
      </div>
    </div>
  )
}

// Custom Node: Take-home Pay
function TakeHomeNode({ data }: { data: { grossSalary: number; employeeContrib: number; theme: AppTheme; isMonet: boolean } }) {
  const { theme, isMonet } = data
  const takeHome = data.grossSalary - data.employeeContrib

  return (
    <div
      className="min-w-[180px] p-4 rounded-xl shadow-xl backdrop-blur"
      style={{
        background: isMonet ? 'rgba(127, 178, 133, 0.1)' : 'rgba(34, 197, 94, 0.1)',
        border: `1px solid ${isMonet ? 'rgba(127, 178, 133, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
      }}
    >
      <Handle type="target" position={Position.Left} className="!w-3 !h-3" style={{ background: theme.sage }} />

      <div
        className="mb-1 text-xs font-medium tracking-wide uppercase"
        style={{ color: theme.sage }}
      >
        Take-Home Pay
      </div>

      <div className="text-2xl font-bold" style={{ color: theme.textPrimary }}>
        {formatCurrency(takeHome)}
      </div>

      <div className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between" style={{ color: theme.textMuted }}>
          <span>Gross:</span>
          <span>{formatCurrency(data.grossSalary)}</span>
        </div>
        <div className="flex justify-between" style={{ color: theme.coralRose }}>
          <span>CPF (Employee):</span>
          <span>-{formatCurrency(data.employeeContrib)}</span>
        </div>
      </div>
    </div>
  )
}

const nodeTypes = {
  salaryInput: SalaryInputNode,
  calculator: CalculatorNode,
  account: AccountNode,
  takeHome: TakeHomeNode,
}

interface CPFContributionCalculatorProps {
  className?: string
}

export function CPFContributionCalculator({ className }: CPFContributionCalculatorProps) {
  const { theme, isMonet } = useTheme()
  const [salary, setSalary] = useState(5000)
  const [age, setAge] = useState(30)
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('flow')

  const handleChange = useCallback((newSalary: number, newAge: number) => {
    setSalary(newSalary)
    setAge(newAge)
  }, [])

  const calculations = useMemo(() => {
    const ageGroup = getAgeGroup(age)
    const rates = CPF_RATES[ageGroup]
    const cappedWage = Math.min(salary, OW_CEILING)

    const totalContrib = cappedWage * rates.total
    const employeeContrib = cappedWage * rates.employee
    const employerContrib = cappedWage * rates.employer
    const oaContrib = cappedWage * rates.oa
    const saContrib = cappedWage * rates.sa
    const maContrib = cappedWage * rates.ma

    return {
      rates,
      cappedWage,
      totalContrib,
      employeeContrib,
      employerContrib,
      oaContrib,
      saContrib,
      maContrib,
    }
  }, [salary, age])

  const nodes: Node[] = useMemo(() => [
    {
      id: 'salary',
      type: 'salaryInput',
      position: { x: -300, y: 93 },
      data: { salary, age, onChange: handleChange, theme, isMonet },
    },
    {
      id: 'calculator',
      type: 'calculator',
      position: { x: 280, y: 100 },
      data: { rates: calculations.rates, cappedWage: calculations.cappedWage, theme, isMonet },
    },
    {
      id: 'oa',
      type: 'account',
      position: { x: 580, y: -20 },
      data: {
        label: 'Ordinary Account (OA)',
        amount: calculations.oaContrib,
        rate: calculations.rates.oa,
        color: 'blue',
        description: 'Housing, education, investment',
        theme,
        isMonet,
      },
    },
    {
      id: 'sa',
      type: 'account',
      position: { x: 580, y: 130 },
      data: {
        label: 'Special Account (SA)',
        amount: calculations.saContrib,
        rate: calculations.rates.sa,
        color: 'emerald',
        description: 'Retirement savings',
        theme,
        isMonet,
      },
    },
    {
      id: 'ma',
      type: 'account',
      position: { x: 580, y: 280 },
      data: {
        label: 'MediSave Account (MA)',
        amount: calculations.maContrib,
        rate: calculations.rates.ma,
        color: 'amber',
        description: 'Healthcare expenses',
        theme,
        isMonet,
      },
    },
    {
      id: 'takehome',
      type: 'takeHome',
      position: { x: 280, y: 420 },
      data: {
        grossSalary: salary,
        employeeContrib: calculations.employeeContrib,
        theme,
        isMonet,
      },
    },
  ], [salary, age, calculations, handleChange, theme, isMonet])

  const edges: Edge[] = useMemo(() => [
    {
      id: 'e-salary-calc',
      source: 'salary',
      target: 'calculator',
      animated: true,
      style: { stroke: theme.purple, strokeWidth: 2 },
    },
    {
      id: 'e-calc-oa',
      source: 'calculator',
      target: 'oa',
      animated: true,
      style: { stroke: theme.blue, strokeWidth: 2 },
    },
    {
      id: 'e-calc-sa',
      source: 'calculator',
      target: 'sa',
      animated: true,
      style: { stroke: theme.sage, strokeWidth: 2 },
    },
    {
      id: 'e-calc-ma',
      source: 'calculator',
      target: 'ma',
      animated: true,
      style: { stroke: theme.amber, strokeWidth: 2 },
    },
    {
      id: 'e-salary-takehome',
      source: 'salary',
      target: 'takehome',
      animated: true,
      style: { stroke: theme.sage, strokeWidth: 2 },
    },
  ], [theme])

  return (
    <div
      className={`flex flex-col h-[700px] rounded-xl ${className}`}
      style={{
        background: isMonet ? 'rgba(255, 255, 255, 0.7)' : '#0a0a0a',
        border: `1px solid ${theme.cardBorder}`,
      }}
    >
      {/* Mode Toggle Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${theme.surfaceBorder}` }}
      >
        <h3 className="text-sm font-medium" style={{ color: theme.textPrimary }}>CPF Contribution Flow</h3>

        {/* Visualization Mode Toggle */}
        <div
          className="inline-flex rounded-lg p-0.5"
          style={{
            background: theme.controlBg,
            border: `1px solid ${theme.controlBorder}`,
          }}
        >
          {VISUALIZATION_MODES.map((mode) => {
            const Icon = mode.icon
            const isActive = visualizationMode === mode.id
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setVisualizationMode(mode.id)}
                title={mode.description}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                )}
                style={{
                  background: isActive ? theme.activeBg : 'transparent',
                  color: isActive ? theme.textPrimary : theme.textMuted,
                  boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {mode.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Input Panel for non-flow modes */}
      {visualizationMode !== 'flow' && (
        <InputPanel
          salary={salary}
          age={age}
          rates={calculations.rates}
          cappedWage={calculations.cappedWage}
          onSalaryChange={(val) => setSalary(val)}
          onAgeChange={(val) => setAge(val)}
          theme={theme}
          isMonet={isMonet}
        />
      )}

      {/* Visualization Content */}
      <div className="flex-1 min-h-0">
        {visualizationMode === 'flow' && (
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
            <Background color={isMonet ? '#9B8BB4' : '#1e293b'} gap={20} size={1} />
            <Controls
              className={isMonet
                ? '!bg-white/90 !border-[rgba(155,139,180,0.2)] !rounded-lg [&>button]:!bg-white [&>button]:!border-[rgba(155,139,180,0.2)] [&>button:hover]:!bg-[rgba(155,139,180,0.1)] [&>button>svg]:!fill-[#3D3D3D]'
                : '!bg-slate-800 !border-white/10 !rounded-lg [&>button]:!bg-slate-700 [&>button]:!border-white/10 [&>button:hover]:!bg-slate-600 [&>button>svg]:!fill-white'
              }
            />
          </ReactFlow>
        )}

        {visualizationMode === 'sankey' && (
          <CPFContributionSankey
            salary={salary}
            cappedWage={calculations.cappedWage}
            employeeContrib={calculations.employeeContrib}
            employerContrib={calculations.employerContrib}
            oaContrib={calculations.oaContrib}
            saContrib={calculations.saContrib}
            maContrib={calculations.maContrib}
            className="h-full"
          />
        )}

        {visualizationMode === 'waterfall' && (
          <CPFContributionWaterfall
            salary={salary}
            cappedWage={calculations.cappedWage}
            employeeContrib={calculations.employeeContrib}
            employerContrib={calculations.employerContrib}
            oaContrib={calculations.oaContrib}
            saContrib={calculations.saContrib}
            maContrib={calculations.maContrib}
            activeView="salary"
            className="h-full"
          />
        )}
      </div>

      {/* Summary Footer (only for flow mode, others have their own) */}
      {visualizationMode === 'flow' && (
        <div
          className="flex items-center justify-between px-4 py-3 text-sm"
          style={{ borderTop: `1px solid ${theme.surfaceBorder}` }}
        >
          <div className="flex gap-6">
            <div>
              <span style={{ color: theme.textMuted }}>Total CPF: </span>
              <span className="font-medium" style={{ color: theme.purple }}>{formatCurrency(calculations.totalContrib)}</span>
            </div>
            <div>
              <span style={{ color: theme.textMuted }}>Your Contribution: </span>
              <span className="font-medium" style={{ color: theme.coralRose }}>{formatCurrency(calculations.employeeContrib)}</span>
            </div>
            <div>
              <span style={{ color: theme.textMuted }}>Employer Contribution: </span>
              <span className="font-medium" style={{ color: theme.sage }}>{formatCurrency(calculations.employerContrib)}</span>
            </div>
          </div>
          <div className="text-xs" style={{ color: theme.textMuted }}>
            Rates for age {age} (2025)
          </div>
        </div>
      )}
    </div>
  )
}
