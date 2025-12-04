'use client'

import { useState, useCallback, useMemo } from 'react'
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

import { formatCurrency } from '@/lib/format'

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

// Custom Node: Salary Input
function SalaryInputNode({ data }: { data: { salary: number; age: number; onChange: (salary: number, age: number) => void } }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0f1728]/95 p-4 shadow-xl backdrop-blur min-w-[200px]">
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-emerald-400">
        Monthly Salary
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Gross Salary</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input
              type="number"
              value={data.salary}
              onChange={(e) => data.onChange(Number(e.target.value), data.age)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] py-2 pl-7 pr-3 text-lg font-semibold text-white transition focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Your Age</label>
          <select
            value={data.age}
            onChange={(e) => data.onChange(data.salary, Number(e.target.value))}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] py-2 px-3 text-white transition focus:border-emerald-500/50 focus:outline-none"
          >
            <option value={30}>35 or below</option>
            <option value={40}>36-45</option>
            <option value={48}>46-50</option>
            <option value={52}>51-55</option>
            <option value={58}>56-60</option>
            <option value={62}>61-65</option>
            <option value={68}>66-70</option>
            <option value={72}>Above 70</option>
          </select>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-emerald-500 !w-3 !h-3" />
    </div>
  )
}

// Custom Node: CPF Calculator (middle)
function CalculatorNode({ data }: { data: { rates: typeof CPF_RATES['35']; cappedWage: number } }) {
  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 shadow-xl backdrop-blur min-w-[180px]">
      <Handle type="target" position={Position.Left} className="!bg-violet-500 !w-3 !h-3" />

      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-violet-400">
        CPF Calculator
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Total Rate:</span>
          <span className="font-medium text-white">{(data.rates.total * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Employee:</span>
          <span className="text-slate-300">{(data.rates.employee * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Employer:</span>
          <span className="text-slate-300">{(data.rates.employer * 100).toFixed(1)}%</span>
        </div>
        <div className="border-t border-white/10 pt-2 mt-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Capped Wage:</span>
            <span className="text-violet-300">{formatCurrency(data.cappedWage)}</span>
          </div>
          {data.cappedWage < 7400 && (
            <p className="text-xs text-slate-500 mt-1">Below OW ceiling</p>
          )}
          {data.cappedWage >= 7400 && (
            <p className="text-xs text-amber-400 mt-1">Capped at $7,400</p>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-violet-500 !w-3 !h-3" />
    </div>
  )
}

// Custom Node: CPF Account Output
function AccountNode({ data }: { data: { label: string; amount: number; rate: number; color: string; description: string } }) {
  const colorClasses = {
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    green: 'border-green-500/30 bg-green-500/10 text-green-400',
  }[data.color] || 'border-white/10 bg-white/5 text-white'

  return (
    <div className={`rounded-xl border p-4 shadow-xl backdrop-blur min-w-[160px] ${colorClasses}`}>
      <Handle type="target" position={Position.Left} className="!bg-current !w-3 !h-3" />

      <div className="mb-1 text-xs font-medium uppercase tracking-wide">
        {data.label}
      </div>

      <div className="text-2xl font-bold text-white">
        {formatCurrency(data.amount)}
      </div>

      <div className="mt-2 text-xs text-slate-400">
        {(data.rate * 100).toFixed(1)}% of wage
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {data.description}
      </div>
    </div>
  )
}

// Custom Node: Take-home Pay
function TakeHomeNode({ data }: { data: { grossSalary: number; employeeContrib: number } }) {
  const takeHome = data.grossSalary - data.employeeContrib

  return (
    <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 shadow-xl backdrop-blur min-w-[180px]">
      <Handle type="target" position={Position.Left} className="!bg-green-500 !w-3 !h-3" />

      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-green-400">
        Take-Home Pay
      </div>

      <div className="text-2xl font-bold text-white">
        {formatCurrency(takeHome)}
      </div>

      <div className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between text-slate-400">
          <span>Gross:</span>
          <span>{formatCurrency(data.grossSalary)}</span>
        </div>
        <div className="flex justify-between text-red-400">
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
  const [salary, setSalary] = useState(5000)
  const [age, setAge] = useState(30)

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
      data: { salary, age, onChange: handleChange },
    },
    {
      id: 'calculator',
      type: 'calculator',
      position: { x: 280, y: 100 },
      data: { rates: calculations.rates, cappedWage: calculations.cappedWage },
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
        description: 'Housing, education, investment'
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
        description: 'Retirement savings'
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
        description: 'Healthcare expenses'
      },
    },
    {
      id: 'takehome',
      type: 'takeHome',
      position: { x: 280, y: 420 },
      data: {
        grossSalary: salary,
        employeeContrib: calculations.employeeContrib
      },
    },
  ], [salary, age, calculations, handleChange])

  const edges: Edge[] = useMemo(() => [
    {
      id: 'e-salary-calc',
      source: 'salary',
      target: 'calculator',
      animated: true,
      style: { stroke: '#a78bfa', strokeWidth: 2 },
    },
    {
      id: 'e-calc-oa',
      source: 'calculator',
      target: 'oa',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
    },
    {
      id: 'e-calc-sa',
      source: 'calculator',
      target: 'sa',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2 },
    },
    {
      id: 'e-calc-ma',
      source: 'calculator',
      target: 'ma',
      animated: true,
      style: { stroke: '#f59e0b', strokeWidth: 2 },
    },
    {
      id: 'e-salary-takehome',
      source: 'salary',
      target: 'takehome',
      animated: true,
      style: { stroke: '#22c55e', strokeWidth: 2 },
    },
  ], [calculations])

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
          className="!bg-slate-800 !border-white/10 !rounded-lg [&>button]:!bg-slate-700 [&>button]:!border-white/10 [&>button:hover]:!bg-slate-600 [&>button>svg]:!fill-white"
        />
      </ReactFlow>

      {/* Summary Footer */}
      <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between text-sm">
        <div className="flex gap-6">
          <div>
            <span className="text-slate-400">Total CPF: </span>
            <span className="font-medium text-violet-400">{formatCurrency(calculations.totalContrib)}</span>
          </div>
          <div>
            <span className="text-slate-400">Your Contribution: </span>
            <span className="font-medium text-red-400">{formatCurrency(calculations.employeeContrib)}</span>
          </div>
          <div>
            <span className="text-slate-400">Employer Contribution: </span>
            <span className="font-medium text-emerald-400">{formatCurrency(calculations.employerContrib)}</span>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          Rates for age {age} (2025)
        </div>
      </div>
    </div>
  )
}
