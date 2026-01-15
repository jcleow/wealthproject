'use client'

import { useState } from 'react'
import { Plus, ChevronRight, Home, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { PropertyScenarioFull } from '@/types/propertyPlannerV2'

interface PropertyScenarioListProps {
  activeScenarios: PropertyScenarioFull[]
  draftScenarios: PropertyScenarioFull[]
  selectedScenarioId: string | null
  onSelectScenario: (id: string) => void
  onOpenPropertyPlanner?: () => void
}

/**
 * Property card in the left panel list - clickable to select
 */
function PropertyScenarioCard({
  scenario,
  isSelected,
  isDraft = false,
  onSelect,
}: {
  scenario: PropertyScenarioFull
  isSelected: boolean
  isDraft?: boolean
  onSelect: () => void
}) {
  const sg = scenario.propertySG
  if (!sg) return null

  // Calculate total CPF used for this property
  const holdingMonths = 60 // Simplified - would calculate from actual dates
  const b1Total = parseFloat(sg.borrower1DownpaymentCpfOa || '0') + (parseFloat(sg.borrower1MonthlyCpfOa || '0') * holdingMonths)
  const b2Total = sg.borrowerType === 'joint'
    ? parseFloat(sg.borrower2DownpaymentCpfOa || '0') + (parseFloat(sg.borrower2MonthlyCpfOa || '0') * holdingMonths)
    : 0
  const totalCpfUsed = b1Total + b2Total

  // Property type badge
  const propertyTypeLabel = sg.propertyType === 'hdb' ? 'HDB' : sg.propertySubtype === 'ec' ? 'EC' : 'Private'
  const propertyTypeColor = sg.propertyType === 'hdb'
    ? 'bg-blue-500/15 text-blue-400'
    : sg.propertySubtype === 'ec'
      ? 'bg-cyan-500/15 text-cyan-400'
      : 'bg-violet-500/15 text-violet-400'

  const PropertyIcon = sg.propertyType === 'hdb' ? Home : Building2

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left p-3 rounded-xl border transition-all",
        isSelected
          ? "border-gray-500 bg-black/40"
          : isDraft
            ? "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/30"
            : "border-gray-700 bg-black/20 hover:border-gray-600 hover:bg-black/40"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0",
          isSelected ? "bg-black/60" : isDraft ? "bg-amber-500/20" : "bg-black/40"
        )}>
          <PropertyIcon className={cn(
            "h-5 w-5",
            isSelected ? "text-white" : isDraft ? "text-amber-400" : "text-gray-400"
          )} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name + Badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white truncate">{sg.name}</span>
            <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", propertyTypeColor)}>
              {propertyTypeLabel}
            </span>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "px-1.5 py-0.5 rounded text-xs font-medium",
              isDraft
                ? "bg-amber-500/15 text-amber-400"
                : "bg-emerald-500/15 text-emerald-400"
            )}>
              {isDraft ? 'Draft' : 'Active'}
            </span>
          </div>

          {/* CPF Used */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">CPF Used</span>
            <span className="text-sm font-medium text-white font-mono tabular-nums">
              {formatCurrency(totalCpfUsed)}
            </span>
          </div>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <ChevronRight className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-3" />
        )}
      </div>
    </button>
  )
}

export function PropertyScenarioList({
  activeScenarios,
  draftScenarios,
  selectedScenarioId,
  onSelectScenario,
  onOpenPropertyPlanner,
}: PropertyScenarioListProps) {
  const [expandDrafts, setExpandDrafts] = useState(false)

  return (
    <div className="space-y-4">
      {/* Active Properties Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">
          Active Properties
          <span className="ml-2 text-gray-500">({activeScenarios.length})</span>
        </h3>
        <button
          type="button"
          onClick={onOpenPropertyPlanner}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {/* Active Property Cards */}
      {activeScenarios.length === 0 ? (
        <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-4 text-center">
          <p className="text-sm text-gray-400">No active properties</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeScenarios.map(scenario => (
            <PropertyScenarioCard
              key={scenario.scenario.id}
              scenario={scenario}
              isSelected={selectedScenarioId === scenario.scenario.id}
              onSelect={() => onSelectScenario(scenario.scenario.id)}
            />
          ))}
        </div>
      )}

      {/* Draft Properties (Collapsible) */}
      {draftScenarios.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setExpandDrafts(!expandDrafts)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition mb-2"
          >
            <span className={cn("transition-transform text-xs", expandDrafts && "rotate-90")}>▶</span>
            Draft Properties
            <span className="text-gray-500">({draftScenarios.length})</span>
          </button>

          {expandDrafts && (
            <div className="space-y-2">
              {draftScenarios.map(scenario => (
                <PropertyScenarioCard
                  key={scenario.scenario.id}
                  scenario={scenario}
                  isSelected={selectedScenarioId === scenario.scenario.id}
                  isDraft
                  onSelect={() => onSelectScenario(scenario.scenario.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
