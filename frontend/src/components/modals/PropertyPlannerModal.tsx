import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { PROPERTY_TYPES, mortgageInputsSchema, type MortgageInputs, type PropertyPlannerType } from '../../types/property'
import { calculateMortgage, formatCurrency, formatPercentage, getMSRStatus } from '../../utils/mortgage-calculations'

interface PropertyPlannerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PropertyPlannerModal({ isOpen, onClose }: PropertyPlannerModalProps) {
  const [selectedPropertyType, setSelectedPropertyType] = useState<PropertyPlannerType>('hdb')
  const [showResults, setShowResults] = useState(false)
  const [calculations, setCalculations] = useState<ReturnType<typeof calculateMortgage> | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    reset,
  } = useForm<MortgageInputs>({
    resolver: zodResolver(mortgageInputsSchema),
    defaultValues: {
      propertyType: 'hdb',
      loanAmount: 400000,
      loanTermYears: 25,
      borrowerType: 'couple',
      loanStartMonth: '2024-06',
      fixedYears: 3,
      fixedRate: 2.6,
      floatingRate: 3.8,
      householdIncome: 8000,
      otherDebt: 0,
    },
    mode: 'onChange'
  })

  const watchedValues = watch()
  const currentMSR = watchedValues.householdIncome > 0
    ? calculateMortgage({ ...watchedValues, propertyType: selectedPropertyType }).msrRatio
    : 0
  const msrStatus = getMSRStatus(currentMSR)

  const onSubmit = (data: MortgageInputs) => {
    const result = calculateMortgage({ ...data, propertyType: selectedPropertyType })
    setCalculations(result)
    setShowResults(true)
  }

  const handlePropertyTypeSelect = (type: PropertyPlannerType) => {
    setSelectedPropertyType(type)
    setShowResults(false)
  }

  const handleModalClose = () => {
    setShowResults(false)
    setCalculations(null)
    reset()
    onClose()
  }

  const generateMonthOptions = () => {
    const options = []
    const currentYear = new Date().getFullYear()

    for (let year = currentYear; year <= currentYear + 11; year++) {
      for (let month = 1; month <= 12; month++) {
        const value = `${year}-${month.toString().padStart(2, '0')}`
        const label = new Date(year, month - 1).toLocaleDateString('en-SG', {
          year: 'numeric',
          month: 'long'
        })
        options.push({ value, label })
      }
    }
    return options
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative mx-4 h-[96vh] w-full max-w-7xl overflow-hidden rounded-3xl border border-white/10 bg-gray-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-8 py-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Property Planner</h2>
            <p className="text-gray-400">Plan your property purchase with mortgage calculations</p>
          </div>
          <button
            onClick={handleModalClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex h-full overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 overflow-auto p-8">
            {!showResults ? (
              <div className="space-y-8">
                {/* Property Type Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Select Property Type</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    {PROPERTY_TYPES.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => handlePropertyTypeSelect(type.id)}
                        className={`rounded-2xl border p-6 text-left transition-all hover:border-blue-400 ${
                          selectedPropertyType === type.id
                            ? 'border-blue-400 bg-blue-500/10'
                            : 'border-white/15 bg-gray-900/50'
                        }`}
                      >
                        <div className="mb-2 text-3xl">{type.icon}</div>
                        <h4 className="mb-2 font-semibold text-white">{type.label}</h4>
                        <p className="text-sm text-gray-400">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mortgage Calculator Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                  {/* Loan Basics */}
                  <div className="rounded-2xl border border-white/10 bg-gray-900 p-6">
                    <h4 className="mb-6 text-lg font-semibold text-white">Loan Basics</h4>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          Loan Amount (SGD)
                        </label>
                        <Input
                          {...register('loanAmount', { valueAsNumber: true })}
                          type="number"
                          step="1000"
                          min="50000"
                          max="1500000"
                          className="w-full rounded-2xl border border-white/15 bg-gray-950 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
                        />
                        {errors.loanAmount && (
                          <p className="mt-1 text-sm text-red-400">{errors.loanAmount.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          Loan Term (Years)
                        </label>
                        <Input
                          {...register('loanTermYears', { valueAsNumber: true })}
                          type="number"
                          min="5"
                          max="35"
                          className="w-full rounded-2xl border border-white/15 bg-gray-950 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
                        />
                        {errors.loanTermYears && (
                          <p className="mt-1 text-sm text-red-400">{errors.loanTermYears.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          Loan Start Month
                        </label>
                        <select
                          {...register('loanStartMonth')}
                          className="w-full rounded-2xl border border-white/15 bg-gray-950 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
                        >
                          {generateMonthOptions().map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {errors.loanStartMonth && (
                          <p className="mt-1 text-sm text-red-400">{errors.loanStartMonth.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          Borrower Type
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center">
                            <input
                              {...register('borrowerType')}
                              type="radio"
                              value="single"
                              className="mr-2 text-blue-400 focus:ring-blue-400"
                            />
                            <span className="text-white">Single</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              {...register('borrowerType')}
                              type="radio"
                              value="couple"
                              className="mr-2 text-blue-400 focus:ring-blue-400"
                            />
                            <span className="text-white">Couple</span>
                          </label>
                        </div>
                        {errors.borrowerType && (
                          <p className="mt-1 text-sm text-red-400">{errors.borrowerType.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Interest Rates */}
                  <div className="rounded-2xl border border-white/10 bg-gray-900 p-6">
                    <h4 className="mb-6 text-lg font-semibold text-white">Interest Rates</h4>
                    <div className="grid gap-6 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          Fixed Period (Years)
                        </label>
                        <Input
                          {...register('fixedYears', { valueAsNumber: true })}
                          type="number"
                          min="1"
                          max="10"
                          className="w-full rounded-2xl border border-white/15 bg-gray-950 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
                        />
                        {errors.fixedYears && (
                          <p className="mt-1 text-sm text-red-400">{errors.fixedYears.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          Fixed Rate (% p.a.)
                        </label>
                        <Input
                          {...register('fixedRate', { valueAsNumber: true })}
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          className="w-full rounded-2xl border border-white/15 bg-gray-950 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
                        />
                        {errors.fixedRate && (
                          <p className="mt-1 text-sm text-red-400">{errors.fixedRate.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          Floating Rate (% p.a.)
                        </label>
                        <Input
                          {...register('floatingRate', { valueAsNumber: true })}
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          className="w-full rounded-2xl border border-white/15 bg-gray-950 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
                        />
                        {errors.floatingRate && (
                          <p className="mt-1 text-sm text-red-400">{errors.floatingRate.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Income & MSR */}
                  <div className="rounded-2xl border border-white/10 bg-gray-900 p-6">
                    <h4 className="mb-6 text-lg font-semibold text-white">Income & MSR</h4>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          Monthly Household Income (SGD)
                        </label>
                        <Input
                          {...register('householdIncome', { valueAsNumber: true })}
                          type="number"
                          step="100"
                          min="1000"
                          className="w-full rounded-2xl border border-white/15 bg-gray-950 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
                        />
                        {errors.householdIncome && (
                          <p className="mt-1 text-sm text-red-400">{errors.householdIncome.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          Other Monthly Debt (SGD)
                        </label>
                        <Input
                          {...register('otherDebt', { valueAsNumber: true })}
                          type="number"
                          step="100"
                          min="0"
                          className="w-full rounded-2xl border border-white/15 bg-gray-950 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
                        />
                        {errors.otherDebt && (
                          <p className="mt-1 text-sm text-red-400">{errors.otherDebt.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Real-time MSR Display */}
                    {watchedValues.householdIncome > 0 && (
                      <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Current MSR Ratio</span>
                          <span className={`font-semibold ${msrStatus.color}`}>
                            {formatPercentage(currentMSR)}
                          </span>
                        </div>
                        <p className={`mt-1 text-sm ${msrStatus.color}`}>{msrStatus.message}</p>
                      </div>
                    )}
                  </div>

                  {/* Generate Button */}
                  <div className="flex justify-center">
                    <Button
                      type="submit"
                      disabled={!isValid}
                      className="rounded-full bg-emerald-500 px-8 py-3 font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
                    >
                      Generate Overview
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              /* Results View */
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Mortgage Overview</h3>
                  <Button
                    onClick={() => setShowResults(false)}
                    variant="outline"
                    className="border-white/20 text-gray-300"
                  >
                    Edit Parameters
                  </Button>
                </div>

                {calculations && (
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Key Metrics */}
                    <div className="rounded-2xl border border-white/10 bg-gray-900 p-6">
                      <h4 className="mb-4 font-semibold text-white">Key Metrics</h4>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Monthly Payment</span>
                          <span className="font-semibold text-white">
                            {formatCurrency(calculations.monthlyPayment)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Interest</span>
                          <span className="font-semibold text-white">
                            {formatCurrency(calculations.totalInterest)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">MSR Ratio</span>
                          <span className={`font-semibold ${getMSRStatus(calculations.msrRatio).color}`}>
                            {formatPercentage(calculations.msrRatio)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Loan End Date</span>
                          <span className="font-semibold text-white">{calculations.loanEndDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Additional Summary */}
                    <div className="rounded-2xl border border-white/10 bg-gray-900 p-6">
                      <h4 className="mb-4 font-semibold text-white">Summary</h4>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Property Type</span>
                          <span className="font-semibold text-white">
                            {PROPERTY_TYPES.find(p => p.id === selectedPropertyType)?.label}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Loan Amount</span>
                          <span className="font-semibold text-white">
                            {formatCurrency(watchedValues.loanAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Loan Term</span>
                          <span className="font-semibold text-white">
                            {watchedValues.loanTermYears} years
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Fixed Period</span>
                          <span className="font-semibold text-white">
                            {watchedValues.fixedYears} years @ {watchedValues.fixedRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}