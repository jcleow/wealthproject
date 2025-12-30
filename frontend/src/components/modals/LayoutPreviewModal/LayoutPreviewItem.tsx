import clsx from 'clsx'
import type { LayoutOption, DashboardLayout } from './layoutTypes'

interface LayoutPreviewItemProps {
  option: LayoutOption
  isSelected: boolean
  onSelect: (id: DashboardLayout) => void
}

export function LayoutPreviewItem({ option, isSelected, onSelect }: LayoutPreviewItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      className={clsx(
        'group flex flex-col items-center gap-3 p-4 rounded-xl transition-all duration-200',
        'border',
        isSelected
          ? 'border-blue-500/40 bg-blue-500/10'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
      )}
    >
      {/* Layout visualization */}
      <div
        className={clsx(
          'w-32 h-24 rounded-lg overflow-hidden',
          'border',
          isSelected ? 'border-blue-500/30' : 'border-white/[0.08]'
        )}
      >
        {option.id === 'stacked' && <StackedPreview isSelected={isSelected} />}
        {option.id === 'chart-left' && <ChartLeftPreview isSelected={isSelected} />}
        {option.id === 'chart-right' && <ChartRightPreview isSelected={isSelected} />}
      </div>

      {/* Label and description */}
      <div className="text-center">
        <div
          className={clsx(
            'text-sm font-medium',
            isSelected ? 'text-blue-400' : 'text-slate-200'
          )}
        >
          {option.label}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{option.description}</div>
      </div>
    </button>
  )
}

function StackedPreview({ isSelected }: { isSelected: boolean }) {
  return (
    <div className="h-full flex flex-col gap-1 p-1.5 bg-[#0a0a0a]">
      {/* Chart area - top */}
      <div
        className={clsx(
          'flex-[3] rounded',
          isSelected ? 'bg-blue-500/20' : 'bg-white/[0.06]'
        )}
      >
        {/* Chart line visualization */}
        <svg className="w-full h-full" preserveAspectRatio="none">
          <path
            d="M 5 70 Q 30 60, 50 50 T 95 30"
            fill="none"
            stroke={isSelected ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.15)'}
            strokeWidth="2"
          />
        </svg>
      </div>
      {/* Cards area - bottom */}
      <div className="flex-[2] flex gap-1">
        <div className={clsx('flex-1 rounded', isSelected ? 'bg-blue-500/10' : 'bg-white/[0.03]')}>
          <CardGridPattern />
        </div>
        <div className={clsx('flex-1 rounded', isSelected ? 'bg-blue-500/10' : 'bg-white/[0.03]')}>
          <CardGridPattern />
        </div>
      </div>
    </div>
  )
}

function ChartLeftPreview({ isSelected }: { isSelected: boolean }) {
  return (
    <div className="h-full flex gap-1 p-1.5 bg-[#0a0a0a]">
      {/* Chart area - left */}
      <div
        className={clsx(
          'flex-[2] rounded',
          isSelected ? 'bg-blue-500/20' : 'bg-white/[0.06]'
        )}
      >
        <svg className="w-full h-full" preserveAspectRatio="none">
          <path
            d="M 5 80 Q 30 70, 50 50 T 95 20"
            fill="none"
            stroke={isSelected ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.15)'}
            strokeWidth="2"
          />
        </svg>
      </div>
      {/* Cards area - right */}
      <div className="flex-1 flex flex-col gap-1">
        <div className={clsx('flex-1 rounded', isSelected ? 'bg-blue-500/10' : 'bg-white/[0.03]')}>
          <CardGridPattern />
        </div>
        <div className={clsx('flex-1 rounded', isSelected ? 'bg-blue-500/10' : 'bg-white/[0.03]')}>
          <CardGridPattern />
        </div>
      </div>
    </div>
  )
}

function ChartRightPreview({ isSelected }: { isSelected: boolean }) {
  return (
    <div className="h-full flex gap-1 p-1.5 bg-[#0a0a0a]">
      {/* Cards area - left */}
      <div className="flex-1 flex flex-col gap-1">
        <div className={clsx('flex-1 rounded', isSelected ? 'bg-blue-500/10' : 'bg-white/[0.03]')}>
          <CardGridPattern />
        </div>
        <div className={clsx('flex-1 rounded', isSelected ? 'bg-blue-500/10' : 'bg-white/[0.03]')}>
          <CardGridPattern />
        </div>
      </div>
      {/* Chart area - right */}
      <div
        className={clsx(
          'flex-[2] rounded',
          isSelected ? 'bg-blue-500/20' : 'bg-white/[0.06]'
        )}
      >
        <svg className="w-full h-full" preserveAspectRatio="none">
          <path
            d="M 5 80 Q 30 70, 50 50 T 95 20"
            fill="none"
            stroke={isSelected ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.15)'}
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  )
}

function CardGridPattern() {
  return (
    <div className="h-full w-full p-1 flex flex-col gap-0.5">
      <div className="h-1 w-3/4 rounded-sm bg-white/[0.08]" />
      <div className="h-0.5 w-1/2 rounded-sm bg-white/[0.04]" />
      <div className="h-0.5 w-2/3 rounded-sm bg-white/[0.04]" />
    </div>
  )
}
