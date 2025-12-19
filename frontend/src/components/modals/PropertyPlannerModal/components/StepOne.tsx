"use client"

import { Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { CustomSelect } from '@/components/ui/CustomSelect'
import type { Asset, Liability } from '@/types/financial'
import type { MortgageInputs, PropertyPlannerType } from '@/types/property'
import { PROPERTY_TYPES } from '@/types/property'
import type { OverrideFlags } from '../hooks'

interface PropertyBasicsSectionProps {
  propertyType: MortgageInputs['propertyType']
  onSelectPropertyType: (value: PropertyPlannerType) => void
  liabilities: Liability[]
  liabilityInput: string
  onChangeLiabilityInput: (value: string) => void
  onLiabilityFocus: () => void
  onLiabilityBlur: () => void
}

function PropertyBasicsSection({
  propertyType,
  onSelectPropertyType,
  liabilities,
  liabilityInput,
  onChangeLiabilityInput,
  onLiabilityFocus,
  onLiabilityBlur,
}: PropertyBasicsSectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium text-gray-300">
        Property Type
        <CustomSelect
          value={propertyType}
          onChange={(val) => onSelectPropertyType(val as PropertyPlannerType)}
          options={PROPERTY_TYPES.map((type) => ({ value: type.id, label: type.label }))}
          className="mt-1 w-full"
        />
      </label>
      <label className="text-sm font-medium text-gray-300">
        Property Loan (select or add)
        <Input
          list="property-loans"
          className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white focus:border-white/10 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:shadow-none"
          value={liabilityInput}
          onChange={(event) => onChangeLiabilityInput(event.target.value)}
          onFocus={onLiabilityFocus}
          onBlur={onLiabilityBlur}
          placeholder="Select or type a property loan"
        />
        <datalist id="property-loans">
          {liabilities.map((liability) => (
            <option key={liability.id} value={liability.name} />
          ))}
        </datalist>
      </label>
    </div>
  )
}

interface PriceFieldProps {
  value: number
  onChange: (value: number) => void
  overrideFlags?: OverrideFlags
  selectedAsset?: Asset
}

function PriceField({ value, onChange, overrideFlags, selectedAsset }: PriceFieldProps) {
  const assetValue = selectedAsset?.currentValue ?? 0
  const showAssetDifference = selectedAsset && value > 0 && Math.abs(assetValue - value) >= 1

  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between text-sm font-medium text-gray-300">
        <span>Property Price</span>
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value ? value.toLocaleString() : ''}
          onChange={(event) => {
            const raw = event.target.value.replace(/[^0-9.]/g, '')
            onChange(Number(raw) || 0)
          }}
          className={`mt-1 w-full rounded-2xl border ${
            overrideFlags?.price ? 'border-amber-400 text-amber-200' : 'border-white/10 text-white'
          } bg-white/5 px-4 py-2 text-lg font-semibold placeholder:text-gray-500 focus:border-blue-400 focus:outline-none`}
          min={10000}
          max={5000000}
          placeholder="600,000"
        />
        {showAssetDifference && (
          <p className="mt-1 text-xs text-gray-200">Value differs from asset of ${assetValue.toLocaleString()}</p>
        )}
      </div>
    </div>
  )
}

interface LoanAmountFieldProps {
  value: number
  onChange: (value: number) => void
  overrideFlags?: OverrideFlags
}

function LoanAmountField({ value, onChange, overrideFlags }: LoanAmountFieldProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between text-sm font-medium text-gray-300">
        <span>Loan Amount</span>
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value ? value.toLocaleString() : ''}
          onChange={(event) => {
            const raw = event.target.value.replace(/[^0-9.]/g, '')
            onChange(Number(raw) || 0)
          }}
          className={`mt-1 w-full rounded-2xl border ${
            overrideFlags?.loan ? 'border-amber-400 text-amber-200' : 'border-white/10 text-white'
          } bg-white/5 px-4 py-2 text-lg font-semibold placeholder:text-gray-500 focus:border-blue-400 focus:outline-none`}
          min={50000}
          max={1500000}
          placeholder="500,000"
        />
      </div>
    </div>
  )
}

interface LoanTimingFieldsProps {
  loanStartMonth: string
  loanTermYears: number
  onChangeStartMonth: (value: string) => void
  onChangeLoanTerm: (value: number) => void
}

function LoanTimingFields({ loanStartMonth, loanTermYears, onChangeStartMonth, onChangeLoanTerm }: LoanTimingFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium text-gray-300">
        Loan Start Date
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white" color="white" />
          <input
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 pl-9 text-white placeholder:text-gray-500 focus:border-blue-400 focus:outline-none"
            max="2035-12"
            min="2024-01"
            onChange={(event) => onChangeStartMonth(event.target.value)}
            type="month"
            value={loanStartMonth}
            placeholder="----"
          />
        </div>
      </label>

      <label className="text-sm font-medium text-gray-300">
        Loan Term (years)
        <input
          className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-gray-500 focus:border-blue-400 focus:outline-none"
          min={5}
          max={35}
          onChange={(event) => onChangeLoanTerm(Number(event.target.value) || loanTermYears)}
          type="number"
          value={loanTermYears === 0 ? '' : loanTermYears}
          placeholder="25"
        />
      </label>
    </div>
  )
}

type BorrowerType = MortgageInputs['borrowerType']

interface BorrowerSelectorProps {
  borrowerType: BorrowerType
  onSelectBorrowerType: (value: BorrowerType) => void
}

const BORROWER_OPTIONS: Array<{ id: BorrowerType; label: string; helper: string }> = [
  {
    id: 'single',
    label: 'Single Borrower',
    helper: 'I am servicing the mortgage alone',
  },
  {
    id: 'couple',
    label: 'Couple',
    helper: 'I am servicing the loan with a partner or spouse',
  },
]

function BorrowerSelector({ borrowerType, onSelectBorrowerType }: BorrowerSelectorProps) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-300">Borrowers</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {BORROWER_OPTIONS.map((option) => {
          const isSelected = borrowerType === option.id

          return (
            <button
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]'
                  : 'border-white/15 bg-white/5 hover:border-white/30'
              }`}
              key={option.id}
              onClick={() => onSelectBorrowerType(option.id)}
              type="button"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-white">{option.label}</p>
                <span
                  className={`h-4 w-4 rounded-full border ${
                    isSelected ? 'border-blue-400 bg-blue-400' : 'border-white/20'
                  }`}
                />
              </div>
              <p className="mt-1 text-sm text-gray-400">{option.helper}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepSectionHeader() {
  return (
    <header className="space-y-1">
      <h4 className="text-lg font-semibold text-white">Loan Basics</h4>
      <p className="text-sm text-gray-400">Tell us about your mortgage requirements.</p>
    </header>
  )
}

interface StepOneProps {
  inputs: MortgageInputs
  onChange: (field: keyof MortgageInputs, value: string | number) => void
  selectedAssetId: string
  assets: Asset[]
  liabilities: Liability[]
  liabilityInput: string
  onChangeLiabilityInput: (value: string) => void
  onLiabilityFocus: () => void
  onLiabilityBlur: () => void
  overrideFlags?: OverrideFlags
}

export function StepOne({
  inputs,
  onChange,
  selectedAssetId,
  assets,
  liabilities,
  liabilityInput,
  onChangeLiabilityInput,
  onLiabilityFocus,
  onLiabilityBlur,
  overrideFlags,
}: StepOneProps) {
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId)

  return (
    <div className="space-y-6">
      <StepSectionHeader />

      <PropertyBasicsSection
        propertyType={inputs.propertyType}
        onSelectPropertyType={(value) => onChange('propertyType', value)}
        liabilities={liabilities}
        liabilityInput={liabilityInput}
        onChangeLiabilityInput={onChangeLiabilityInput}
        onLiabilityFocus={onLiabilityFocus}
        onLiabilityBlur={onLiabilityBlur}
      />

      <PriceField
        value={inputs.propertyPrice}
        onChange={(value) => onChange('propertyPrice', value)}
        overrideFlags={overrideFlags}
        selectedAsset={selectedAsset}
      />

      <LoanAmountField
        value={inputs.loanAmount}
        onChange={(value) => onChange('loanAmount', value)}
        overrideFlags={overrideFlags}
      />

      <LoanTimingFields
        loanStartMonth={inputs.loanStartMonth}
        loanTermYears={inputs.loanTermYears}
        onChangeStartMonth={(value) => onChange('loanStartMonth', value)}
        onChangeLoanTerm={(value) => onChange('loanTermYears', value)}
      />

      <BorrowerSelector borrowerType={inputs.borrowerType} onSelectBorrowerType={(value) => onChange('borrowerType', value)} />
    </div>
  )
}
