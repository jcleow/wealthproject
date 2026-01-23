"use client"

import { Building2, X, ArrowLeft, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconPicker } from '@/components/modals/ScenarioEventModal/components/IconPicker'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import { propertyOptions } from '../constants'
import type { PropertyType } from '@/app/property-planner/types'
import type { HeaderState } from '../PropertyPlannerView'

interface PropertyPlannerModalHeaderProps {
  headerState: HeaderState | null
  onClose: () => void
  isMonet?: boolean
}

export function PropertyPlannerModalHeader({ headerState, onClose, isMonet = false }: PropertyPlannerModalHeaderProps) {
  return (
    <div className={cn(
      "flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b",
      isMonet ? "border-[var(--monet-lavender)]/10" : "border-white/[0.06]"
    )}>
      <div className="flex items-center justify-between gap-3">
        {headerState ? (
          <EditModeHeader headerState={headerState} isMonet={isMonet} />
        ) : (
          <ListModeHeader isMonet={isMonet} />
        )}
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "p-1.5 rounded-lg transition-colors flex-shrink-0",
            isMonet
              ? "hover:bg-[var(--monet-lavender)]/10 text-[var(--monet-text-muted)] hover:text-[var(--monet-text-primary)]"
              : "hover:bg-white/[0.08] text-slate-400 hover:text-white"
          )}
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

/**
 * Edit mode header: Shows scenario-specific controls
 * - Back button
 * - IconPicker for purchase milestone
 * - Editable scenario name
 * - Jump to date button
 * - Property type dropdown
 */
function EditModeHeader({ headerState, isMonet }: { headerState: HeaderState; isMonet: boolean }) {
  const handleJumpToDate = () => {
    if (!headerState.onJumpToDate || !headerState.loanStartMonth) return

    const [yearStr, monthStr] = headerState.loanStartMonth.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)

    if (!isNaN(year) && !isNaN(month)) {
      headerState.onJumpToDate(year, month)
    }
  }

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <button
        type="button"
        onClick={headerState.onBack}
        className={cn(
          "p-2 rounded-xl border transition-all flex-shrink-0",
          isMonet
            ? "bg-[var(--monet-lavender)]/5 border-[var(--monet-lavender)]/15 text-[var(--monet-text-muted)] hover:text-[var(--monet-text-primary)] hover:bg-[var(--monet-lavender)]/10"
            : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.06]"
        )}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <IconPicker
        iconName={headerState.icon}
        iconColor={headerState.iconColor}
        searchQuery={headerState.iconSearch}
        onIconChange={headerState.onIconChange}
        onColorChange={headerState.onIconColorChange}
        onSearchChange={headerState.onIconSearchChange}
      />

      <div className="flex-1 min-w-0 flex items-center gap-2">
        <input
          type="text"
          value={headerState.name}
          onChange={(e) => headerState.onNameChange(e.target.value)}
          className={cn(
            "text-lg sm:text-xl font-semibold tracking-tight bg-transparent border-none outline-none focus:ring-0 rounded-lg px-2 py-1 -ml-2 transition-colors min-w-0 flex-1",
            isMonet
              ? "text-[var(--monet-text-primary)] placeholder:text-[var(--monet-text-muted)] hover:bg-[var(--monet-lavender)]/5 focus:bg-[var(--monet-lavender)]/10"
              : "text-white placeholder:text-slate-600 hover:bg-white/[0.03] focus:bg-white/[0.05]"
          )}
          placeholder="Scenario name"
        />

        {headerState.onJumpToDate && headerState.loanStartMonth && (
          <button
            type="button"
            onClick={handleJumpToDate}
            className={cn(
              "p-2 rounded-xl border transition-all flex-shrink-0",
              isMonet
                ? "bg-[var(--monet-lavender)]/5 border-[var(--monet-lavender)]/15 text-[var(--monet-text-muted)] hover:text-blue-500 hover:border-blue-500/40 hover:bg-blue-500/5"
                : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-blue-400 hover:border-blue-500/40 hover:bg-white/[0.05]"
            )}
            title="Jump to purchase date on timeline"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>

      <CustomDropdown
        value={headerState.propertyType}
        onChange={(value) => headerState.onPropertyTypeChange(value as PropertyType)}
        options={propertyOptions.map(opt => ({
          value: opt.id,
          label: opt.title,
        }))}
        minWidth="140px"
      />
    </div>
  )
}

/**
 * List mode header: Shows generic property scenarios title
 */
function ListModeHeader({ isMonet }: { isMonet: boolean }) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      <div className={cn(
        "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br border flex items-center justify-center flex-shrink-0",
        isMonet
          ? "from-violet-500/15 to-violet-600/5 border-violet-500/15"
          : "from-violet-500/20 to-violet-600/5 border-violet-500/20"
      )}>
        <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
      </div>
      <div className="min-w-0">
        <h2 className={cn(
          "text-base sm:text-lg font-semibold tracking-tight",
          isMonet ? "text-[var(--monet-text-primary)]" : "text-white"
        )}>Property Scenarios</h2>
        <p className={cn(
          "text-xs sm:text-sm truncate",
          isMonet ? "text-[var(--monet-text-muted)]" : "text-slate-500"
        )}>Create and compare different property purchase scenarios</p>
      </div>
    </div>
  )
}
