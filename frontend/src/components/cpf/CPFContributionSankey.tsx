'use client'

import { useMemo } from 'react'
import { Sankey, Tooltip, Layer, Rectangle } from 'recharts'
import { formatCurrency } from '@/lib/format'

interface CPFContributionSankeyProps {
  salary: number
  cappedWage?: number // Optional, reserved for future use
  employeeContrib: number
  employerContrib: number
  oaContrib: number
  saContrib: number
  maContrib: number
  className?: string
}

// Custom node component for Sankey diagram
function SankeyNode({
  x,
  y,
  width,
  height,
  index,
  payload,
}: {
  x: number
  y: number
  width: number
  height: number
  index: number
  payload: { name: string; color: string }
}) {
  return (
    <Layer key={`sankey-node-${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload.color}
        fillOpacity={0.9}
        rx={4}
        ry={4}
      />
      <text
        x={x < 200 ? x - 8 : x + width + 8}
        y={y + height / 2}
        textAnchor={x < 200 ? 'end' : 'start'}
        dominantBaseline="middle"
        className="fill-slate-200 text-xs font-medium"
      >
        {payload.name}
      </text>
    </Layer>
  )
}

// Custom link component for Sankey diagram
function SankeyLink({
  sourceX,
  sourceY,
  sourceControlX,
  targetX,
  targetY,
  targetControlX,
  linkWidth,
  index,
  payload,
}: {
  sourceX: number
  sourceY: number
  sourceControlX: number
  targetX: number
  targetY: number
  targetControlX: number
  linkWidth: number
  index: number
  payload: { source: { color: string }; target: { color: string } }
}) {
  // Create gradient ID
  const gradientId = `gradient-${index}`

  return (
    <Layer key={`sankey-link-${index}`}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={payload.source.color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={payload.target.color} stopOpacity={0.4} />
        </linearGradient>
      </defs>
      <path
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
        `}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={linkWidth}
        strokeOpacity={0.6}
      />
    </Layer>
  )
}

export function CPFContributionSankey({
  salary,
  employeeContrib,
  employerContrib,
  oaContrib,
  saContrib,
  maContrib,
  className,
}: CPFContributionSankeyProps) {
  const takeHome = salary - employeeContrib
  const totalCpf = employeeContrib + employerContrib

  const data = useMemo(() => {
    const nodes = [
      { name: 'Gross Salary', color: '#6366f1' },           // 0
      { name: 'Employee CPF', color: '#ef4444' },           // 1
      { name: 'Employer CPF', color: '#22c55e' },           // 2
      { name: 'Take-Home Pay', color: '#22c55e' },          // 3
      { name: 'Total CPF', color: '#8b5cf6' },              // 4
      { name: 'OA', color: '#3b82f6' },                     // 5
      { name: 'SA', color: '#10b981' },                     // 6
      { name: 'MA', color: '#f59e0b' },                     // 7
    ]

    const links = [
      // Salary flows
      { source: 0, target: 1, value: employeeContrib },     // Gross -> Employee CPF
      { source: 0, target: 3, value: takeHome },            // Gross -> Take-Home

      // Employer contribution (separate source, but conceptually linked to salary)
      { source: 2, target: 4, value: employerContrib },     // Employer CPF -> Total CPF

      // Employee contribution to total
      { source: 1, target: 4, value: employeeContrib },     // Employee CPF -> Total CPF

      // Total CPF splits to accounts
      { source: 4, target: 5, value: oaContrib },           // Total -> OA
      { source: 4, target: 6, value: saContrib },           // Total -> SA
      { source: 4, target: 7, value: maContrib },           // Total -> MA
    ]

    return { nodes, links }
  }, [salary, employeeContrib, employerContrib, takeHome, oaContrib, saContrib, maContrib])

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#6366f1]" />
          <span className="text-xs text-slate-400">Gross Salary</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#ef4444]" />
          <span className="text-xs text-slate-400">Employee CPF</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#22c55e]" />
          <span className="text-xs text-slate-400">Employer / Take-Home</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#3b82f6]" />
          <span className="text-xs text-slate-400">OA</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#10b981]" />
          <span className="text-xs text-slate-400">SA</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#f59e0b]" />
          <span className="text-xs text-slate-400">MA</span>
        </div>
      </div>

      {/* Sankey Chart */}
      <div className="flex-1 min-h-[400px] p-4">
        <Sankey
          width={800}
          height={400}
          data={data}
          node={<SankeyNode x={0} y={0} width={0} height={0} index={0} payload={{ name: '', color: '' }} />}
          link={<SankeyLink sourceX={0} sourceY={0} sourceControlX={0} targetX={0} targetY={0} targetControlX={0} linkWidth={0} index={0} payload={{ source: { color: '' }, target: { color: '' } }} />}
          nodePadding={50}
          nodeWidth={12}
          margin={{ top: 20, right: 160, bottom: 20, left: 160 }}
        >
          <Tooltip
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null
              const data = payload[0].payload
              return (
                <div className="rounded-lg border border-white/[0.12] bg-[#0c0c0c] px-3 py-2 shadow-xl">
                  <p className="text-sm font-medium text-white">
                    {data.name || `${data.source?.name} → ${data.target?.name}`}
                  </p>
                  <p className="text-sm text-slate-400">
                    {formatCurrency(data.value)}
                  </p>
                </div>
              )
            }}
          />
        </Sankey>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] text-sm">
        <div className="flex gap-6">
          <div>
            <span className="text-slate-400">Total CPF: </span>
            <span className="font-medium text-violet-400">{formatCurrency(totalCpf)}</span>
          </div>
          <div>
            <span className="text-slate-400">Take-Home: </span>
            <span className="font-medium text-green-400">{formatCurrency(takeHome)}</span>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          Flow width proportional to amount
        </div>
      </div>
    </div>
  )
}
