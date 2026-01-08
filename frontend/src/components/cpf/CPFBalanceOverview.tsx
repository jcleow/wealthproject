'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Info } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import type { CPFProfile } from '@/types/cpf'

const COLORS = {
  oa: '#3b82f6', // blue
  sa: '#10b981', // emerald
  ma: '#f59e0b', // amber
  ra: '#8b5cf6', // violet
}

const ACCOUNT_NAMES: Record<string, string> = {
  OA: 'Ordinary Account',
  SA: 'Special Account',
  MA: 'MediSave Account',
  RA: 'Retirement Account',
}

// Custom label with leader line
function renderCustomLabel(props: {
  cx?: number
  cy?: number
  midAngle?: number
  outerRadius?: number
  name?: string
  value?: number
  fill?: string
  percent?: number
}) {
  const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, name = '', value = 0, fill = '#fff', percent = 0 } = props

  const RADIAN = Math.PI / 180
  const sin = Math.sin(-RADIAN * midAngle)
  const cos = Math.cos(-RADIAN * midAngle)

  // Point on the pie edge
  const sx = cx + outerRadius * cos
  const sy = cy + outerRadius * sin

  // Point for the elbow
  const mx = cx + (outerRadius + 25) * cos
  const my = cy + (outerRadius + 25) * sin

  // End point for the horizontal line
  const ex = mx + (cos >= 0 ? 1 : -1) * 20
  const ey = my

  // Text anchor based on which side
  const textAnchor = cos >= 0 ? 'start' : 'end'

  const fullName = ACCOUNT_NAMES[name] || name
  const percentage = (percent * 100).toFixed(0)

  return (
    <g>
      {/* Leader line */}
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        strokeWidth={1.5}
        fill="none"
        strokeOpacity={0.6}
      />
      {/* Dot at the end */}
      <circle cx={ex} cy={ey} r={2} fill={fill} />
      {/* Label text: Account name (SHORT) */}
      <text
        x={ex + (cos >= 0 ? 8 : -8)}
        y={ey}
        textAnchor={textAnchor}
        dominantBaseline="central"
        className="fill-slate-300 text-sm"
      >
        {fullName} ({name})
      </text>
      {/* Value and percentage */}
      <text
        x={ex + (cos >= 0 ? 8 : -8)}
        y={ey + 18}
        textAnchor={textAnchor}
        dominantBaseline="central"
        className="fill-white text-sm font-medium"
      >
        {formatCurrency(value)} · {percentage}%
      </text>
    </g>
  )
}

interface CPFBalanceOverviewProps {
  profile: CPFProfile
  className?: string
}

export function CPFBalanceOverview({ profile, className }: CPFBalanceOverviewProps) {
  const { balances, age } = profile

  const totalBalance = useMemo(
    () => balances.oa + balances.sa + balances.ma + balances.ra,
    [balances]
  )

  const pieData = useMemo(() => {
    const data = []
    if (balances.oa > 0) data.push({ name: 'OA', value: balances.oa, color: COLORS.oa })
    if (balances.sa > 0) data.push({ name: 'SA', value: balances.sa, color: COLORS.sa })
    if (balances.ma > 0) data.push({ name: 'MA', value: balances.ma, color: COLORS.ma })
    if (balances.ra > 0) data.push({ name: 'RA', value: balances.ra, color: COLORS.ra })
    return data
  }, [balances])

  return (
    <div className={`flex flex-col rounded-xl border border-white/[0.08] bg-[#0a0a0a] overflow-visible ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.04] p-5">
        <p className="text-xs uppercase tracking-wide text-blue-300">CPF Balances</p>
        <h2 className="text-2xl font-semibold text-white">
          {formatCurrency(totalBalance)}
        </h2>
      </div>

      {/* Pie Chart with Leader Line Labels */}
      <div className="flex-1 p-5 overflow-visible">
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 40, right: 120, bottom: 40, left: 120 }}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
                label={renderCustomLabel}
                labelLine={false}
                isAnimationActive={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Extra Interest Info */}
      <div className="border-t border-white/[0.04] px-5 py-4">
        <div className="flex items-start gap-3 rounded-lg bg-blue-500/5 p-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
          <div className="text-xs text-slate-300">
            <p className="font-medium text-blue-300">Extra Interest Earned</p>
            <p className="mt-1">
              You earn an extra 1% p.a. on the first $60,000 of your combined balances (capped at
              $20,000 OA). {age >= 55 && 'Plus an additional 1% on the next $30,000 after age 55.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
