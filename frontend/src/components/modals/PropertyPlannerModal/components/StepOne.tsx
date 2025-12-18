"use client"

import { Calendar } from 'lucide-react'
import type { MortgageInputs, PropertyPlannerType } from '@/types/property'
import type { Asset, Liability } from '@/types/financial'
import { Input } from '@/components/ui/input'
import type { OverrideFlags } from '../hooks'

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
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h4 className="text-lg font-semibold text-white">Loan Basics</h4>
        <p className="text-sm text-gray-400">Tell us about your mortgage requirements.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-300">
          Property Type
          <select
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
            onChange={(event) => onChange('propertyType', event.target.value as PropertyPlannerType)}
            value={inputs.propertyType}
          >
            <option value="hdb">HDB (BTO / Resale)</option>
            <option value="condo">Condo</option>
            <option value="landed">Landed</option>
          </select>
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

      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-300">
          <span>Property Price</span>
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={inputs.propertyPrice ? inputs.propertyPrice.toLocaleString() : ''}
            onChange={(event) => {
              const raw = event.target.value.replace(/[^0-9.]/g, '')
              onChange('propertyPrice', Number(raw) || 0)
            }}
            className={`mt-1 w-full rounded-2xl border ${
              overrideFlags?.price ? 'border-amber-400 text-amber-200' : 'border-white/10 text-white'
            } bg-white/5 px-4 py-2 text-lg font-semibold placeholder:text-gray-500 focus:border-blue-400 focus:outline-none`}
            min={10000}
            max={5000000}
            placeholder="600,000"
          />
          {selectedAssetId && (() => {
            const asset = assets.find((a) => a.id === selectedAssetId)
            if (!asset) return null
            const assetVal = asset.currentValue ?? 0
            if (inputs.propertyPrice > 0 && Math.abs(assetVal - inputs.propertyPrice) >= 1) {
              return (
                <p className="mt-1 text-xs text-gray-200">
                  Value differs from asset of ${assetVal.toLocaleString()}
                </p>
              )
            }
            return null
          })()}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-300">
          <span>Loan Amount</span>
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={inputs.loanAmount ? inputs.loanAmount.toLocaleString() : ''}
            onChange={(event) => {
              const raw = event.target.value.replace(/[^0-9.]/g, '')
              onChange('loanAmount', Number(raw) || 0)
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

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-300">
          Loan Start Date
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white" color="white" />
            <input
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 pl-9 text-white placeholder:text-gray-500 focus:border-blue-400 focus:outline-none"
              max="2035-12"
              min="2024-01"
              onChange={(event) => onChange('loanStartMonth', event.target.value)}
              type="month"
              value={inputs.loanStartMonth}
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
            onChange={(event) => onChange('loanTermYears', Number(event.target.value) || inputs.loanTermYears)}
            type="number"
            value={inputs.loanTermYears === 0 ? '' : inputs.loanTermYears}
            placeholder="25"
          />
        </label>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-300">Borrowers</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {[
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
          ].map((option) => (
            <button
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                inputs.borrowerType === option.id
                  ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]'
                  : 'border-white/15 bg-white/5 hover:border-white/30'
              }`}
              key={option.id}
              onClick={() => onChange('borrowerType', option.id)}
              type="button"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-white">{option.label}</p>
                <span
                  className={`h-4 w-4 rounded-full border ${
                    inputs.borrowerType === option.id ? 'border-blue-400 bg-blue-400' : 'border-white/20'
                  }`}
                />
              </div>
              <p className="mt-1 text-sm text-gray-400">{option.helper}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
