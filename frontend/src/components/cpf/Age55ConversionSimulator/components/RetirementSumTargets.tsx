'use client'

import { CheckCircle2, Home, Wallet } from 'lucide-react'
import { CPF_CONSTANTS, type TargetSum } from '@/lib/cpf-constants'
import { formatCurrency } from '@/lib/format'

const TARGET_LABELS: Record<TargetSum, string> = {
  BRS: `Basic (${formatCurrency(CPF_CONSTANTS.BRS)})`,
  FRS: `Full (${formatCurrency(CPF_CONSTANTS.FRS)})`,
  ERS: `Enhanced (${formatCurrency(CPF_CONSTANTS.ERS)})`,
}

interface RetirementSumTargetsProps {
  targetSum: TargetSum
  setTargetSum: (target: TargetSum) => void
  hasPropertyPledge: boolean
  setHasPropertyPledge: (val: boolean) => void
  cashBalance: number
  setCashBalance: (val: number) => void
}

export function RetirementSumTargets({
  targetSum,
  setTargetSum,
  hasPropertyPledge,
  setHasPropertyPledge,
  cashBalance,
  setCashBalance,
}: RetirementSumTargetsProps) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
      <h4 className="mb-4 text-sm font-medium text-white">
        Retirement Sum Target
      </h4>

      <div className="space-y-3">
        {(['BRS', 'FRS', 'ERS'] as TargetSum[]).map((target) => (
          <label
            key={target}
            className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition ${
              targetSum === target
                ? 'border-amber-500/50 bg-amber-500/10'
                : 'border-white/[0.06] bg-white/[0.02] hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="targetSum"
                value={target}
                checked={targetSum === target}
                onChange={() => setTargetSum(target)}
                className="h-4 w-4 accent-amber-500"
              />
              <div>
                <p className="text-sm font-medium text-white">
                  {TARGET_LABELS[target]}
                </p>
                <p className="text-xs text-slate-400">
                  {target === 'BRS' && 'With property pledge'}
                  {target === 'FRS' && 'Standard retirement sum'}
                  {target === 'ERS' && 'Higher payouts (requires cash top-up)'}
                </p>
              </div>
            </div>
            {targetSum === target && (
              <CheckCircle2 className="h-5 w-5 text-amber-400" />
            )}
          </label>
        ))}
      </div>

      {/* Property Pledge (for BRS) */}
      {targetSum === 'BRS' && (
        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
          <input
            type="checkbox"
            checked={hasPropertyPledge}
            onChange={(e) => setHasPropertyPledge(e.target.checked)}
            className="h-4 w-4 rounded accent-amber-500"
          />
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-300">
              I have a property pledge
            </span>
          </div>
        </label>
      )}

      {/* Cash Top-up (for ERS) */}
      {targetSum === 'ERS' && (
        <div className="mt-4">
          <label className="mb-1 flex items-center gap-2 text-xs text-slate-400">
            <Wallet className="h-3.5 w-3.5" />
            Cash for RSTU Top-up (Optional)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              $
            </span>
            <input
              type="number"
              value={cashBalance}
              onChange={(e) => setCashBalance(Math.max(0, Number(e.target.value)))}
              className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] py-2 pl-7 pr-3 text-sm text-white focus:border-white/20 focus:outline-none"
              placeholder="0"
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Auto-transfer caps at FRS ({formatCurrency(CPF_CONSTANTS.FRS)}).
            Cash top-up needed for the remaining{' '}
            {formatCurrency(CPF_CONSTANTS.ERS - CPF_CONSTANTS.FRS)}.
          </p>
        </div>
      )}
    </div>
  )
}
