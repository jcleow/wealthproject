"use client"

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { IconPicker } from './IconPicker'
import type { ScenarioEventFormState } from '../hooks'

const CalendarIcon = LucideIcons.Calendar as LucideIcon | undefined
const FileTextIcon = LucideIcons.FileText as LucideIcon | undefined

interface ScenarioFormFieldsProps {
  form: ScenarioEventFormState
  onFieldChange: <K extends keyof ScenarioEventFormState>(field: K, value: ScenarioEventFormState[K]) => void
  disabled?: boolean
  anchorYear?: number | null
  anchorMonth?: number | null
}

export function ScenarioFormFields({ form, onFieldChange, disabled, anchorYear, anchorMonth }: ScenarioFormFieldsProps) {
  // Build minDate and defaultViewDate from anchor values
  const minDate = anchorYear && anchorMonth
    ? `${anchorYear}-${String(anchorMonth).padStart(2, '0')}`
    : undefined
  const defaultViewDate = minDate

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
            <MonthPicker
              value={form.occursOn}
              onChange={(value) => onFieldChange('occursOn', value)}
              placeholder="Select month"
              disabled={disabled}
              className="w-full"
              minDate={minDate}
              defaultViewDate={defaultViewDate}
            />
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
