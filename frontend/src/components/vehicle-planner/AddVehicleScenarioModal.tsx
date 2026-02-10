'use client'

import { useState, useCallback, useMemo } from 'react'
import { Car, X, ArrowLeft, Check, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

import type { VehicleCategory } from '@/types/vehicle'
import { useColorScheme } from '@/stores'
import { useVehiclePlannerActions } from '@/stores/vehiclePlannerStore'
import { calculateVehicle } from '@/lib/vehicle/calculations'
import { formatCurrency } from '@/lib/format'
import { DEFAULT_DEPRECIATION_PERIODS, DEFAULT_RECURRING_COSTS } from '@/lib/vehicle/constants'

interface AddVehicleScenarioModalProps {
  isOpen: boolean
  onClose: () => void
}

const CATEGORY_OPTIONS: { value: VehicleCategory; label: string }[] = [
  { value: 'car_cat_a', label: 'Car (Cat A) — ≤1,600cc' },
  { value: 'car_cat_b', label: 'Car (Cat B) — >1,600cc' },
  { value: 'motorcycle_cat_d', label: 'Motorcycle (Cat D)' },
]

export function AddVehicleScenarioModal({ isOpen, onClose }: AddVehicleScenarioModalProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const { addScenario } = useVehiclePlannerActions()

  const [scenarioName, setScenarioName] = useState('')
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>('car_cat_a')
  const [downPayment, setDownPayment] = useState(50000)
  const [interestRate, setInterestRate] = useState(2.78)
  const [loanTenureYears, setLoanTenureYears] = useState(7)
  const [coeRenewal, setCoeRenewal] = useState(true)
  const [includeInsurance, setIncludeInsurance] = useState(false)

  // Compute preview values
  const previewResult = useMemo(() => {
    const now = new Date()
    const purchaseMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const inputs = {
      vehicleCategory,
      fuelType: 'petrol' as const,
      condition: 'new' as const,
      engineCapacityCc: vehicleCategory === 'car_cat_a' ? 1600 : vehicleCategory === 'car_cat_b' ? 2000 : 400,
      powerKw: null,
      co2EmissionsGkm: 120,
      vehicleAge: 0,
      remainingCoeMonths: 120,
      isPafrEligible: true,
      omv: 20000,
      listPrice: 0,
      coePrice: 100000,
      vesPeriod: '2026' as const,
      useFinancing: downPayment > 0,
      loanAmount: Math.max(0, 100000 - downPayment),
      loanTenureYears,
      interestRateFlat: interestRate,
      purchaseMonth,
      depreciationPeriods: [...DEFAULT_DEPRECIATION_PERIODS],
      downpaymentCashAccountId: null,
    }
    const recurringCosts = vehicleCategory === 'motorcycle_cat_d'
      ? { ...DEFAULT_RECURRING_COSTS.motorcycle }
      : { ...DEFAULT_RECURRING_COSTS.car }
    return calculateVehicle(inputs, recurringCosts, 10)
  }, [vehicleCategory, downPayment, interestRate, loanTenureYears])

  const handleSave = useCallback(() => {
    const name = scenarioName.trim() || 'New Vehicle'
    addScenario(name)
    onClose()
    // Reset form
    setScenarioName('')
    setVehicleCategory('car_cat_a')
    setDownPayment(50000)
    setInterestRate(2.78)
    setLoanTenureYears(7)
    setCoeRenewal(true)
    setIncludeInsurance(false)
  }, [scenarioName, addScenario, onClose])

  if (!isOpen) return null

  const inputBgClass = isMonet ? 'bg-[#F7F6F3]' : 'bg-[#242428]'
  const inputBorderClass = isMonet ? 'border-[#E8E6E1]' : 'border-[#2D2D33]'
  const labelClass = clsx('text-sm font-medium', isMonet ? 'text-[#6B7280]' : 'text-[#6B7280]')
  const valueClass = clsx('text-[15px] font-normal', isMonet ? 'text-[#2D2D2D]' : 'text-[#E8E6E1]')
  const placeholderClass = 'text-[#6B7280]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div
        className={clsx(
          'relative flex flex-col rounded-sm w-[560px] max-h-[90vh]',
          isMonet
            ? 'bg-white border border-[#E8E6E1]'
            : 'bg-[#1A1A1D]'
        )}
      >
        {/* Header */}
        <div
          className={clsx(
            'flex items-center justify-between shrink-0 px-6',
            isMonet ? 'border-b border-[#E8E6E1]' : 'border-b border-[#2D2D33]'
          )}
          style={{ height: 80 }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg bg-blue-500/[0.12]" style={{ width: 36, height: 36 }}>
              <Car className="h-[18px] w-[18px] text-blue-400" />
            </div>
            <div>
              <h2 className={clsx('text-base font-semibold', isMonet ? 'text-[#2D2D2D]' : 'text-[#E8E6E1]')}>
                Add Vehicle Scenario
              </h2>
              <p className="text-sm text-[#9CA3AF]">
                Compare vehicle ownership costs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={clsx(
              'flex items-center justify-center rounded-full',
              isMonet ? 'bg-[#F7F6F3] text-[#9CA3AF]' : 'bg-[#333338] text-[#9CA3AF]'
            )}
            style={{ width: 28, height: 28 }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Scenario Name */}
          <div className="space-y-1.5">
            <label className={labelClass}>Scenario Name</label>
            <div className={clsx(inputBgClass, 'px-3 py-2.5 border-b', inputBorderClass)}>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g. Toyota Corolla Hybrid 2026"
                className={clsx('w-full bg-transparent outline-none text-[15px]', valueClass, 'placeholder:' + placeholderClass)}
              />
            </div>
          </div>

          {/* Vehicle Category */}
          <div className="space-y-1.5">
            <label className={labelClass}>Vehicle Category</label>
            <div className={clsx(inputBgClass, 'px-3 py-2.5 border-b flex items-center justify-between', inputBorderClass)}>
              <select
                value={vehicleCategory}
                onChange={(e) => setVehicleCategory(e.target.value as VehicleCategory)}
                className={clsx('w-full bg-transparent outline-none appearance-none text-[15px]', valueClass)}
              >
                <option value="" disabled>Select category...</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-[#71717A] shrink-0 pointer-events-none -ml-5" />
            </div>
          </div>

          {/* Registration Cost + Monthly Cost (side by side) */}
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className={labelClass}>Registration Cost</label>
              <div className={clsx(inputBgClass, 'px-3 py-2.5 border-b', inputBorderClass)}>
                <span className={clsx('font-mono text-[15px] tabular-nums', isMonet ? 'text-[#2D2D2D]' : 'text-[#E8E6E1]')}>
                  {formatCurrency(previewResult.totalRegistrationCost)}
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className={labelClass}>Monthly Cost</label>
              <div className={clsx(inputBgClass, 'px-3 py-2.5 border-b', inputBorderClass)}>
                <span className={clsx('font-mono text-[15px] tabular-nums', isMonet ? 'text-[#2D2D2D]' : 'text-[#E8E6E1]')}>
                  {formatCurrency(previewResult.totalCostOfOwnership.costPerMonth)}
                </span>
              </div>
            </div>
          </div>

          {/* Loan Tenure + 10-Year TCO (side by side) */}
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className={labelClass}>Loan Tenure</label>
              <div className={clsx(inputBgClass, 'px-3 py-2.5 border-b flex items-center justify-between', inputBorderClass)}>
                <select
                  value={loanTenureYears}
                  onChange={(e) => setLoanTenureYears(Number(e.target.value))}
                  className={clsx('w-full bg-transparent outline-none appearance-none text-[15px]', valueClass)}
                >
                  {[3, 5, 7, 10].map((y) => (
                    <option key={y} value={y}>{y} years</option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-[#71717A] shrink-0 pointer-events-none -ml-5" />
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className={labelClass}>10-Year TCO</label>
              <div className={clsx(inputBgClass, 'px-3 py-2.5 border-b', inputBorderClass)}>
                <span className={clsx('font-mono text-[15px] tabular-nums', isMonet ? 'text-[#2D2D2D]' : 'text-[#E8E6E1]')}>
                  {formatCurrency(previewResult.totalCostOfOwnership.netTotalCost)}
                </span>
              </div>
            </div>
          </div>

          {/* Vehicle Settings */}
          <div
            className={clsx(
              'rounded-sm p-4 space-y-3',
              isMonet
                ? 'bg-[#F7F6F3] border border-[#E8E6E1]'
                : 'bg-[#242428] border border-[#2D2D33]'
            )}
          >
            <h3 className={clsx('text-[15px] font-semibold', isMonet ? 'text-[#2D2D2D]' : 'text-[#E8E6E1]')}>
              Vehicle Settings
            </h3>

            {/* Down Payment */}
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-[#9CA3AF]">Down Payment</span>
              <div
                className={clsx(
                  'rounded px-2.5 py-1.5 border',
                  isMonet ? 'bg-white border-[#E8E6E1]' : 'bg-[#1A1A1D] border-[#2D2D33]'
                )}
              >
                <input
                  type="text"
                  value={`$ ${downPayment.toLocaleString()}`}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '')
                    setDownPayment(Number(raw) || 0)
                  }}
                  className={clsx(
                    'bg-transparent outline-none text-right font-mono text-sm tabular-nums w-24',
                    isMonet ? 'text-[#2D2D2D]' : 'text-[#E8E6E1]'
                  )}
                />
              </div>
            </div>

            {/* Interest Rate */}
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-[#9CA3AF]">Interest Rate</span>
              <div
                className={clsx(
                  'rounded flex items-center gap-1.5 px-2.5 py-1.5 border',
                  isMonet ? 'bg-white border-[#E8E6E1]' : 'bg-[#1A1A1D] border-[#2D2D33]'
                )}
              >
                <input
                  type="text"
                  value={interestRate.toFixed(2)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    if (!isNaN(val)) setInterestRate(val)
                  }}
                  className={clsx(
                    'bg-transparent outline-none text-right font-mono text-sm tabular-nums w-12',
                    isMonet ? 'text-[#2D2D2D]' : 'text-[#E8E6E1]'
                  )}
                />
                <span className="text-sm text-[#9CA3AF]">%</span>
                <ChevronDown className="h-3 w-3 text-[#71717A]" />
              </div>
            </div>

            {/* COE Renewal toggle */}
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-[#9CA3AF]">COE Renewal</span>
              <button
                type="button"
                onClick={() => setCoeRenewal(!coeRenewal)}
                className={clsx(
                  'relative rounded-full transition-colors',
                  coeRenewal ? 'bg-[#34D399]' : isMonet ? 'bg-[#D1D5DB]' : 'bg-[#3F3F46]'
                )}
                style={{ width: 36, height: 20 }}
              >
                <div
                  className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                  style={{ left: coeRenewal ? 18 : 2 }}
                />
              </button>
            </div>

            {/* Include Insurance toggle */}
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-[#9CA3AF]">Include Insurance</span>
              <button
                type="button"
                onClick={() => setIncludeInsurance(!includeInsurance)}
                className={clsx(
                  'relative rounded-full transition-colors',
                  includeInsurance ? 'bg-[#34D399]' : isMonet ? 'bg-[#D1D5DB]' : 'bg-[#3F3F46]'
                )}
                style={{ width: 36, height: 20 }}
              >
                <div
                  className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                  style={{ left: includeInsurance ? 18 : 2 }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={clsx(
            'flex items-center justify-between shrink-0 px-6',
            isMonet ? 'border-t border-[#E8E6E1]' : 'border-t border-[#2D2D33]'
          )}
          style={{ height: 64 }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2.5 text-[15px] font-medium text-[#9CA3AF] transition-colors hover:text-[#E8E6E1]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-sm bg-[#3B82F6] px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#2563EB]"
          >
            <Check className="h-3.5 w-3.5" />
            Save Scenario
          </button>
        </div>
      </div>
    </div>
  )
}
