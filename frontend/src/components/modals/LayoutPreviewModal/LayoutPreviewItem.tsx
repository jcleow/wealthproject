import clsx from 'clsx'
import type { LayoutOption, DashboardLayout } from './layoutTypes'

interface LayoutPreviewItemProps {
  option: LayoutOption
  isSelected: boolean
  onSelect: (id: DashboardLayout) => void
  isMonet?: boolean
}

export function LayoutPreviewItem({ option, isSelected, onSelect, isMonet = false }: LayoutPreviewItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      className={clsx(
        'group flex flex-col items-center gap-3 p-4 rounded-xl transition-all duration-200',
        'border',
        isSelected
          ? isMonet
            ? 'border-[var(--monet-lavender)]/40 bg-[var(--monet-lavender)]/10'
            : 'border-blue-500/40 bg-blue-500/10'
          : isMonet
            ? 'border-[var(--monet-lavender)]/10 bg-[var(--monet-lavender)]/5 hover:border-[var(--monet-lavender)]/20 hover:bg-[var(--monet-lavender)]/10'
            : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
      )}
    >
      {/* Layout visualization */}
      <div
        className={clsx(
          'w-32 h-24 rounded-lg overflow-hidden',
          'border',
          isSelected
            ? isMonet ? 'border-[var(--monet-lavender)]/30' : 'border-blue-500/30'
            : isMonet ? 'border-[var(--monet-lavender)]/15' : 'border-white/[0.08]'
        )}
      >
        {option.id === 'stacked' && <StackedPreview isSelected={isSelected} isMonet={isMonet} />}
        {option.id === 'chart-left' && <ChartLeftPreview isSelected={isSelected} isMonet={isMonet} />}
        {option.id === 'chart-right' && <ChartRightPreview isSelected={isSelected} isMonet={isMonet} />}
      </div>

      {/* Label and description */}
      <div className="text-center">
        <div
          className={clsx(
            'text-sm font-medium',
            isSelected
              ? isMonet ? 'text-[var(--monet-purple)]' : 'text-blue-400'
              : isMonet ? 'text-[var(--monet-text-primary)]' : 'text-slate-200'
          )}
        >
          {option.label}
        </div>
        <div className={clsx(
          'text-xs mt-0.5',
          isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500'
        )}>{option.description}</div>
      </div>
    </button>
  )
}

function StackedPreview({ isSelected, isMonet }: { isSelected: boolean; isMonet: boolean }) {
  const bgColor = isMonet ? 'bg-slate-100' : 'bg-[#0a0a0a]'
  const chartBg = isSelected
    ? isMonet ? 'bg-[var(--monet-lavender)]/20' : 'bg-blue-500/20'
    : isMonet ? 'bg-[var(--monet-lavender)]/10' : 'bg-white/[0.06]'
  const cardBg = isSelected
    ? isMonet ? 'bg-[var(--monet-lavender)]/10' : 'bg-blue-500/10'
    : isMonet ? 'bg-[var(--monet-lavender)]/5' : 'bg-white/[0.03]'
  const strokeColor = isSelected
    ? isMonet ? 'rgba(155, 139, 180, 0.6)' : 'rgba(59, 130, 246, 0.5)'
    : isMonet ? 'rgba(155, 139, 180, 0.3)' : 'rgba(255, 255, 255, 0.15)'

  return (
    <div className={clsx('h-full flex flex-col gap-1 p-1.5', bgColor)}>
      {/* Chart area - top */}
      <div className={clsx('flex-[3] rounded', chartBg)}>
        {/* Chart line visualization */}
        <svg className="w-full h-full" preserveAspectRatio="none">
          <path
            d="M 5 70 Q 30 60, 50 50 T 95 30"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
          />
        </svg>
      </div>
      {/* Cards area - bottom */}
      <div className="flex-[2] flex gap-1">
        <div className={clsx('flex-1 rounded', cardBg)}>
          <CardGridPattern isMonet={isMonet} />
        </div>
        <div className={clsx('flex-1 rounded', cardBg)}>
          <CardGridPattern isMonet={isMonet} />
        </div>
      </div>
    </div>
  )
}

function ChartLeftPreview({ isSelected, isMonet }: { isSelected: boolean; isMonet: boolean }) {
  const bgColor = isMonet ? 'bg-slate-100' : 'bg-[#0a0a0a]'
  const chartBg = isSelected
    ? isMonet ? 'bg-[var(--monet-lavender)]/20' : 'bg-blue-500/20'
    : isMonet ? 'bg-[var(--monet-lavender)]/10' : 'bg-white/[0.06]'
  const cardBg = isSelected
    ? isMonet ? 'bg-[var(--monet-lavender)]/10' : 'bg-blue-500/10'
    : isMonet ? 'bg-[var(--monet-lavender)]/5' : 'bg-white/[0.03]'
  const strokeColor = isSelected
    ? isMonet ? 'rgba(155, 139, 180, 0.6)' : 'rgba(59, 130, 246, 0.5)'
    : isMonet ? 'rgba(155, 139, 180, 0.3)' : 'rgba(255, 255, 255, 0.15)'

  return (
    <div className={clsx('h-full flex gap-1 p-1.5', bgColor)}>
      {/* Chart area - left */}
      <div className={clsx('flex-[2] rounded', chartBg)}>
        <svg className="w-full h-full" preserveAspectRatio="none">
          <path
            d="M 5 80 Q 30 70, 50 50 T 95 20"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
          />
        </svg>
      </div>
      {/* Cards area - right */}
      <div className="flex-1 flex flex-col gap-1">
        <div className={clsx('flex-1 rounded', cardBg)}>
          <CardGridPattern isMonet={isMonet} />
        </div>
        <div className={clsx('flex-1 rounded', cardBg)}>
          <CardGridPattern isMonet={isMonet} />
        </div>
      </div>
    </div>
  )
}

function ChartRightPreview({ isSelected, isMonet }: { isSelected: boolean; isMonet: boolean }) {
  const bgColor = isMonet ? 'bg-slate-100' : 'bg-[#0a0a0a]'
  const chartBg = isSelected
    ? isMonet ? 'bg-[var(--monet-lavender)]/20' : 'bg-blue-500/20'
    : isMonet ? 'bg-[var(--monet-lavender)]/10' : 'bg-white/[0.06]'
  const cardBg = isSelected
    ? isMonet ? 'bg-[var(--monet-lavender)]/10' : 'bg-blue-500/10'
    : isMonet ? 'bg-[var(--monet-lavender)]/5' : 'bg-white/[0.03]'
  const strokeColor = isSelected
    ? isMonet ? 'rgba(155, 139, 180, 0.6)' : 'rgba(59, 130, 246, 0.5)'
    : isMonet ? 'rgba(155, 139, 180, 0.3)' : 'rgba(255, 255, 255, 0.15)'

  return (
    <div className={clsx('h-full flex gap-1 p-1.5', bgColor)}>
      {/* Cards area - left */}
      <div className="flex-1 flex flex-col gap-1">
        <div className={clsx('flex-1 rounded', cardBg)}>
          <CardGridPattern isMonet={isMonet} />
        </div>
        <div className={clsx('flex-1 rounded', cardBg)}>
          <CardGridPattern isMonet={isMonet} />
        </div>
      </div>
      {/* Chart area - right */}
      <div className={clsx('flex-[2] rounded', chartBg)}>
        <svg className="w-full h-full" preserveAspectRatio="none">
          <path
            d="M 5 80 Q 30 70, 50 50 T 95 20"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  )
}

function CardGridPattern({ isMonet }: { isMonet: boolean }) {
  const lineColor = isMonet ? 'bg-[var(--monet-lavender)]/20' : 'bg-white/[0.08]'
  const lineColorLight = isMonet ? 'bg-[var(--monet-lavender)]/10' : 'bg-white/[0.04]'

  return (
    <div className="h-full w-full p-1 flex flex-col gap-0.5">
      <div className={clsx('h-1 w-3/4 rounded-sm', lineColor)} />
      <div className={clsx('h-0.5 w-1/2 rounded-sm', lineColorLight)} />
      <div className={clsx('h-0.5 w-2/3 rounded-sm', lineColorLight)} />
    </div>
  )
}
