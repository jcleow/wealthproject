'use client'

import { useMemo, useState } from 'react'
import {
  Sankey,
  Tooltip,
  Layer,
  Rectangle,
  ResponsiveContainer,
} from 'recharts'
import { ArrowRight } from 'lucide-react'
import { CPF_COLORS } from '@/lib/cpf-constants'
import { formatCurrency } from '@/lib/format'
import type { ConversionResult } from '../hooks'

// Custom Sankey node component with hover tooltip
function CustomNode({ x, y, width, height, payload }: any) {
  const [isHovered, setIsHovered] = useState(false)

  const nodeColors: Record<string, string> = {
    SA: CPF_COLORS.sa,
    OA: CPF_COLORS.oa,
    'MA Overflow': CPF_COLORS.maOverflow,
    'Cash Top-up': CPF_COLORS.cash,
    'Retirement Account': CPF_COLORS.ra,
    'RA (RSS)': CPF_COLORS.raRss,
    Withdrawable: CPF_COLORS.excess,
    MediSave: CPF_COLORS.ma,
  }

  const isLeftNode = ['SA', 'OA', 'MA Overflow', 'Cash Top-up'].includes(
    payload.name
  )
  const textX = isLeftNode ? x - 8 : x + width + 8
  const textY = y + height / 2
  const textAnchor: 'start' | 'end' = isLeftNode ? 'end' : 'start'

  // Get the value for this node (total flow through it)
  const nodeValue = payload.value

  return (
    <Layer>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={nodeColors[payload.name] || '#64748b'}
        fillOpacity={isHovered ? 1 : 0.9}
        rx={4}
        ry={4}
        style={{ cursor: 'pointer', transition: 'fill-opacity 0.15s' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      <text
        x={textX}
        y={textY}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        className="fill-white text-xs font-medium"
        style={{ pointerEvents: 'none' }}
      >
        {payload.name}
      </text>
      {/* Show value below name on hover */}
      {isHovered && nodeValue > 0 && (
        <text
          x={textX}
          y={textY + 14}
          textAnchor={textAnchor}
          dominantBaseline="middle"
          className="fill-slate-300 text-[10px] font-mono"
          style={{ pointerEvents: 'none' }}
        >
          {formatCurrency(nodeValue)}
        </text>
      )}
    </Layer>
  )
}

interface SankeyDiagramProps {
  result: ConversionResult
}

export function SankeyDiagram({ result }: SankeyDiagramProps) {
  // Build Sankey data
  const sankeyData = useMemo(() => {
    const nodes: { name: string }[] = []
    const links: { source: number; target: number; value: number }[] = []

    // Always add SA if it contributes
    if (result.saToRa > 0) {
      nodes.push({ name: 'SA' })
    }

    // Always add OA if it contributes
    if (result.oaToRa > 0 || result.oaRemaining > 0) {
      nodes.push({ name: 'OA' })
    }

    // Add MA Overflow if applicable
    if (result.maOverflow > 0) {
      nodes.push({ name: 'MA Overflow' })
    }

    // Add Cash Top-up if ERS and cash provided
    if (result.cashTopUp > 0) {
      nodes.push({ name: 'Cash Top-up' })
    }

    // Right side nodes
    const raNodeName = result.qualifiesForCPFLife
      ? 'Retirement Account'
      : 'RA (RSS)'
    nodes.push({ name: raNodeName })

    if (result.withdrawable > 0) {
      nodes.push({ name: 'Withdrawable' })
    }

    if (result.maRemaining > 0) {
      nodes.push({ name: 'MediSave' })
    }

    // Build links
    const getNodeIndex = (name: string) =>
      nodes.findIndex((n) => n.name === name)

    const raIndex = getNodeIndex(raNodeName)

    // SA → RA
    if (result.saToRa > 0) {
      links.push({
        source: getNodeIndex('SA'),
        target: raIndex,
        value: result.saToRa,
      })
    }

    // OA → RA
    if (result.oaToRa > 0) {
      links.push({
        source: getNodeIndex('OA'),
        target: raIndex,
        value: result.oaToRa,
      })
    }

    // OA → Withdrawable
    if (result.oaRemaining > 0 && result.withdrawable > 0) {
      const withdrawIndex = getNodeIndex('Withdrawable')
      if (withdrawIndex >= 0) {
        links.push({
          source: getNodeIndex('OA'),
          target: withdrawIndex,
          value: result.oaRemaining,
        })
      }
    }

    // MA Overflow → RA
    if (result.maOverflow > 0) {
      links.push({
        source: getNodeIndex('MA Overflow'),
        target: raIndex,
        value: result.maOverflow,
      })
    }

    // Cash → RA
    if (result.cashTopUp > 0) {
      links.push({
        source: getNodeIndex('Cash Top-up'),
        target: raIndex,
        value: result.cashTopUp,
      })
    }

    return { nodes, links }
  }, [result])

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
      <div className="mb-4 flex items-center gap-2">
        <ArrowRight className="h-4 w-4 text-amber-400" />
        <h4 className="text-sm font-medium text-white">Money Flow at Age 55</h4>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={sankeyData}
            node={<CustomNode />}
            nodePadding={40}
            nodeWidth={12}
            linkCurvature={0.5}
            margin={{ top: 20, right: 180, bottom: 20, left: 120 }}
            link={{
              stroke: '#ffffff',
              strokeOpacity: 0.15,
            }}
          >
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const data = payload[0].payload
                if (data.source && data.target) {
                  return (
                    <div className="rounded-lg border border-white/10 bg-[#0f1728]/95 px-3 py-2 shadow-xl backdrop-blur">
                      <p className="text-xs text-slate-400">
                        {data.source.name} → {data.target.name}
                      </p>
                      <p className="text-lg font-semibold text-white">
                        {formatCurrency(data.value)}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
