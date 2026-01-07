'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Info, Landmark, AlertTriangle, CheckCircle } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

// 2025 retirement sums
const FRS_2025 = 213000
const BRS_2025 = 106500

// Account colors matching the design system
const ACCOUNT_COLORS = {
  oa: { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30', fill: '#3b82f6' },
  sa: { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30', fill: '#10b981' },
  ma: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/30', fill: '#f59e0b' },
  ra: { bg: 'bg-violet-500', text: 'text-violet-400', border: 'border-violet-500/30', fill: '#8b5cf6' },
}

interface RAFormationWaterfallProps {
  className?: string
}

export function RAFormationWaterfall({ className }: RAFormationWaterfallProps) {
  const [oaBalance, setOaBalance] = useState(200000)
  const [saBalance, setSaBalance] = useState(150000)
  const [maBalance, setMaBalance] = useState(68000)
  const [hasPropertyPledge, setHasPropertyPledge] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
  const [animationPhase, setAnimationPhase] = useState<'before' | 'transferring' | 'after'>('before')

  const calculations = useMemo(() => {
    const targetSum = hasPropertyPledge ? BRS_2025 : FRS_2025
    const totalCpf = oaBalance + saBalance + maBalance

    // Step 1: SA transfers to RA first (capped at target)
    const saToRa = Math.min(saBalance, targetSum)
    const raAfterSa = saToRa
    const remainingNeeded = Math.max(0, targetSum - raAfterSa)

    // Step 2: OA fills the gap if needed
    const oaToRa = Math.min(oaBalance, remainingNeeded)
    const raTotal = saToRa + oaToRa

    // Calculate remaining balances
    const oaRemaining = oaBalance - oaToRa
    const saRemaining = saBalance - saToRa // Usually 0 as SA closes

    // Withdrawable amount
    const shortfall = Math.max(0, targetSum - raTotal)
    const canWithdraw = shortfall === 0
    const withdrawable = canWithdraw ? (oaRemaining + saRemaining) : 0

    return {
      targetSum,
      totalCpf,
      saToRa,
      oaToRa,
      raTotal,
      oaRemaining,
      saRemaining,
      shortfall,
      canWithdraw,
      withdrawable,
    }
  }, [oaBalance, saBalance, maBalance, hasPropertyPledge])

  const runAnimation = () => {
    setShowAnimation(true)
    setAnimationPhase('before')

    setTimeout(() => setAnimationPhase('transferring'), 500)
    setTimeout(() => setAnimationPhase('after'), 2500)
  }

  const maxBalance = Math.max(oaBalance, saBalance, maBalance, FRS_2025)
  const getBarHeight = (amount: number) => (amount / maxBalance) * 200

  // Bucket component
  const Bucket = ({
    label,
    amount,
    color,
    maxHeight = 200,
    showTransfer = false,
    transferAmount = 0,
    transferDirection = 'out' as 'in' | 'out',
    isNew = false,
  }: {
    label: string
    amount: number
    color: keyof typeof ACCOUNT_COLORS
    maxHeight?: number
    showTransfer?: boolean
    transferAmount?: number
    transferDirection?: 'in' | 'out'
    isNew?: boolean
  }) => {
    const colors = ACCOUNT_COLORS[color]
    const barHeight = getBarHeight(amount)

    return (
      <div className="flex flex-col items-center">
        <div className="mb-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
          {label}
        </div>

        {/* Bucket container */}
        <div
          className={cn(
            "relative w-20 rounded-b-lg border-2 border-t-0 overflow-hidden",
            colors.border,
            isNew && "ring-2 ring-violet-500/50 ring-offset-2 ring-offset-[#0a0a0a]"
          )}
          style={{ height: maxHeight + 20 }}
        >
          {/* Water level */}
          <motion.div
            className={cn("absolute bottom-0 left-0 right-0", colors.bg)}
            initial={{ height: 0 }}
            animate={{ height: barHeight }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ opacity: 0.8 }}
          />

          {/* Transfer animation */}
          <AnimatePresence>
            {showTransfer && transferAmount > 0 && (
              <motion.div
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 w-3 rounded-full",
                  colors.bg
                )}
                initial={{
                  top: transferDirection === 'out' ? barHeight : -20,
                  opacity: 1
                }}
                animate={{
                  top: transferDirection === 'out' ? -20 : barHeight,
                  opacity: [1, 1, 0]
                }}
                transition={{ duration: 1.5, repeat: 2 }}
                style={{ height: 20 }}
              />
            )}
          </AnimatePresence>

          {/* Amount label inside bucket */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-sm font-bold drop-shadow-lg", colors.text)}>
              {formatCurrency(amount)}
            </span>
          </div>
        </div>

        {/* Transfer indicator */}
        {showTransfer && transferAmount > 0 && (
          <motion.div
            className={cn("mt-2 text-xs font-medium", colors.text)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {transferDirection === 'out' ? '-' : '+'}{formatCurrency(transferAmount)}
          </motion.div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Landmark className="h-5 w-5 text-violet-400" />
            Age 55: RA Formation Simulator
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Visualize how your CPF accounts transform at age 55
          </p>
        </div>
        <button
          onClick={runAnimation}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            "bg-violet-500/20 text-violet-300 border border-violet-500/30",
            "hover:bg-violet-500/30 hover:border-violet-500/50"
          )}
        >
          {showAnimation ? 'Replay Animation' : 'Simulate Transfer'}
        </button>
      </div>

      {/* Input Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
        <div>
          <label className="block text-xs font-medium text-blue-400 mb-1.5">
            OA Balance (Before 55)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <input
              type="number"
              value={oaBalance}
              onChange={(e) => setOaBalance(Math.max(0, Number(e.target.value)))}
              className="w-full py-2 pl-7 pr-3 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white focus:border-blue-500/50 focus:outline-none"
            />
          </div>
          <input
            type="range"
            min={0}
            max={400000}
            step={5000}
            value={oaBalance}
            onChange={(e) => setOaBalance(Number(e.target.value))}
            className="w-full mt-2 accent-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-emerald-400 mb-1.5">
            SA Balance (Before 55)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <input
              type="number"
              value={saBalance}
              onChange={(e) => setSaBalance(Math.max(0, Number(e.target.value)))}
              className="w-full py-2 pl-7 pr-3 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
          <input
            type="range"
            min={0}
            max={300000}
            step={5000}
            value={saBalance}
            onChange={(e) => setSaBalance(Number(e.target.value))}
            className="w-full mt-2 accent-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-amber-400 mb-1.5">
            MA Balance (Unchanged)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <input
              type="number"
              value={maBalance}
              onChange={(e) => setMaBalance(Math.max(0, Number(e.target.value)))}
              className="w-full py-2 pl-7 pr-3 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="propertyPledge"
              checked={hasPropertyPledge}
              onChange={(e) => setHasPropertyPledge(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-violet-500"
            />
            <label htmlFor="propertyPledge" className="text-xs text-slate-400">
              Property Pledge (BRS only)
            </label>
          </div>
        </div>
      </div>

      {/* Waterfall Visualization */}
      <div className="p-6 rounded-xl border border-white/[0.08] bg-[#0a0a0a]">
        <div className="flex items-center justify-around">
          {/* Before Age 55 */}
          <div className="text-center">
            <div className="mb-4 px-3 py-1.5 rounded-full bg-slate-800 text-xs font-medium text-slate-300 inline-block">
              Before Age 55
            </div>
            <div className="flex gap-6">
              <Bucket
                label="OA"
                amount={animationPhase === 'after' ? calculations.oaRemaining : oaBalance}
                color="oa"
                showTransfer={animationPhase === 'transferring' && calculations.oaToRa > 0}
                transferAmount={calculations.oaToRa}
                transferDirection="out"
              />
              <Bucket
                label="SA"
                amount={animationPhase === 'after' ? calculations.saRemaining : saBalance}
                color="sa"
                showTransfer={animationPhase === 'transferring'}
                transferAmount={calculations.saToRa}
                transferDirection="out"
              />
              <Bucket
                label="MA"
                amount={maBalance}
                color="ma"
              />
            </div>
          </div>

          {/* Transfer Arrow */}
          <div className="flex flex-col items-center px-4">
            <motion.div
              animate={animationPhase === 'transferring' ? { x: [0, 10, 0] } : {}}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <ArrowRight className="h-8 w-8 text-violet-400" />
            </motion.div>
            <div className="mt-2 text-center">
              <div className="text-xs text-slate-500">Target</div>
              <div className="text-sm font-medium text-violet-400">
                {hasPropertyPledge ? 'BRS' : 'FRS'}
              </div>
              <div className="text-xs text-slate-400">
                {formatCurrency(calculations.targetSum)}
              </div>
            </div>
          </div>

          {/* After Age 55 */}
          <div className="text-center">
            <div className="mb-4 px-3 py-1.5 rounded-full bg-violet-500/20 text-xs font-medium text-violet-300 inline-block">
              After Age 55
            </div>
            <div className="flex gap-6">
              <Bucket
                label="OA"
                amount={animationPhase !== 'before' ? calculations.oaRemaining : 0}
                color="oa"
              />
              <Bucket
                label="RA"
                amount={animationPhase !== 'before' ? calculations.raTotal : 0}
                color="ra"
                isNew={animationPhase === 'after'}
                showTransfer={animationPhase === 'transferring'}
                transferAmount={calculations.saToRa + calculations.oaToRa}
                transferDirection="in"
              />
              <Bucket
                label="MA"
                amount={maBalance}
                color="ma"
              />
            </div>
          </div>
        </div>

        {/* Transfer Details */}
        <AnimatePresence>
          {animationPhase !== 'before' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 grid grid-cols-2 gap-4"
            >
              {/* Transfer breakdown */}
              <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <h4 className="text-sm font-medium text-violet-400 mb-3">Transfer Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-emerald-400">SA → RA:</span>
                    <span className="text-white font-medium">{formatCurrency(calculations.saToRa)}</span>
                  </div>
                  {calculations.oaToRa > 0 && (
                    <div className="flex justify-between">
                      <span className="text-blue-400">OA → RA:</span>
                      <span className="text-white font-medium">{formatCurrency(calculations.oaToRa)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-white/10 flex justify-between">
                    <span className="text-violet-400">Total RA:</span>
                    <span className="text-white font-bold">{formatCurrency(calculations.raTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Outcome */}
              <div className={cn(
                "p-4 rounded-lg border",
                calculations.canWithdraw
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-red-500/10 border-red-500/20"
              )}>
                <h4 className={cn(
                  "text-sm font-medium mb-3",
                  calculations.canWithdraw ? "text-emerald-400" : "text-red-400"
                )}>
                  {calculations.canWithdraw ? (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" />
                      Withdrawal Available
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      Below Target
                    </span>
                  )}
                </h4>
                <div className="space-y-2 text-sm">
                  {calculations.canWithdraw ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Withdrawable:</span>
                        <span className="text-emerald-400 font-bold text-lg">
                          {formatCurrency(calculations.withdrawable)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Amount above {hasPropertyPledge ? 'BRS' : 'FRS'} can be withdrawn in cash
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Shortfall:</span>
                        <span className="text-red-400 font-bold">
                          ({formatCurrency(calculations.shortfall)})
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Cannot withdraw until RA reaches {hasPropertyPledge ? 'BRS' : 'FRS'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Educational Info */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
        <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-medium text-blue-300">How RA Formation Works</p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-400">
            <li><strong className="text-emerald-400">Step 1:</strong> Your entire SA balance transfers to RA first</li>
            <li><strong className="text-blue-400">Step 2:</strong> If SA doesn&apos;t cover the target, OA fills the gap</li>
            <li><strong className="text-violet-400">Result:</strong> RA must meet FRS ($213K) or BRS ($106.5K with property pledge)</li>
            <li><strong className="text-amber-400">MA:</strong> MediSave remains separate and unchanged</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
