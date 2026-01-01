"use client"

import { FormInput, FeeEditor } from '@/app/property-planner/components'
import { formatCurrency } from '@/app/property-planner/hooks'

import type { TermsStepProps } from './types'

export function TermsStep({
  inputs,
  onChange,
  propertyType,
}: TermsStepProps) {
  const isHDB = propertyType.includes('hdb')

  return (
    <div className="space-y-4">
      {/* ABSD - Only for non-HDB */}
      {!isHDB && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400">ABSD Rate</label>
            <a
              href="https://www.iras.gov.sg/taxes/stamp-duty/for-property/buying-or-acquiring-property/additional-buyer's-stamp-duty-(absd)"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Check rates →
            </a>
          </div>
          <FormInput
            label=""
            value={inputs.absdRate}
            onChange={(v) => onChange('absdRate', Number(v) || 0)}
            type="number"
            min={0}
            max={65}
            suffix="%"
            className="[&>label]:hidden"
          />
          {inputs.absdRate > 0 && (
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <div className="flex justify-between items-center">
                <span className="text-xs text-rose-400">ABSD Amount</span>
                <span className="text-sm text-rose-300 font-medium">
                  {formatCurrency(Math.round(inputs.propertyPrice * (inputs.absdRate / 100)))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Additional Expenses */}
      <div className="pt-2 border-t border-white/[0.04]">
        <FeeEditor
          fees={inputs.purchaseFees}
          onFeesChange={(fees) => onChange('purchaseFees', fees)}
          basePrice={inputs.propertyPrice}
          title="Additional Expenses"
          purchaseDate={inputs.loanStartMonth}
        />
      </div>
    </div>
  )
}
