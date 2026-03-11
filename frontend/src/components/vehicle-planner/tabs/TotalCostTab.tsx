'use client'

import { useMemo } from 'react'
import clsx from 'clsx'

import type { VehicleScenario, VehicleCalculationResult } from '@/types/vehicle'
import { useColorScheme } from '@/stores'
import { useVehiclePlannerStore, useVehiclePlannerActions } from '@/stores/vehiclePlannerStore'
import { calculateVehicle } from '@/lib/vehicle/calculations'
import { formatCurrency } from '@/lib/format'
import { isElectric } from '@/lib/vehicle/formatting'

interface TotalCostTabProps {
  scenario: VehicleScenario
  result: VehicleCalculationResult
}

const PERIOD_OPTIONS = [3, 5, 7, 10]

export function TotalCostTab({ scenario }: TotalCostTabProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const ownershipYears = useVehiclePlannerStore((s) => s.ownershipYears)
  const { setOwnershipYears } = useVehiclePlannerActions()

  const result = useMemo(
    () => calculateVehicle(scenario.inputs, scenario.recurringCosts, ownershipYears),
    [scenario.inputs, scenario.recurringCosts, ownershipYears]
  )

  const tco = result.totalCostOfOwnership

  // Recurring costs summary
  const recurringTotal = tco.totalRoadTax + tco.totalInsurance + tco.totalFuel +
    tco.totalMaintenance + tco.totalParking + tco.totalErp + tco.totalOther

  const recurringItems = [
    { label: 'Road Tax', value: tco.totalRoadTax, color: '#C53D43' },
    { label: 'Insurance', value: tco.totalInsurance, color: '#C53D43' },
    { label: isElectric(scenario.inputs.fuelType) ? 'Fuel (Electric)' : 'Fuel (Petrol)', value: tco.totalFuel, color: '#C53D43' },
    { label: 'Maintenance', value: tco.totalMaintenance, color: '#6B7280' },
    { label: 'Parking', value: tco.totalParking, color: '#6B7280' },
    { label: 'ERP / Tolls', value: tco.totalErp + tco.totalOther, color: '#6B7280' },
  ]

  const cardClasses = clsx(
    'rounded-sm border',
    isMonet ? 'bg-white border-[#E8E6E1]' : 'bg-[#1A1A1D] border-[#2D2D33]'
  )

  return (
    <div className={clsx(
      'p-8 space-y-6',
      isMonet ? 'bg-[#F7F6F3]' : 'bg-[#121214]'
    )}>
      {/* Three Metric Cards Row */}
      <div className="flex gap-4">
        {/* 10-Year Net Cost */}
        <div className={clsx(cardClasses, 'flex-1 p-5')}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-[#C53D43]" />
            <span className={clsx('text-[13px]', isMonet ? 'text-[#9CA3AF]' : 'text-[#9CA3AF]')}>
              {ownershipYears}-Year Net Cost
            </span>
          </div>
          <div className={clsx(
            'text-[28px] font-mono font-medium tabular-nums',
            isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
          )}>
            {formatCurrency(tco.netTotalCost)}
          </div>
        </div>

        {/* Cost/Month */}
        <div className={clsx(cardClasses, 'flex-1 p-5')}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-[#6B7280]" />
            <span className={clsx('text-[13px]', isMonet ? 'text-[#9CA3AF]' : 'text-[#9CA3AF]')}>
              Cost / Month
            </span>
          </div>
          <div className={clsx(
            'text-[28px] font-mono font-medium tabular-nums',
            isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
          )}>
            {formatCurrency(tco.costPerMonth)}
          </div>
        </div>

        {/* Residual Value */}
        <div className={clsx(cardClasses, 'flex-1 p-5')}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-[#22C55E]" />
            <span className={clsx('text-[13px]', isMonet ? 'text-[#9CA3AF]' : 'text-[#9CA3AF]')}>
              Residual Value
            </span>
          </div>
          <div className={clsx(
            'text-[28px] font-mono font-medium tabular-nums',
            isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
          )}>
            {formatCurrency(tco.residualValue)}
          </div>
        </div>
      </div>

      {/* Ownership Period Selector */}
      <div className="flex items-center justify-between">
        <span className={clsx(
          'text-sm font-semibold',
          isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
        )}>
          Ownership Period
        </span>
        <div className={clsx(
          'flex rounded-sm p-0.5',
          isMonet ? 'bg-[#F7F6F3]' : 'bg-[#121214]'
        )}>
          {PERIOD_OPTIONS.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => setOwnershipYears(year)}
              className={clsx(
                'px-3.5 py-1.5 rounded-sm text-xs font-medium transition-all',
                ownershipYears === year
                  ? isMonet
                    ? 'bg-white text-[var(--monet-text-primary)] shadow-sm border border-[#E8E6E1]'
                    : 'bg-[#2D2D33] text-[#E8E6E1]'
                  : isMonet
                    ? 'text-[#9CA3AF] hover:text-[var(--monet-text-primary)]'
                    : 'text-[#9CA3AF] hover:text-[#E8E6E1]'
              )}
            >
              {year} yr
            </button>
          ))}
        </div>
      </div>

      {/* Recurring Costs Card */}
      <div className={cardClasses}>
        {/* Header */}
        <div className={clsx(
          'flex items-center justify-between px-5 py-4 border-b',
          isMonet ? 'border-[#E8E6E1]' : 'border-[#2D2D33]'
        )}>
          <span className={clsx(
            'text-base font-semibold',
            isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
          )}>
            Recurring Costs ({ownershipYears} Years)
          </span>
          <span className="text-base font-mono font-semibold tabular-nums text-[#C53D43]">
            {formatCurrency(recurringTotal)}
          </span>
        </div>

        {/* 2-column grid */}
        <div className="flex">
          <div className={clsx(
            'flex-1 p-5 space-y-3',
          )}>
            {recurringItems.slice(0, 3).map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className={clsx('text-xs', isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]')}>
                    {item.label}
                  </span>
                </div>
                <span className={clsx(
                  'font-mono text-xs font-medium tabular-nums',
                  isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
                )}>
                  {item.value > 0 ? formatCurrency(item.value) : '—'}
                </span>
              </div>
            ))}
          </div>
          <div className={clsx(
            'flex-1 p-5 space-y-3 border-l',
            isMonet ? 'border-[#E8E6E1]' : 'border-[#2D2D33]'
          )}>
            {recurringItems.slice(3).map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className={clsx('text-xs', isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]')}>
                    {item.label}
                  </span>
                </div>
                <span className={clsx(
                  'font-mono text-xs font-medium tabular-nums',
                  isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
                )}>
                  {item.value > 0 ? formatCurrency(item.value) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TCO Breakdown Card */}
      <div className={clsx(cardClasses, 'p-5 space-y-3')}>
        <h3 className={clsx(
          'text-base font-semibold',
          isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
        )}>
          Total Cost of Ownership Breakdown
        </h3>

        {/* Line items */}
        <div className="flex items-center justify-between">
          <span className={clsx('text-xs', isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]')}>
            Upfront Cost (Registration)
          </span>
          <span className={clsx(
            'font-mono text-xs font-medium tabular-nums',
            isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
          )}>
            {formatCurrency(tco.upfrontCosts)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className={clsx('text-xs', isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]')}>
            Loan Interest ({scenario.inputs.loanTenureYears} years)
          </span>
          <span className={clsx(
            'font-mono text-xs font-medium tabular-nums',
            isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
          )}>
            {formatCurrency(tco.totalLoanInterest)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className={clsx('text-xs', isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]')}>
            Recurring Costs ({ownershipYears} years)
          </span>
          <span className={clsx(
            'font-mono text-xs font-medium tabular-nums',
            isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
          )}>
            {formatCurrency(recurringTotal)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className={clsx('text-xs', isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]')}>
            Less: Residual Value
          </span>
          <span className="font-mono text-xs font-medium tabular-nums text-[#22C55E]">
            ({formatCurrency(tco.residualValue)})
          </span>
        </div>

        {/* Divider */}
        <div className={clsx('h-px', isMonet ? 'bg-[#E8E6E1]' : 'bg-[#2D2D33]')} />

        {/* Net Total */}
        <div className="flex items-center justify-between">
          <span className={clsx(
            'text-[13px] font-semibold',
            isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
          )}>
            Net Total Cost of Ownership
          </span>
          <span className="font-mono text-base font-semibold tabular-nums text-[#C53D43]">
            {formatCurrency(tco.netTotalCost)}
          </span>
        </div>

        {/* Per Year / Per Month */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <span className={clsx('text-xs', isMonet ? 'text-[#9CA3AF]' : 'text-[#9CA3AF]')}>Per Year:</span>
            <span className={clsx(
              'font-mono text-xs font-medium tabular-nums',
              isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
            )}>
              {formatCurrency(tco.costPerYear)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={clsx('text-xs', isMonet ? 'text-[#9CA3AF]' : 'text-[#9CA3AF]')}>Per Month:</span>
            <span className={clsx(
              'font-mono text-xs font-medium tabular-nums',
              isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
            )}>
              {formatCurrency(tco.costPerMonth)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
