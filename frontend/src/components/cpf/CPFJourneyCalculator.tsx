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
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { useTheme, type AppTheme } from '@/lib/theme'

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
// THEME-AWARE COLOR HELPERS
// ============================================================================

interface ThemeColors {
  theme: AppTheme
  isMonet: boolean
}

function getSectionColors(color: string, themeColors: ThemeColors) {
  const { theme, isMonet } = themeColors

  if (isMonet) {
    const colorMap: Record<string, { border: string; bg: string; text: string }> = {
      emerald: { border: `1px dashed ${theme.sage}40`, bg: `${theme.sage}08`, text: theme.sage },
      blue: { border: `1px dashed ${theme.blue}40`, bg: `${theme.blue}08`, text: theme.blue },
      violet: { border: `1px dashed ${theme.purple}40`, bg: `${theme.purple}08`, text: theme.purple },
      amber: { border: `1px dashed ${theme.amber}40`, bg: `${theme.amber}08`, text: theme.amber },
      purple: { border: `1px dashed ${theme.purple}40`, bg: `${theme.purple}08`, text: theme.purple },
    }
    return colorMap[color] || { border: `1px dashed ${theme.cardBorder}`, bg: theme.surfaceBg, text: theme.textSecondary }
  }

  // Dark theme
  const colorMap: Record<string, { border: string; bg: string; text: string }> = {
    emerald: { border: '2px dashed rgba(16, 185, 129, 0.3)', bg: 'rgba(16, 185, 129, 0.05)', text: '#34d399' },
    blue: { border: '2px dashed rgba(59, 130, 246, 0.3)', bg: 'rgba(59, 130, 246, 0.05)', text: '#60a5fa' },
    violet: { border: '2px dashed rgba(139, 92, 246, 0.3)', bg: 'rgba(139, 92, 246, 0.05)', text: '#a78bfa' },
    amber: { border: '2px dashed rgba(245, 158, 11, 0.3)', bg: 'rgba(245, 158, 11, 0.05)', text: '#fbbf24' },
    purple: { border: '2px dashed rgba(168, 85, 247, 0.3)', bg: 'rgba(168, 85, 247, 0.05)', text: '#c084fc' },
  }
  return colorMap[color] || { border: `2px dashed ${theme.cardBorder}`, bg: theme.surfaceBg, text: theme.textSecondary }
}

function getNodeColors(color: string, themeColors: ThemeColors) {
  const { theme, isMonet } = themeColors

  if (isMonet) {
    const colorMap: Record<string, { border: string; bg: string; headerBorder: string; accent: string }> = {
      emerald: {
        border: `1px solid ${theme.sage}30`,
        bg: theme.cardBg,
        headerBorder: `${theme.sage}20`,
        accent: theme.sage
      },
      blue: {
        border: `1px solid ${theme.blue}30`,
        bg: theme.cardBg,
        headerBorder: `${theme.blue}20`,
        accent: theme.blue
      },
      violet: {
        border: `1px solid ${theme.purple}30`,
        bg: theme.cardBg,
        headerBorder: `${theme.purple}20`,
        accent: theme.purple
      },
      amber: {
        border: `1px solid ${theme.amber}30`,
        bg: theme.cardBg,
        headerBorder: `${theme.amber}20`,
        accent: theme.amber
      },
      purple: {
        border: `1px solid ${theme.purple}30`,
        bg: theme.cardBg,
        headerBorder: `${theme.purple}20`,
        accent: theme.purple
      },
      green: {
        border: `1px solid ${theme.sage}30`,
        bg: theme.cardBg,
        headerBorder: `${theme.sage}20`,
        accent: theme.sageDark
      },
    }
    return colorMap[color] || { border: `1px solid ${theme.cardBorder}`, bg: theme.cardBg, headerBorder: theme.cardBorder, accent: theme.primary }
  }

  // Dark theme
  const colorMap: Record<string, { border: string; bg: string; headerBorder: string; accent: string }> = {
    emerald: {
      border: '1px solid rgba(16, 185, 129, 0.3)',
      bg: 'rgba(16, 185, 129, 0.1)',
      headerBorder: 'rgba(16, 185, 129, 0.2)',
      accent: '#34d399'
    },
    blue: {
      border: '1px solid rgba(59, 130, 246, 0.3)',
      bg: 'rgba(59, 130, 246, 0.1)',
      headerBorder: 'rgba(59, 130, 246, 0.2)',
      accent: '#60a5fa'
    },
    violet: {
      border: '1px solid rgba(139, 92, 246, 0.3)',
      bg: 'rgba(139, 92, 246, 0.1)',
      headerBorder: 'rgba(139, 92, 246, 0.2)',
      accent: '#a78bfa'
    },
    amber: {
      border: '1px solid rgba(245, 158, 11, 0.3)',
      bg: 'rgba(245, 158, 11, 0.1)',
      headerBorder: 'rgba(245, 158, 11, 0.2)',
      accent: '#fbbf24'
    },
    purple: {
      border: '1px solid rgba(168, 85, 247, 0.3)',
      bg: 'rgba(168, 85, 247, 0.1)',
      headerBorder: 'rgba(168, 85, 247, 0.2)',
      accent: '#c084fc'
    },
    green: {
      border: '1px solid rgba(34, 197, 94, 0.3)',
      bg: 'rgba(34, 197, 94, 0.1)',
      headerBorder: 'rgba(34, 197, 94, 0.2)',
      accent: '#22c55e'
    },
  }
  return colorMap[color] || { border: `1px solid ${theme.cardBorder}`, bg: theme.cardBg, headerBorder: theme.cardBorder, accent: theme.primary }
}

// ============================================================================
// SECTION BOUNDARY NODE
// ============================================================================

function SectionNode({ data }: { data: { label: string; color: string; width: number; height: number; themeColors: ThemeColors } }) {
  const colors = getSectionColors(data.color, data.themeColors)
  const { theme, isMonet } = data.themeColors

  return (
    <div
      className="rounded-2xl pointer-events-none"
      style={{
        width: data.width,
        height: data.height,
        border: colors.border,
        background: colors.bg,
      }}
    >
      <div
        className="absolute -top-3 left-4 px-2 text-xs font-semibold uppercase tracking-wider"
        style={{
          color: colors.text,
          background: isMonet ? theme.panelBg : '#0a0a0a',
        }}
      >
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
  themeColors: ThemeColors
}}) {
  const { theme, isMonet } = data.themeColors
  const nodeColors = getNodeColors('emerald', data.themeColors)

  return (
    <div
      className="min-w-[180px] rounded-xl shadow-xl backdrop-blur"
      style={{
        border: isMonet ? `1px solid ${theme.cardBorder}` : '1px solid rgba(255, 255, 255, 0.08)',
        background: isMonet ? theme.cardBg : 'rgba(15, 23, 40, 0.95)',
      }}
    >
      {/* Handles on all 4 sides */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-emerald-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-emerald-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-emerald-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-emerald-500 !w-3 !h-3" />

      {/* Drag handle area */}
      <div
        className="px-4 pt-3 pb-2 cursor-move drag-handle"
        style={{ borderBottom: `1px solid ${isMonet ? theme.cardBorder : 'rgba(255, 255, 255, 0.06)'}` }}
      >
        <div
          className="text-xs font-medium tracking-wide uppercase"
          style={{ color: nodeColors.accent }}
        >
          Your Profile
        </div>
      </div>
      <div className="p-4 pt-3">
        <div className="space-y-3">
          <div>
            <label
              className="mb-1 block text-xs"
              style={{ color: theme.textMuted }}
            >
              Monthly Salary
            </label>
            <CurrencyInput
              value={data.salary}
              onChange={(val) => data.onChange('salary', val)}
              size="sm"
            />
          </div>

          <div>
            <label
              className="mb-1 block text-xs"
              style={{ color: theme.textMuted }}
            >
              Current Age
            </label>
            <input
              type="number"
              value={data.age}
              onChange={(e) => data.onChange('age', Number(e.target.value))}
              min={21}
              max={70}
              className="w-full py-2 px-3 rounded-lg transition"
              style={{
                border: `1px solid ${theme.inputBorder}`,
                background: theme.inputBg,
                color: theme.inputText,
              }}
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
  themeColors: ThemeColors
}}) {
  const { theme } = data.themeColors
  const nodeColors = getNodeColors('emerald', data.themeColors)

  return (
    <div
      className="min-w-[160px] rounded-xl shadow-xl backdrop-blur"
      style={{
        border: nodeColors.border,
        background: nodeColors.bg,
      }}
    >
      {/* Handles on all 4 sides */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-emerald-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-emerald-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-emerald-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-emerald-500 !w-3 !h-3" />

      <div
        className="px-4 pt-3 pb-2 cursor-move drag-handle"
        style={{ borderBottom: `1px solid ${nodeColors.headerBorder}` }}
      >
        <div
          className="text-xs font-medium tracking-wide uppercase"
          style={{ color: nodeColors.accent }}
        >
          Monthly CPF
        </div>
      </div>

      <div className="p-4 pt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span style={{ color: theme.blue }}>OA:</span>
          <span style={{ color: theme.textPrimary }}>{formatCurrency(data.oaContrib)}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: theme.sage }}>SA:</span>
          <span style={{ color: theme.textPrimary }}>{formatCurrency(data.saContrib)}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: theme.amber }}>MA:</span>
          <span style={{ color: theme.textPrimary }}>{formatCurrency(data.maContrib)}</span>
        </div>
        <div
          className="flex justify-between pt-2 font-medium"
          style={{ borderTop: `1px solid ${theme.surfaceBorder}` }}
        >
          <span style={{ color: theme.textSecondary }}>Total:</span>
          <span style={{ color: theme.textPrimary }}>{formatCurrency(data.totalContrib)}</span>
        </div>
        <div className="flex justify-between text-xs" style={{ color: theme.textMuted }}>
          <span>Take-home:</span>
          <span style={{ color: theme.sage }}>{formatCurrency(data.takeHome)}</span>
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
  themeColors: ThemeColors
}}) {
  const { theme } = data.themeColors
  const nodeColors = getNodeColors('blue', data.themeColors)
  const total = data.oaBalance + data.saBalance + data.maBalance

  return (
    <div
      className="min-w-[180px] rounded-xl shadow-xl backdrop-blur"
      style={{
        border: nodeColors.border,
        background: nodeColors.bg,
      }}
    >
      {/* Handles on all 4 sides */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-blue-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-blue-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-blue-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-blue-500 !w-3 !h-3" />

      <div
        className="px-4 pt-3 pb-2 cursor-move drag-handle"
        style={{ borderBottom: `1px solid ${nodeColors.headerBorder}` }}
      >
        <div
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: nodeColors.accent }}
        >
          Balances at 55
        </div>
      </div>

      <div className="p-4 pt-3 space-y-2">
        <div>
          <label className="text-xs" style={{ color: theme.textMuted }}>OA Balance</label>
          <CurrencyInput
            value={data.oaBalance}
            onChange={(val) => data.onChange('oaBalance', val)}
          />
        </div>
        <div>
          <label className="text-xs" style={{ color: theme.textMuted }}>SA Balance</label>
          <CurrencyInput
            value={data.saBalance}
            onChange={(val) => data.onChange('saBalance', val)}
          />
        </div>
        <div>
          <label className="text-xs" style={{ color: theme.textMuted }}>MA Balance</label>
          <CurrencyInput
            value={data.maBalance}
            onChange={(val) => data.onChange('maBalance', val)}
          />
        </div>
        <div
          className="pt-2 flex justify-between text-sm"
          style={{ borderTop: `1px solid ${theme.surfaceBorder}` }}
        >
          <span style={{ color: theme.textMuted }}>Total:</span>
          <span className="font-medium" style={{ color: theme.textPrimary }}>{formatCurrency(total)}</span>
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
  themeColors: ThemeColors
}}) {
  const { theme } = data.themeColors
  const nodeColors = getNodeColors('violet', data.themeColors)

  return (
    <div
      className="min-w-[160px] rounded-xl shadow-xl backdrop-blur"
      style={{
        border: nodeColors.border,
        background: nodeColors.bg,
      }}
    >
      {/* Handles on all 4 sides */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-violet-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-violet-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-violet-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-violet-500 !w-3 !h-3" />

      <div
        className="px-4 pt-3 pb-2 cursor-move drag-handle"
        style={{ borderBottom: `1px solid ${nodeColors.headerBorder}` }}
      >
        <div
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: nodeColors.accent }}
        >
          Housing (Optional)
        </div>
      </div>

      <div className="p-4 pt-3 space-y-2">
        <div>
          <label className="text-xs" style={{ color: theme.textMuted }}>CPF Used for Property</label>
          <CurrencyInput
            value={data.cpfUsedForHousing}
            onChange={(val) => data.onChange('cpfUsedForHousing', val)}
          />
        </div>
        <div
          className="pt-2 text-xs"
          style={{ borderTop: `1px solid ${theme.surfaceBorder}` }}
        >
          <div className="flex justify-between" style={{ color: theme.textMuted }}>
            <span>OA after housing:</span>
            <span style={{ color: theme.blue }}>{formatCurrency(data.oaAfterHousing)}</span>
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
  themeColors: ThemeColors
}}) {
  const { theme, isMonet } = data.themeColors
  const nodeColors = getNodeColors('amber', data.themeColors)
  const metTarget = data.shortfall <= 0

  return (
    <div
      className="min-w-[180px] rounded-xl shadow-xl backdrop-blur"
      style={{
        border: nodeColors.border,
        background: nodeColors.bg,
      }}
    >
      {/* Handles on all 4 sides */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-amber-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-amber-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-amber-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-amber-500 !w-3 !h-3" />

      <div
        className="px-4 pt-3 pb-2 cursor-move drag-handle"
        style={{ borderBottom: `1px solid ${nodeColors.headerBorder}` }}
      >
        <div
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: nodeColors.accent }}
        >
          Age 55: RA Created
        </div>
      </div>

      <div className="p-4 pt-3 space-y-2 text-sm">
        <div className="text-xs" style={{ color: theme.textMuted }}>Transfers to RA:</div>
        <div className="flex justify-between">
          <span style={{ color: theme.sage }}>From SA:</span>
          <span style={{ color: theme.textPrimary }}>{formatCurrency(data.saToRa)}</span>
        </div>
        {data.oaToRa > 0 && (
          <div className="flex justify-between">
            <span style={{ color: theme.blue }}>From OA:</span>
            <span style={{ color: theme.textPrimary }}>{formatCurrency(data.oaToRa)}</span>
          </div>
        )}
        <div
          className="pt-2"
          style={{ borderTop: `1px solid ${theme.surfaceBorder}` }}
        >
          <div className="flex justify-between font-medium">
            <span style={{ color: theme.purple }}>RA Balance:</span>
            <span style={{ color: theme.textPrimary }}>{formatCurrency(data.raBalance)}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span style={{ color: theme.textMuted }}>Target (FRS):</span>
            <span style={{ color: metTarget ? theme.sage : (isMonet ? '#dc2626' : '#f87171') }}>
              {formatCurrency(data.targetSum)}
            </span>
          </div>
          {!metTarget && (
            <div
              className="text-xs mt-1"
              style={{ color: isMonet ? '#dc2626' : '#f87171' }}
            >
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
  themeColors: ThemeColors
}}) {
  const { theme } = data.themeColors
  const nodeColors = getNodeColors('purple', data.themeColors)

  return (
    <div
      className="min-w-[160px] rounded-xl shadow-xl backdrop-blur"
      style={{
        border: nodeColors.border,
        background: nodeColors.bg,
      }}
    >
      {/* Handles on all 4 sides */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-purple-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-purple-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-purple-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-purple-500 !w-3 !h-3" />

      <div
        className="px-4 pt-3 pb-2 cursor-move drag-handle"
        style={{ borderBottom: `1px solid ${nodeColors.headerBorder}` }}
      >
        <div
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: nodeColors.accent }}
        >
          CPF LIFE (Age 65+)
        </div>
      </div>

      <div className="p-4 pt-3 space-y-2">
        <div className="text-2xl font-bold" style={{ color: theme.textPrimary }}>
          {formatCurrency(data.monthlyPayout)}
          <span className="text-sm font-normal" style={{ color: theme.textMuted }}>/mo</span>
        </div>
        <div className="text-sm" style={{ color: theme.textMuted }}>
          {formatCurrency(data.yearlyPayout)}/year
        </div>
        <div
          className="pt-2 text-xs"
          style={{ borderTop: `1px solid ${theme.surfaceBorder}` }}
        >
          <span style={{ color: theme.textMuted }}>Plan: </span>
          <span className="capitalize" style={{ color: theme.purple }}>{data.plan}</span>
        </div>
        <div className="text-xs" style={{ color: theme.sage }}>
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
  themeColors: ThemeColors
}}) {
  const { theme } = data.themeColors
  const nodeColors = getNodeColors('green', data.themeColors)

  return (
    <div
      className="min-w-[140px] rounded-xl shadow-xl backdrop-blur"
      style={{
        border: nodeColors.border,
        background: nodeColors.bg,
      }}
    >
      {/* Handles on all 4 sides */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-green-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-green-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-green-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-green-500 !w-3 !h-3" />

      <div
        className="px-4 pt-3 pb-2 cursor-move drag-handle"
        style={{ borderBottom: `1px solid ${nodeColors.headerBorder}` }}
      >
        <div
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: nodeColors.accent }}
        >
          Other Balances
        </div>
      </div>

      <div className="p-4 pt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span style={{ color: theme.blue }}>OA:</span>
          <span style={{ color: theme.textPrimary }}>{formatCurrency(data.oaRemaining)}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: theme.amber }}>MA:</span>
          <span style={{ color: theme.textPrimary }}>{formatCurrency(data.maRemaining)}</span>
        </div>
        {data.withdrawable > 0 && (
          <div
            className="pt-2"
            style={{ borderTop: `1px solid ${theme.surfaceBorder}` }}
          >
            <div className="text-xs" style={{ color: theme.textMuted }}>Withdrawable:</div>
            <div className="text-lg font-bold" style={{ color: theme.sage }}>
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
  // Theme
  const { theme, isMonet } = useTheme()
  const themeColors: ThemeColors = useMemo(() => ({ theme, isMonet }), [theme, isMonet])

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
      data: { label: '1. Monthly Contributions', color: 'emerald', width: 380, height: 280, themeColors },
      draggable: false,
      selectable: false,
      zIndex: -1,
    },
    {
      id: 'section-2',
      type: 'section',
      position: { x: 400, y: sectionY },
      data: { label: '2. Accumulated Balances', color: 'blue', width: 420, height: 280, themeColors },
      draggable: false,
      selectable: false,
      zIndex: -1,
    },
    {
      id: 'section-3',
      type: 'section',
      position: { x: 840, y: sectionY },
      data: { label: '3. Age 55 (RA Creation)', color: 'amber', width: 220, height: 280, themeColors },
      draggable: false,
      selectable: false,
      zIndex: -1,
    },
    {
      id: 'section-4',
      type: 'section',
      position: { x: 1080, y: sectionY },
      data: { label: '4. Retirement (65+)', color: 'purple', width: 340, height: 280, themeColors },
      draggable: false,
      selectable: false,
      zIndex: -1,
    },
    // Stage 1: Salary & Contributions
    {
      id: 'salary',
      type: 'salaryInput',
      position: { x: 20, y: nodeY },
      data: { salary: 6000, age: 30, onChange: () => {}, themeColors },
      dragHandle: '.drag-handle',
    },
    {
      id: 'contribution',
      type: 'contribution',
      position: { x: 210, y: nodeY },
      data: { oaContrib: 0, saContrib: 0, maContrib: 0, totalContrib: 0, employeeContrib: 0, takeHome: 0, themeColors },
      dragHandle: '.drag-handle',
    },
    // Stage 2: Balances & Housing
    {
      id: 'balances',
      type: 'balances',
      position: { x: 420, y: nodeY },
      data: { oaBalance: 150000, saBalance: 80000, maBalance: 50000, yearsWorked: 25, onChange: () => {}, themeColors },
      dragHandle: '.drag-handle',
    },
    {
      id: 'housing',
      type: 'housing',
      position: { x: 620, y: nodeY + 120 },
      data: { propertyPrice: 500000, cpfUsedForHousing: 100000, oaAfterHousing: 50000, onChange: () => {}, themeColors },
      dragHandle: '.drag-handle',
    },
    // Stage 3: RA Creation
    {
      id: 'ra-creation',
      type: 'raCreation',
      position: { x: 860, y: nodeY },
      data: { saBalance: 80000, oaBalance: 50000, saToRa: 80000, oaToRa: 50000, raBalance: 130000, targetSum: 213000, shortfall: 83000, themeColors },
      dragHandle: '.drag-handle',
    },
    // Stage 4: CPF LIFE & Remaining
    {
      id: 'payout',
      type: 'payout',
      position: { x: 1100, y: nodeY },
      data: { raBalance: 130000, monthlyPayout: 715, yearlyPayout: 8580, plan: 'standard', themeColors },
      dragHandle: '.drag-handle',
    },
    {
      id: 'remaining',
      type: 'remaining',
      position: { x: 1270, y: nodeY },
      data: { oaRemaining: 0, maRemaining: 50000, withdrawable: 0, themeColors },
      dragHandle: '.drag-handle',
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []) // Only create once

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)

  // Update node data when calculations or theme change (preserving positions)
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        switch (node.id) {
          case 'section-1':
          case 'section-2':
          case 'section-3':
          case 'section-4':
            return { ...node, data: { ...node.data, themeColors } }
          case 'salary':
            return { ...node, data: { salary, age, onChange: handleChange, themeColors } }
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
                themeColors,
              },
            }
          case 'balances':
            return {
              ...node,
              data: { oaBalance, saBalance, maBalance, yearsWorked: 55 - age, onChange: handleChange, themeColors },
            }
          case 'housing':
            return {
              ...node,
              data: {
                propertyPrice: 500000,
                cpfUsedForHousing,
                oaAfterHousing: calculations.oaAfterHousing,
                onChange: handleChange,
                themeColors,
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
                themeColors,
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
                themeColors,
              },
            }
          case 'remaining':
            return {
              ...node,
              data: {
                oaRemaining: calculations.oaRemaining,
                maRemaining: calculations.maRemaining,
                withdrawable: calculations.withdrawable,
                themeColors,
              },
            }
          default:
            return node
        }
      })
    )
  }, [salary, age, oaBalance, saBalance, maBalance, cpfUsedForHousing, calculations, handleChange, setNodes, themeColors])

  const labelBgFill = isMonet ? theme.panelBg : '#0a0a0a'

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
      style: { stroke: theme.sage, strokeWidth: 2 },
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
      style: { stroke: theme.blue, strokeWidth: 2 },
      label: 'Years of saving',
      labelStyle: { fill: theme.textMuted, fontSize: 10 },
      labelBgStyle: { fill: labelBgFill, fillOpacity: 0.8 },
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
      style: { stroke: theme.purple, strokeWidth: 2 },
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
      style: { stroke: theme.amber, strokeWidth: 2 },
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
      style: { stroke: theme.purple, strokeWidth: 2 },
      label: 'CPF LIFE',
      labelStyle: { fill: theme.purple, fontSize: 10 },
      labelBgStyle: { fill: labelBgFill, fillOpacity: 0.8 },
    },
    {
      id: 'e-ra-remaining',
      source: 'ra-creation',
      sourceHandle: 'right',
      target: 'remaining',
      targetHandle: 'left',
      animated: true,
      reconnectable: true,
      style: { stroke: theme.sage, strokeWidth: 2 },
    },
  ], [theme, labelBgFill])

  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update edges when theme changes
  useEffect(() => {
    setEdges([
      {
        id: 'e-salary-contrib',
        source: 'salary',
        sourceHandle: 'right',
        target: 'contribution',
        targetHandle: 'left',
        animated: true,
        reconnectable: true,
        style: { stroke: theme.sage, strokeWidth: 2 },
      },
      {
        id: 'e-contrib-balances',
        source: 'contribution',
        sourceHandle: 'right',
        target: 'balances',
        targetHandle: 'left',
        animated: true,
        reconnectable: true,
        style: { stroke: theme.blue, strokeWidth: 2 },
        label: 'Years of saving',
        labelStyle: { fill: theme.textMuted, fontSize: 10 },
        labelBgStyle: { fill: labelBgFill, fillOpacity: 0.8 },
      },
      {
        id: 'e-balances-housing',
        source: 'balances',
        sourceHandle: 'bottom',
        target: 'housing',
        targetHandle: 'top',
        animated: true,
        reconnectable: true,
        style: { stroke: theme.purple, strokeWidth: 2 },
      },
      {
        id: 'e-housing-ra',
        source: 'housing',
        sourceHandle: 'right',
        target: 'ra-creation',
        targetHandle: 'left',
        animated: true,
        reconnectable: true,
        style: { stroke: theme.amber, strokeWidth: 2 },
      },
      {
        id: 'e-ra-payout',
        source: 'ra-creation',
        sourceHandle: 'right',
        target: 'payout',
        targetHandle: 'left',
        animated: true,
        reconnectable: true,
        style: { stroke: theme.purple, strokeWidth: 2 },
        label: 'CPF LIFE',
        labelStyle: { fill: theme.purple, fontSize: 10 },
        labelBgStyle: { fill: labelBgFill, fillOpacity: 0.8 },
      },
      {
        id: 'e-ra-remaining',
        source: 'ra-creation',
        sourceHandle: 'right',
        target: 'remaining',
        targetHandle: 'left',
        animated: true,
        reconnectable: true,
        style: { stroke: theme.sage, strokeWidth: 2 },
      },
    ])
  }, [theme, labelBgFill, setEdges])

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
          style: { stroke: theme.textMuted, strokeWidth: 2 },
        }
        setEdges((eds) => [...eds, newEdge])
      }
    },
    [setEdges, theme.textMuted]
  )

  // Background color for ReactFlow
  const backgroundDotColor = isMonet ? theme.textMuted : '#1e293b'
  const controlsClassName = isMonet
    ? `!bg-white/80 !border-slate-200 !rounded-lg [&>button]:!bg-white/90 [&>button]:!border-slate-200 [&>button:hover]:!bg-slate-100 [&>button>svg]:!fill-slate-600`
    : `!bg-slate-800 !border-white/10 !rounded-lg [&>button]:!bg-slate-700 [&>button]:!border-white/10 [&>button:hover]:!bg-slate-600 [&>button>svg]:!fill-white`

  return (
    <div
      className={`h-[700px] rounded-xl ${className}`}
      style={{
        border: `1px solid ${theme.cardBorder}`,
        background: isMonet ? theme.panelBg : '#0a0a0a',
      }}
    >
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
        connectionLineStyle={{ stroke: theme.textMuted, strokeWidth: 2 }}
      >
        <Background color={backgroundDotColor} gap={20} size={1} />
        <Controls className={controlsClassName} />
        <Panel
          position="top-right"
          className="rounded-lg p-2 text-xs"
          style={{
            background: isMonet ? 'rgba(255, 255, 255, 0.8)' : 'rgba(30, 41, 59, 0.8)',
            color: theme.textMuted,
          }}
        >
          Drag nodes | Drag connectors | Scroll to zoom
        </Panel>
      </ReactFlow>

      {/* Summary Footer */}
      <div
        className="flex items-center justify-between px-4 py-3 text-sm"
        style={{ borderTop: `1px solid ${theme.cardBorder}` }}
      >
        <div className="flex gap-4">
          <div>
            <span style={{ color: theme.textMuted }}>Monthly CPF: </span>
            <span className="font-medium" style={{ color: theme.sage }}>{formatCurrency(calculations.totalContrib)}</span>
          </div>
          <div>
            <span style={{ color: theme.textMuted }}>RA at 55: </span>
            <span className="font-medium" style={{ color: theme.purple }}>{formatCurrency(calculations.raBalance)}</span>
          </div>
          <div>
            <span style={{ color: theme.textMuted }}>Monthly Payout: </span>
            <span className="font-medium" style={{ color: theme.purple }}>{formatCurrency(calculations.monthlyPayout)}</span>
          </div>
          <div>
            <span style={{ color: theme.textMuted }}>Withdrawable: </span>
            <span className="font-medium" style={{ color: theme.sage }}>{formatCurrency(calculations.withdrawable)}</span>
          </div>
        </div>
        <div className="text-xs" style={{ color: theme.textMuted }}>
          FRS: {formatCurrency(FRS_2025)} (2025)
        </div>
      </div>
    </div>
  )
}
