'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Info } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import { useTheme } from '@/lib/theme'
import type { CPFProfile } from '@/types/cpf'

const ACCOUNT_NAMES: Record<string, string> = {
  OA: 'Ordinary Account',
  SA: 'Special Account',
  MA: 'MediSave Account',
  RA: 'Retirement Account',
}

// Factory function to create theme-aware label renderer
function createLabelRenderer(textSecondary: string, textPrimary: string) {
  return function renderCustomLabel(props: {
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
          fill={textSecondary}
          fontSize={14}
        >
          {fullName} ({name})
        </text>
        {/* Value and percentage */}
        <text
          x={ex + (cos >= 0 ? 8 : -8)}
          y={ey + 18}
          textAnchor={textAnchor}
          dominantBaseline="central"
          fill={textPrimary}
          fontSize={14}
          fontWeight={500}
        >
          {formatCurrency(value)} · {percentage}%
        </text>
      </g>
    )
  }
}

interface CPFBalanceOverviewProps {
  profile: CPFProfile
  className?: string
}

export function CPFBalanceOverview({ profile, className }: CPFBalanceOverviewProps) {
  const { balances, age } = profile
  const { theme, isMonet } = useTheme()

  // Theme-aware chart colors
  const chartColors = {
    oa: theme.chartOA,
    sa: theme.chartSA,
    ma: theme.chartMA,
    ra: theme.chartRA,
  }

  const totalBalance = useMemo(
    () => balances.oa + balances.sa + balances.ma + balances.ra,
    [balances]
  )

  const pieData = useMemo(() => {
    const data = []
    if (balances.oa > 0) data.push({ name: 'OA', value: balances.oa, color: chartColors.oa })
    if (balances.sa > 0) data.push({ name: 'SA', value: balances.sa, color: chartColors.sa })
    if (balances.ma > 0) data.push({ name: 'MA', value: balances.ma, color: chartColors.ma })
    if (balances.ra > 0) data.push({ name: 'RA', value: balances.ra, color: chartColors.ra })
    return data
  }, [balances, chartColors])

  // Create theme-aware label renderer
  const labelRenderer = useMemo(
    () => createLabelRenderer(theme.textSecondary, theme.textPrimary),
    [theme.textSecondary, theme.textPrimary]
  )

  return (
    <div
      className={`flex flex-col rounded-xl overflow-visible transition-colors duration-300 ${className}`}
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-5 transition-colors duration-300"
        style={{
          borderBottom: `1px solid ${theme.surfaceBorder}`,
        }}
      >
        <p
          className="text-xs uppercase tracking-wide"
          style={{ color: theme.blue }}
        >
          CPF Balances
        </p>
        <h2
          className="text-2xl font-semibold"
          style={{ color: theme.textPrimary }}
        >
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
                label={labelRenderer}
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
      <div
        className="px-5 py-4 transition-colors duration-300"
        style={{
          borderTop: `1px solid ${theme.surfaceBorder}`,
        }}
      >
        <div
          className="flex items-start gap-3 rounded-lg p-3 transition-colors duration-300"
          style={{
            background: isMonet ? `${theme.blue}10` : 'rgba(59, 130, 246, 0.05)',
          }}
        >
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: theme.blue }} />
          <div className="text-xs" style={{ color: theme.textSecondary }}>
            <p className="font-medium" style={{ color: theme.blue }}>Extra Interest Earned</p>
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
