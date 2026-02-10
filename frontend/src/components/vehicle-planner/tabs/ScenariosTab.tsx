'use client'

import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import clsx from 'clsx'

import { useColorScheme } from '@/stores'
import {
  useVehicleScenarios,
  useVehiclePlannerActions,
  useVehiclePlannerStore,
} from '@/stores/vehiclePlannerStore'
import { calculateVehicle } from '@/lib/vehicle/calculations'
import { formatCurrency } from '@/lib/format'
import { formatVehicleCategoryShort, formatFuelType } from '@/lib/vehicle/formatting'

interface ScenarioResult {
  scenario: ReturnType<typeof useVehicleScenarios>[0]
  result: ReturnType<typeof calculateVehicle>
}

function ComparisonRow({
  label,
  values,
  difference,
  isMonet,
}: {
  label: string
  values: string[]
  difference?: { text: string; isPositive: boolean } | null
  isMonet?: boolean
}) {
  return (
    <div className={clsx(
      'flex items-center px-5 py-3 border-b last:border-b-0',
      isMonet ? 'border-[#E8E6E1]' : 'border-[#2D2D33]'
    )}>
      <div className={clsx('w-[180px] text-xs', isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]')}>
        {label}
      </div>
      {values.map((val, idx) => (
        <div
          key={idx}
          className={clsx(
            'flex-1 text-right font-mono text-xs font-medium tabular-nums',
            isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
          )}
        >
          {val}
        </div>
      ))}
      {difference !== undefined && (
        <div className={clsx(
          'w-[120px] text-right font-mono text-xs font-medium tabular-nums',
          difference
            ? difference.isPositive ? 'text-[#C53D43]' : 'text-[#22C55E]'
            : isMonet ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
        )}>
          {difference?.text ?? '—'}
        </div>
      )}
    </div>
  )
}

interface ScenariosTabProps {
  onAddScenario?: () => void
}

export function ScenariosTab({ onAddScenario }: ScenariosTabProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const scenarios = useVehicleScenarios()
  const ownershipYears = useVehiclePlannerStore((s) => s.ownershipYears)
  const {
    addScenario,
    setActiveScenario,
    toggleIncluded,
    updateScenarioName,
    setActiveTab,
  } = useVehiclePlannerActions()

  const handleAddScenario = onAddScenario ?? (() => addScenario())

  const scenarioResults = useMemo<ScenarioResult[]>(() => {
    return scenarios.map((s) => ({
      scenario: s,
      result: calculateVehicle(s.inputs, s.recurringCosts, ownershipYears),
    }))
  }, [scenarios, ownershipYears])

  const cardClasses = clsx(
    'rounded-sm border',
    isMonet ? 'bg-white border-[#E8E6E1]' : 'bg-[#1A1A1D] border-[#2D2D33]'
  )

  // Compute differences for comparison (only when 2 scenarios)
  function getDifference(a: number, b: number): { text: string; isPositive: boolean } | null {
    const diff = b - a
    if (diff === 0) return null
    return {
      text: diff > 0 ? `+${formatCurrency(diff)}` : `${formatCurrency(diff)}`,
      isPositive: diff > 0,
    }
  }

  return (
    <div className={clsx(
      'p-8 space-y-6',
      isMonet ? 'bg-[#F7F6F3]' : 'bg-[#121214]'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={clsx(
          'text-lg font-semibold',
          isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
        )}>
          Compare Scenarios
        </h3>
        <button
          type="button"
          onClick={handleAddScenario}
          className={clsx(
            'flex items-center gap-1.5 rounded-sm border px-4 py-2 text-xs font-medium transition-colors',
            isMonet
              ? 'bg-white border-[#E8E6E1] text-[var(--monet-text-primary)] hover:bg-[#F7F6F3]'
              : 'bg-transparent border-[#2D2D33] text-[#E8E6E1] hover:bg-[#1A1A1D]'
          )}
        >
          <Plus className="h-3 w-3" />
          Add Scenario
        </button>
      </div>

      {/* Scenario Cards */}
      <div className="flex gap-5">
        {scenarioResults.map(({ scenario, result }, index) => (
          <div
            key={scenario.id}
            className={clsx(cardClasses, 'flex-1 overflow-hidden rounded-lg cursor-pointer')}
            onClick={() => {
              setActiveScenario(scenario.id)
              setActiveTab('vehicle')
            }}
          >
            {/* Card header */}
            <div className={clsx(
              'px-5 py-4 border-b flex items-center justify-between',
              isMonet ? 'border-[#E8E6E1]' : 'border-[#2D2D33]'
            )}>
              <div>
                <div className={clsx('text-[10px] font-medium mb-0.5', isMonet ? 'text-[#9CA3AF]' : 'text-[#9CA3AF]')}>
                  Scenario {String.fromCharCode(65 + index)}
                </div>
                <input
                  value={scenario.name}
                  onChange={(e) => updateScenarioName(scenario.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={clsx(
                    'bg-transparent text-sm font-semibold focus:outline-none border-b border-transparent focus:border-current w-full',
                    isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
                  )}
                />
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleIncluded(scenario.id) }}
                className={clsx(
                  'rounded-sm px-2.5 py-1 text-[10px] font-medium shrink-0',
                  scenario.isIncluded
                    ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20'
                    : isMonet
                      ? 'bg-[#F7F6F3] text-[#9CA3AF] border border-[#E8E6E1]'
                      : 'bg-[#121214] text-[#6B7280] border border-[#2D2D33]'
                )}
              >
                {scenario.isIncluded ? '✓ Included' : 'Not Included'}
              </button>
            </div>

            {/* Key-value pairs */}
            <div className="px-5 py-4 space-y-2">
              {[
                { label: 'Category', value: `${formatVehicleCategoryShort(scenario.inputs.vehicleCategory)} (${scenario.inputs.vehicleCategory === 'motorcycle_cat_d' ? 'Motorcycle' : scenario.inputs.engineCapacityCc ? `${scenario.inputs.engineCapacityCc}cc` : ''})` },
                { label: 'Fuel Type', value: formatFuelType(scenario.inputs.fuelType) },
                { label: 'OMV', value: formatCurrency(scenario.inputs.omv) },
                { label: 'COE', value: formatCurrency(scenario.inputs.coePrice) },
                { label: 'Registration Cost', value: formatCurrency(result.totalRegistrationCost) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-xs">
                  <span className={isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]'}>{row.label}</span>
                  <span className={clsx(
                    'font-mono font-medium tabular-nums',
                    isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
                  )}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Bottom metrics strip */}
            <div className={clsx(
              'flex items-center border-t px-5 py-3',
              isMonet ? 'border-[#E8E6E1] bg-[#F7F6F3]' : 'border-[#2D2D33] bg-[#121214]'
            )}>
              <div className="flex-1 text-center">
                <div className={clsx('text-[10px]', isMonet ? 'text-[#9CA3AF]' : 'text-[#6B7280]')}>
                  {ownershipYears}-Year TCO
                </div>
                <div className={clsx(
                  'font-mono text-sm font-medium tabular-nums',
                  isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
                )}>
                  {formatCurrency(result.totalCostOfOwnership.netTotalCost)}
                </div>
              </div>
              <div className={clsx('h-6 w-px mx-2', isMonet ? 'bg-[#E8E6E1]' : 'bg-[#2D2D33]')} />
              <div className="flex-1 text-center">
                <div className={clsx('text-[10px]', isMonet ? 'text-[#9CA3AF]' : 'text-[#6B7280]')}>
                  Monthly Cost
                </div>
                <div className={clsx(
                  'font-mono text-sm font-medium tabular-nums',
                  isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
                )}>
                  {formatCurrency(result.totalCostOfOwnership.costPerMonth)}
                </div>
              </div>
              <div className={clsx('h-6 w-px mx-2', isMonet ? 'bg-[#E8E6E1]' : 'bg-[#2D2D33]')} />
              <div className="flex-1 text-center">
                <div className={clsx('text-[10px]', isMonet ? 'text-[#9CA3AF]' : 'text-[#6B7280]')}>
                  Depreciation/yr
                </div>
                <div className={clsx(
                  'font-mono text-sm font-medium tabular-nums',
                  isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
                )}>
                  {formatCurrency(result.totalCostOfOwnership.costPerYear - result.totalCostOfOwnership.costPerMonth * 12 / ownershipYears + (result.depreciationSchedule[0]?.annualDepreciation ?? 0))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      {scenarioResults.length >= 2 && (
        <div className={clsx(cardClasses, 'overflow-hidden rounded-lg')}>
          {/* Header row */}
          <div className={clsx(
            'flex items-center px-5 py-3.5 border-b',
            isMonet ? 'bg-[#FAFAF8] border-[#E8E6E1]' : 'bg-[#121214] border-[#2D2D33]'
          )}>
            <div className={clsx(
              'w-[180px] text-xs font-medium',
              isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]'
            )}>
              Metric
            </div>
            {scenarioResults.map(({ scenario }, idx) => (
              <div
                key={scenario.id}
                className={clsx(
                  'flex-1 text-right text-xs font-medium',
                  isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
                )}
              >
                Scenario {String.fromCharCode(65 + idx)}
              </div>
            ))}
            {scenarioResults.length === 2 && (
              <div className={clsx(
                'w-[120px] text-right text-xs font-medium',
                isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]'
              )}>
                Difference
              </div>
            )}
          </div>

          {/* Comparison rows */}
          {[
            {
              label: 'Registration Cost',
              values: scenarioResults.map((s) => formatCurrency(s.result.totalRegistrationCost)),
              difference: scenarioResults.length === 2
                ? getDifference(scenarioResults[0].result.totalRegistrationCost, scenarioResults[1].result.totalRegistrationCost)
                : undefined,
            },
            {
              label: `${ownershipYears}-Year TCO`,
              values: scenarioResults.map((s) => formatCurrency(s.result.totalCostOfOwnership.netTotalCost)),
              difference: scenarioResults.length === 2
                ? getDifference(scenarioResults[0].result.totalCostOfOwnership.netTotalCost, scenarioResults[1].result.totalCostOfOwnership.netTotalCost)
                : undefined,
            },
            {
              label: 'Monthly Cost',
              values: scenarioResults.map((s) => formatCurrency(s.result.totalCostOfOwnership.costPerMonth)),
              difference: scenarioResults.length === 2
                ? getDifference(scenarioResults[0].result.totalCostOfOwnership.costPerMonth, scenarioResults[1].result.totalCostOfOwnership.costPerMonth)
                : undefined,
            },
            {
              label: 'Annual Road Tax',
              values: scenarioResults.map((s) => formatCurrency(s.result.annualRoadTax)),
              difference: scenarioResults.length === 2
                ? getDifference(scenarioResults[0].result.annualRoadTax, scenarioResults[1].result.annualRoadTax)
                : undefined,
            },
            {
              label: 'Annual Fuel/Energy',
              values: scenarioResults.map((s) => formatCurrency(s.scenario.recurringCosts.fuelMonthly * 12)),
              difference: scenarioResults.length === 2
                ? getDifference(scenarioResults[0].scenario.recurringCosts.fuelMonthly * 12, scenarioResults[1].scenario.recurringCosts.fuelMonthly * 12)
                : undefined,
            },
            {
              label: `Residual Value (Yr ${ownershipYears})`,
              values: scenarioResults.map((s) => formatCurrency(s.result.totalCostOfOwnership.residualValue)),
              difference: scenarioResults.length === 2
                ? getDifference(scenarioResults[0].result.totalCostOfOwnership.residualValue, scenarioResults[1].result.totalCostOfOwnership.residualValue)
                : undefined,
            },
          ].map((row) => (
            <ComparisonRow
              key={row.label}
              label={row.label}
              values={row.values}
              difference={row.difference}
              isMonet={isMonet}
            />
          ))}
        </div>
      )}
    </div>
  )
}
