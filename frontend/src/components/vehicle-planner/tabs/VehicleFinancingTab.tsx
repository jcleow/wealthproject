'use client'

import { useMemo } from 'react'
import { Bike, Car as CarIcon, Fuel, Zap, Leaf } from 'lucide-react'
import clsx from 'clsx'

import type { VehicleScenario, VehicleCalculationResult, VehicleCategory, FuelType, VesPeriod } from '@/types/vehicle'
import { useColorScheme } from '@/stores'
import { useVehiclePlannerStore, useVehiclePlannerActions } from '@/stores/vehiclePlannerStore'
import { formatCurrency } from '@/lib/format'
import { formatVesPeriod, getVesBandLabel, isElectric, isCar } from '@/lib/vehicle/formatting'
import { DEFAULT_RECURRING_COSTS } from '@/lib/vehicle/constants'

interface VehicleFinancingTabProps {
  scenario: VehicleScenario
  result: VehicleCalculationResult
}

const VEHICLE_CATEGORIES: { id: VehicleCategory; label: string; subtitle: string; icon: React.ElementType }[] = [
  { id: 'car_cat_a', label: 'Cat A', subtitle: '≤1,600cc | ≤97kW', icon: CarIcon },
  { id: 'car_cat_b', label: 'Cat B', subtitle: '>1,600cc | >97kW', icon: CarIcon },
  { id: 'motorcycle_cat_d', label: 'Cat D', subtitle: 'Motorcycles', icon: Bike },
]

const FUEL_TYPES: { id: FuelType; label: string; icon: React.ElementType }[] = [
  { id: 'petrol', label: 'Petrol', icon: Fuel },
  { id: 'diesel', label: 'Diesel', icon: Fuel },
  { id: 'electric', label: 'Electric', icon: Zap },
  { id: 'hybrid_petrol', label: 'Hybrid', icon: Leaf },
]

function SummaryRow({ label, value, isGreen, isBold, isMonet }: {
  label: string
  value: string
  isGreen?: boolean
  isBold?: boolean
  isMonet?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={clsx('text-xs', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-[#6B7280]')}>
        {label}
      </span>
      <span className={clsx(
        'font-mono text-xs tabular-nums',
        isBold ? 'font-semibold text-[13px]' : 'font-medium',
        isGreen
          ? 'text-[#22C55E]'
          : isBold
            ? isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
            : isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]',
      )}>
        {value}
      </span>
    </div>
  )
}

export function VehicleFinancingTab({ scenario, result }: VehicleFinancingTabProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const { updateScenarioInputs } = useVehiclePlannerActions()
  const inputs = scenario.inputs

  const handleCategoryChange = (category: VehicleCategory) => {
    const isMotorcycle = category === 'motorcycle_cat_d'
    const updates: Partial<typeof inputs> = { vehicleCategory: category }
    if (isMotorcycle && inputs.fuelType !== 'petrol') {
      updates.fuelType = 'petrol'
    }
    updateScenarioInputs(scenario.id, updates)
    const defaults = isMotorcycle ? DEFAULT_RECURRING_COSTS.motorcycle : DEFAULT_RECURRING_COSTS.car
    useVehiclePlannerStore.getState().updateScenarioRecurringCosts(scenario.id, defaults)
  }

  const vesBandLabel = useMemo(
    () => getVesBandLabel(inputs.co2EmissionsGkm, inputs.fuelType, inputs.vesPeriod),
    [inputs.co2EmissionsGkm, inputs.fuelType, inputs.vesPeriod]
  )

  const isEv = isElectric(inputs.fuelType)
  const isCarCategory = isCar(inputs.vehicleCategory)

  // Design-matched card classes
  const cardClasses = clsx(
    'rounded-sm border',
    isMonet
      ? 'bg-white border-[#E8E6E1]'
      : 'bg-[#1A1A1D] border-[#2D2D33]'
  )

  const inputFieldClasses = clsx(
    'w-full border-b py-2 text-sm font-mono tabular-nums bg-transparent focus:outline-none',
    isMonet
      ? 'border-[#E8E6E1] text-[var(--monet-text-primary)] focus:border-[var(--monet-lavender)]'
      : 'border-[#2D2D33] text-[#E8E6E1] focus:border-[#6B7280] bg-[#121214]'
  )

  const fieldLabelClasses = clsx(
    'text-xs font-medium mb-1',
    isMonet ? 'text-[var(--monet-text-muted)]' : 'text-[#6B7280]'
  )

  const sectionTitleClasses = clsx(
    'text-sm font-semibold',
    isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
  )

  return (
    <div className={clsx(
      'flex gap-6 p-8',
      isMonet ? 'bg-[#F7F6F3]' : 'bg-[#121214]'
    )}>
      {/* Left Column — Form */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Vehicle Category */}
        <div className="space-y-3">
          <span className={sectionTitleClasses}>Vehicle Category</span>
          <div className="grid grid-cols-3 gap-3">
            {VEHICLE_CATEGORIES.map((cat) => {
              const isActive = inputs.vehicleCategory === cat.id
              const Icon = cat.icon
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={clsx(
                    'flex flex-col items-start gap-2 rounded-sm border p-4 text-left transition-all',
                    isActive
                      ? isMonet
                        ? 'border-[#C53D43] border-2 bg-white'
                        : 'border-[#C53D43] border-2 bg-[#1A1A1D]'
                      : isMonet
                        ? 'border-[#E8E6E1] bg-white hover:border-[#C53D43]/40'
                        : 'border-[#2D2D33] bg-[#1A1A1D] hover:border-[#6B7280]'
                  )}
                >
                  <Icon className={clsx('h-5 w-5', isMonet ? 'text-[#6B7280]' : 'text-[#9CA3AF]')} />
                  <div>
                    <div className={clsx('text-sm font-semibold', isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]')}>
                      {cat.label}
                    </div>
                    <div className={clsx('text-[10px]', isMonet ? 'text-[#9CA3AF]' : 'text-[#6B7280]')}>
                      {cat.subtitle}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Fuel Type + Condition toggles row */}
        <div className="flex gap-6">
          <div className="flex-1 space-y-2">
            <span className={clsx('text-xs font-medium', isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]')}>
              Fuel Type
            </span>
            <div className={clsx(
              'flex rounded-sm p-0.5',
              isMonet ? 'bg-[#F7F6F3] border border-[#E8E6E1]' : 'bg-[#121214]'
            )}>
              {FUEL_TYPES
                .filter((ft) => inputs.vehicleCategory !== 'motorcycle_cat_d' || ft.id === 'petrol')
                .map((ft) => {
                  const isActive = inputs.fuelType === ft.id
                  return (
                    <button
                      key={ft.id}
                      type="button"
                      onClick={() => updateScenarioInputs(scenario.id, { fuelType: ft.id })}
                      className={clsx(
                        'flex-1 py-2 text-xs font-medium rounded-sm transition-all',
                        isActive
                          ? isMonet
                            ? 'bg-white text-[var(--monet-text-primary)] shadow-sm'
                            : 'bg-[#2D2D33] text-[#E8E6E1]'
                          : isMonet
                            ? 'text-[#9CA3AF] hover:text-[var(--monet-text-primary)]'
                            : 'text-[#6B7280] hover:text-[#9CA3AF]'
                      )}
                    >
                      {ft.label}
                    </button>
                  )
                })}
            </div>
          </div>

          <div className="w-[200px] space-y-2">
            <span className={clsx('text-xs font-medium', 'text-[#6B7280]')}>Condition</span>
            <div className={clsx(
              'flex rounded-sm p-0.5',
              isMonet ? 'bg-[#F7F6F3] border border-[#E8E6E1]' : 'bg-[#121214]'
            )}>
              {(['new', 'used'] as const).map((cond) => (
                <button
                  key={cond}
                  type="button"
                  onClick={() => updateScenarioInputs(scenario.id, {
                    condition: cond,
                    vehicleAge: cond === 'new' ? 0 : inputs.vehicleAge,
                    remainingCoeMonths: cond === 'new' ? 120 : inputs.remainingCoeMonths,
                  })}
                  className={clsx(
                    'flex-1 py-2 text-xs font-medium rounded-sm transition-all',
                    inputs.condition === cond
                      ? isMonet
                        ? 'bg-white text-[var(--monet-text-primary)] shadow-sm'
                        : 'bg-[#2D2D33] text-[#E8E6E1]'
                      : isMonet
                        ? 'text-[#9CA3AF]'
                        : 'text-[#6B7280] hover:text-[#9CA3AF]'
                  )}
                >
                  {cond === 'new' ? 'New' : 'Used'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicle Details & Pricing */}
        <div className="space-y-3">
          <span className={sectionTitleClasses}>Vehicle Details & Pricing</span>

          {/* Row 1: OMV | Engine/Power */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={fieldLabelClasses}>Open Market Value (OMV)</label>
              <input
                type="number"
                value={inputs.omv || ''}
                onChange={(e) => updateScenarioInputs(scenario.id, { omv: Number(e.target.value) })}
                className={inputFieldClasses}
                placeholder="$30,000"
              />
            </div>
            <div>
              {isEv ? (
                <>
                  <label className={fieldLabelClasses}>Power (kW)</label>
                  <input
                    type="number"
                    value={inputs.powerKw ?? ''}
                    onChange={(e) => updateScenarioInputs(scenario.id, { powerKw: e.target.value ? Number(e.target.value) : null })}
                    className={inputFieldClasses}
                    placeholder="110"
                  />
                </>
              ) : (
                <>
                  <label className={fieldLabelClasses}>Engine Capacity (CC)</label>
                  <input
                    type="number"
                    value={inputs.engineCapacityCc ?? ''}
                    onChange={(e) => updateScenarioInputs(scenario.id, { engineCapacityCc: e.target.value ? Number(e.target.value) : null })}
                    className={inputFieldClasses}
                    placeholder="1,598"
                  />
                </>
              )}
            </div>
          </div>

          {/* Row 2: CO2 | COE */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={fieldLabelClasses}>CO₂ Emissions (g/km)</label>
              <input
                type="number"
                value={inputs.co2EmissionsGkm ?? ''}
                onChange={(e) => updateScenarioInputs(scenario.id, { co2EmissionsGkm: e.target.value ? Number(e.target.value) : null })}
                className={inputFieldClasses}
                placeholder={isEv ? '0' : '118'}
              />
            </div>
            <div>
              <label className={fieldLabelClasses}>COE Premium</label>
              <input
                type="number"
                value={inputs.coePrice || ''}
                onChange={(e) => updateScenarioInputs(scenario.id, { coePrice: Number(e.target.value) })}
                className={inputFieldClasses}
                placeholder="$106,000"
              />
            </div>
          </div>

          {/* Row 3: List Price | VES Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={fieldLabelClasses}>
                {inputs.condition === 'used' ? 'List Price' : 'Dealer List Price'}
              </label>
              <input
                type="number"
                value={inputs.listPrice || ''}
                onChange={(e) => updateScenarioInputs(scenario.id, { listPrice: Number(e.target.value) })}
                className={inputFieldClasses}
                placeholder="$185,888"
              />
            </div>
            {inputs.condition === 'new' && isCarCategory ? (
              <div>
                <label className={fieldLabelClasses}>VES Period</label>
                <select
                  value={inputs.vesPeriod}
                  onChange={(e) => updateScenarioInputs(scenario.id, { vesPeriod: e.target.value as VesPeriod })}
                  className={clsx(inputFieldClasses, 'cursor-pointer')}
                >
                  {(['2024_2025', '2026', '2027'] as VesPeriod[]).map((period) => (
                    <option key={period} value={period}>{formatVesPeriod(period)}</option>
                  ))}
                </select>
              </div>
            ) : inputs.condition === 'used' ? (
              <div>
                <label className={fieldLabelClasses}>Vehicle Age (years)</label>
                <input
                  type="number"
                  value={inputs.vehicleAge || ''}
                  onChange={(e) => updateScenarioInputs(scenario.id, { vehicleAge: Number(e.target.value) })}
                  className={inputFieldClasses}
                  min={0}
                  max={20}
                />
              </div>
            ) : (
              <div />
            )}
          </div>

          {/* Used vehicle: remaining COE */}
          {inputs.condition === 'used' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={fieldLabelClasses}>Remaining COE (months)</label>
                <input
                  type="number"
                  value={inputs.remainingCoeMonths}
                  onChange={(e) => updateScenarioInputs(scenario.id, { remainingCoeMonths: Number(e.target.value) })}
                  className={inputFieldClasses}
                  min={0}
                  max={120}
                />
              </div>
              <div />
            </div>
          )}
        </div>

        {/* Financing Section */}
        <div className={clsx(cardClasses, 'p-5 space-y-3')}>
          <div className="flex items-center justify-between">
            <span className={sectionTitleClasses}>Financing</span>
            <button
              type="button"
              onClick={() => updateScenarioInputs(scenario.id, { useFinancing: !inputs.useFinancing })}
              className={clsx(
                'relative h-[22px] w-10 rounded-full transition-colors duration-200',
                inputs.useFinancing
                  ? 'bg-[#C53D43]'
                  : isMonet ? 'bg-[#E8E6E1]' : 'bg-[#2D2D33]'
              )}
            >
              <span className={clsx(
                'absolute left-0 top-[2px] h-[18px] w-[18px] rounded-full bg-white transition-transform duration-200 shadow-sm',
                inputs.useFinancing ? 'translate-x-[20px]' : 'translate-x-[2px]'
              )} />
            </button>
          </div>

          {inputs.useFinancing && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={fieldLabelClasses}>Loan Amount</label>
                  <input
                    type="number"
                    value={inputs.loanAmount || ''}
                    onChange={(e) => updateScenarioInputs(scenario.id, { loanAmount: Number(e.target.value) })}
                    className={inputFieldClasses}
                    placeholder={formatCurrency(result.maxLoanAllowed)}
                  />
                </div>
                <div>
                  <label className={fieldLabelClasses}>Loan Tenure</label>
                  <input
                    type="number"
                    value={inputs.loanTenureYears}
                    onChange={(e) => updateScenarioInputs(scenario.id, { loanTenureYears: Number(e.target.value) })}
                    className={inputFieldClasses}
                    min={1}
                    max={7}
                    placeholder="7 years"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={fieldLabelClasses}>Flat Interest Rate</label>
                  <input
                    type="number"
                    step={0.01}
                    value={inputs.interestRateFlat}
                    onChange={(e) => updateScenarioInputs(scenario.id, { interestRateFlat: Number(e.target.value) })}
                    className={inputFieldClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label className={fieldLabelClasses}>Max LTV</label>
                  <div className={clsx(
                    'flex items-center gap-2 py-2 text-sm font-mono tabular-nums',
                    isMonet ? 'text-[var(--monet-text-primary)]' : 'text-[#E8E6E1]'
                  )}>
                    <span className="font-medium">{Math.round(result.maxLtvPercent * 100)}%</span>
                    <span className={clsx('text-[10px]', isMonet ? 'text-[#9CA3AF]' : 'text-[#6B7280]')}>
                      OMV {inputs.omv > 20000 ? '> $20K' : '≤ $20K'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Column — Summary (340px) */}
      <div className="w-[340px] shrink-0 space-y-5">
        {/* Registration Cost Card */}
        {inputs.condition === 'new' && (
          <div className={cardClasses}>
            {/* Header with big red total */}
            <div className={clsx(
              'p-5 pb-4 border-b',
              isMonet ? 'border-[#E8E6E1]' : 'border-[#2D2D33]'
            )}>
              <div className={sectionTitleClasses}>Registration Cost</div>
              <div className="text-[28px] font-mono font-medium tabular-nums text-[#C53D43] mt-1">
                {formatCurrency(result.totalRegistrationCost)}
              </div>
            </div>
            {/* Line items */}
            <div className="p-5 space-y-2.5">
              <SummaryRow label="OMV" value={formatCurrency(inputs.omv)} isMonet={isMonet} />
              <SummaryRow label="Excise Duty (20%)" value={formatCurrency(result.exciseDuty)} isMonet={isMonet} />
              <SummaryRow label="GST (9%)" value={formatCurrency(result.gst)} isMonet={isMonet} />
              <SummaryRow label="ARF" value={formatCurrency(result.arf)} isMonet={isMonet} />
              <SummaryRow label="COE Premium" value={formatCurrency(inputs.coePrice)} isMonet={isMonet} />
              {result.vesAmount !== 0 && (
                <SummaryRow
                  label={`VES Rebate (${vesBandLabel.replace('Band ', '')})`}
                  value={`(${formatCurrency(Math.abs(result.vesAmount))})`}
                  isGreen={result.vesAmount < 0}
                  isMonet={isMonet}
                />
              )}
              {result.eeaiRebate !== 0 && (
                <SummaryRow
                  label="EEAI Rebate"
                  value={`(${formatCurrency(Math.abs(result.eeaiRebate))})`}
                  isGreen
                  isMonet={isMonet}
                />
              )}
              <SummaryRow label="Registration Fee" value={formatCurrency(result.registrationFee)} isMonet={isMonet} />
              <div className={clsx('h-px my-1', isMonet ? 'bg-[#E8E6E1]' : 'bg-[#2D2D33]')} />
              <SummaryRow label="Total" value={formatCurrency(result.totalRegistrationCost)} isBold isMonet={isMonet} />
            </div>
          </div>
        )}

        {/* Financing Summary Card */}
        {inputs.useFinancing && (
          <div className={cardClasses}>
            <div className={clsx(
              'px-5 py-4 border-b',
              isMonet ? 'border-[#E8E6E1]' : 'border-[#2D2D33]'
            )}>
              <span className={sectionTitleClasses}>Financing Summary</span>
            </div>
            <div className="p-5 space-y-2.5">
              <SummaryRow label="Downpayment" value={formatCurrency(result.downpayment)} isMonet={isMonet} />
              <SummaryRow label="Effective Rate (EIR)" value={`${(result.effectiveInterestRate * 100).toFixed(2)}%`} isMonet={isMonet} />
              <SummaryRow label="Monthly Installment" value={formatCurrency(result.monthlyInstallment)} isMonet={isMonet} />
              <SummaryRow label="Total Interest Paid" value={formatCurrency(result.totalInterestPaid)} isMonet={isMonet} />
              <SummaryRow label="Total Repayment" value={formatCurrency(result.totalLoanRepayment)} isMonet={isMonet} />
            </div>
          </div>
        )}

        {/* Road Tax Card */}
        <div className={cardClasses}>
          <div className={clsx(
            'px-5 py-4 border-b',
            isMonet ? 'border-[#E8E6E1]' : 'border-[#2D2D33]'
          )}>
            <span className={sectionTitleClasses}>Road Tax</span>
          </div>
          <div className="p-5 space-y-2.5">
            <SummaryRow label="6-Monthly" value={formatCurrency(result.sixMonthlyRoadTax)} isMonet={isMonet} />
            <SummaryRow label="Annual" value={formatCurrency(result.annualRoadTax)} isMonet={isMonet} />
            {/* Formula note */}
            <div className={clsx(
              'rounded-sm p-2.5 flex items-center gap-1.5 text-[10px] mt-2',
              isMonet ? 'bg-[#F7F6F3] text-[#9CA3AF]' : 'bg-[#121214] text-[#6B7280]'
            )}>
              <span>
                {isEv
                  ? `${inputs.powerKw ?? 0}kW · CE: 0.782 Rebate Factor`
                  : `${inputs.engineCapacityCc ?? 0}cc · CE: 0.782 Rebate Factor`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
