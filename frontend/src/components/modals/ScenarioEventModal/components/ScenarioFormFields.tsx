"use client"

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { IconPicker } from './IconPicker'
import type { ScenarioEventFormState } from '../hooks'

const CalendarIcon = LucideIcons.Calendar as LucideIcon | undefined
const FileTextIcon = LucideIcons.FileText as LucideIcon | undefined
const ExternalLinkIcon = LucideIcons.ExternalLink as LucideIcon | undefined

interface ScenarioFormFieldsProps {
  form: ScenarioEventFormState
  onFieldChange: <K extends keyof ScenarioEventFormState>(field: K, value: ScenarioEventFormState[K]) => void
  disabled?: boolean
  anchorYear?: number | null
  anchorMonth?: number | null
  onJumpToDate?: (year: number, month: number) => void
}

export function ScenarioFormFields({ form, onFieldChange, disabled, anchorYear, anchorMonth, onJumpToDate }: ScenarioFormFieldsProps) {
  // Build minDate and defaultViewDate from anchor values
  const minDate = anchorYear && anchorMonth
    ? `${anchorYear}-${String(anchorMonth).padStart(2, '0')}`
    : undefined
  const defaultViewDate = minDate

  // Parse occursOn to get year and month for jump functionality
  const handleJumpToDate = () => {
    if (!form.occursOn || !onJumpToDate) return
    const [yearStr, monthStr] = form.occursOn.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)
    if (!isNaN(year) && !isNaN(month)) {
      onJumpToDate(year, month)
    }
  }

  return (
    <div className="mt-6 space-y-5">
      {/* Event Details Section */}
      <div className="space-y-4">
        {/* Name + Icon row */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              Event Name
            </label>
            <div className="flex items-center gap-2">
              <IconPicker
                iconName={form.displayIcon}
                iconColor={form.iconColor}
                searchQuery={form.iconSearch}
                onIconChange={(name) => onFieldChange('displayIcon', name)}
                onColorChange={(color) => onFieldChange('iconColor', color)}
                onSearchChange={(query) => onFieldChange('iconSearch', query)}
                disabled={disabled}
              />
              <input
                value={form.name}
                onChange={(e) => onFieldChange('name', e.target.value)}
                className={`
                  flex-1 h-[42px]
                  px-4
                  rounded-xl
                  border border-white/[0.08] focus:border-blue-500/40
                  bg-white/[0.03] focus:bg-white/[0.05]
                  text-white placeholder:text-slate-600
                  text-sm
                  outline-none
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                `}
                placeholder="e.g., Job Loss, Home Purchase, Retirement"
                disabled={disabled}
              />
            </div>
          </div>

          {/* Occurs on */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              {CalendarIcon && <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />}
              Occurs On
            </label>
            <div className="flex items-center gap-2">
              <MonthPicker
                value={form.occursOn}
                onChange={(value) => onFieldChange('occursOn', value)}
                placeholder="Select month"
                disabled={disabled}
                className="flex-1"
                minDate={minDate}
                defaultViewDate={defaultViewDate}
              />
              {onJumpToDate && form.occursOn && (
                <button
                  type="button"
                  onClick={handleJumpToDate}
                  disabled={disabled}
                  className={`
                    flex items-center justify-center
                    h-[42px] px-3
                    rounded-xl
                    border border-white/[0.08] hover:border-blue-500/40
                    bg-white/[0.03] hover:bg-white/[0.05]
                    text-slate-400 hover:text-blue-400
                    text-sm
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200
                  `}
                  title="Jump to this date on timeline"
                >
                  {ExternalLinkIcon && <ExternalLinkIcon className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            {FileTextIcon && <FileTextIcon className="h-3.5 w-3.5 text-slate-500" />}
            Description
            <span className="text-xs text-slate-600 font-normal">(optional)</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => onFieldChange('description', e.target.value)}
            rows={2}
            className={`
              w-full
              px-4 py-3
              rounded-xl
              border border-white/[0.08] focus:border-blue-500/40
              bg-white/[0.03] focus:bg-white/[0.05]
              text-white placeholder:text-slate-600
              text-sm leading-relaxed
              outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              resize-none
              transition-all duration-200
            `}
            placeholder="Briefly describe this scenario..."
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
