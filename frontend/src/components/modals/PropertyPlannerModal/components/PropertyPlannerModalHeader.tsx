"use client"

import { Building2, X, ArrowLeft, ExternalLink } from 'lucide-react'
import { IconPicker } from '@/components/modals/ScenarioEventModal/components/IconPicker'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import { propertyOptions } from '../constants'
import type { PropertyType } from '@/app/property-planner/types'
import type { HeaderState } from '../PropertyPlannerView'

interface PropertyPlannerModalHeaderProps {
  headerState: HeaderState | null
  onClose: () => void
}

export function PropertyPlannerModalHeader({ headerState, onClose }: PropertyPlannerModalHeaderProps) {
  return (
    <div className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-white/[0.06]">
      <div className="flex items-center justify-between gap-3">
        {headerState ? (
          <EditModeHeader headerState={headerState} />
        ) : (
          <ListModeHeader />
        )}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors flex-shrink-0"
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
function EditModeHeader({ headerState }: { headerState: HeaderState }) {
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
        className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all flex-shrink-0"
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
          className="text-lg sm:text-xl font-semibold text-white tracking-tight bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-600 hover:bg-white/[0.03] focus:bg-white/[0.05] rounded-lg px-2 py-1 -ml-2 transition-colors min-w-0 flex-1"
          placeholder="Scenario name"
        />

        {headerState.onJumpToDate && headerState.loanStartMonth && (
          <button
            type="button"
            onClick={handleJumpToDate}
            className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-blue-400 hover:border-blue-500/40 hover:bg-white/[0.05] transition-all flex-shrink-0"
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
function ListModeHeader() {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/5 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
        <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
      </div>
      <div className="min-w-0">
        <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">Property Scenarios</h2>
        <p className="text-xs sm:text-sm text-slate-500 truncate">Create and compare different property purchase scenarios</p>
      </div>
    </div>
  )
}
