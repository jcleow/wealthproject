import { Shield, ShieldCheck, Star, Heart } from 'lucide-react'
import type { AccountKey, VisibleAccounts } from './types'
import { ACCOUNT_COLORS, THRESHOLD_COLORS } from './types'

interface BalanceLegendProps {
  visibleAccounts: VisibleAccounts
  onToggleAccount: (account: AccountKey) => void
}

const ACCOUNT_ITEMS: Array<{ key: AccountKey; label: string; dashed: boolean }> = [
  { key: 'oa', label: 'OA', dashed: false },
  { key: 'sa', label: 'SA', dashed: false },
  { key: 'ma', label: 'MA', dashed: false },
  { key: 'ra', label: 'RA', dashed: false },
  { key: 'oaSa', label: 'OA + SA', dashed: true },
]

const THRESHOLD_ITEMS = [
  { label: 'BRS', color: THRESHOLD_COLORS.brs, Icon: Shield },
  { label: 'FRS', color: THRESHOLD_COLORS.frs, Icon: ShieldCheck },
  { label: 'ERS', color: THRESHOLD_COLORS.ers, Icon: Star },
  { label: 'BHS', color: THRESHOLD_COLORS.bhs, Icon: Heart },
]

export function BalanceLegend({ visibleAccounts, onToggleAccount }: BalanceLegendProps) {
  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-3">
        {ACCOUNT_ITEMS.map((item) => (
          <AccountLegendButton
            key={item.key}
            accountKey={item.key}
            label={item.label}
            color={ACCOUNT_COLORS[item.key]}
            dashed={item.dashed}
            isVisible={visibleAccounts[item.key]}
            onToggle={onToggleAccount}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 pl-3 border-l border-white/[0.08]">
        {THRESHOLD_ITEMS.map((item) => (
          <ThresholdLegendItem key={item.label} {...item} />
        ))}
      </div>
    </div>
  )
}

function AccountLegendButton({
  accountKey,
  label,
  color,
  dashed,
  isVisible,
  onToggle,
}: {
  accountKey: AccountKey
  label: string
  color: string
  dashed: boolean
  isVisible: boolean
  onToggle: (key: AccountKey) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(accountKey)}
      className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-all duration-150 hover:bg-white/[0.05] ${
        isVisible ? '' : 'opacity-40'
      }`}
      title={isVisible ? `Hide ${label}` : `Show ${label}`}
    >
      {dashed ? (
        <svg width="10" height="2" className="flex-shrink-0">
          <line x1="0" y1="1" x2="10" y2="1" stroke={color} strokeWidth="2" strokeDasharray="2 1" />
        </svg>
      ) : (
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      )}
      <span className={`text-xs ${isVisible ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
    </button>
  )
}

function ThresholdLegendItem({
  label,
  color,
  Icon,
}: {
  label: string
  color: string
  Icon: typeof Shield
}) {
  return (
    <div className="flex items-center gap-1">
      <div
        className="flex items-center justify-center w-4 h-4 rounded-full"
        style={{ backgroundColor: color }}
      >
        <Icon className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
      </div>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  )
}
