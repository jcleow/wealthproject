'use client'

import { useState } from 'react'
import { Calculator } from 'lucide-react'
import type { CPFAssumptions } from '@/types/cpf'
import { DEFAULT_CPF_ASSUMPTIONS } from '@/types/cpf'
import { type TargetSum } from '@/lib/cpf-constants'
import { Age55DecisionFlowchart } from '../Age55DecisionFlowchart'
import { CPFAssumptionsPanel } from '../CPFAssumptionsPanel'
import { CPFLifeEstimator } from '../CPFLifeEstimator'
import { useRAConversion } from './hooks'
import {
  BalanceInputSection,
  RetirementSumTargets,
  ResultsCards,
  Age65Comparison,
  SankeyDiagram,
  TransferBreakdown,
} from './components'

type InputMode = 'current' | 'manual'

interface Age55ConversionSimulatorProps {
  className?: string
}

export function Age55ConversionSimulator({
  className,
}: Age55ConversionSimulatorProps) {
  // Assumptions state (user-adjustable)
  const [assumptions, setAssumptions] = useState<CPFAssumptions>(
    DEFAULT_CPF_ASSUMPTIONS
  )

  // Input mode state
  const [inputMode, setInputMode] = useState<InputMode>('manual')

  // Current balances mode inputs
  const [currentAge, setCurrentAge] = useState(35)
  const [currentOA, setCurrentOA] = useState(50000)
  const [currentSA, setCurrentSA] = useState(30000)
  const [currentMA, setCurrentMA] = useState(25000)

  // Manual mode inputs (balances at 55)
  const [manualOA, setManualOA] = useState(150000)
  const [manualSA, setManualSA] = useState(180000)
  const [manualMA, setManualMA] = useState(68000)

  // Target selection
  const [targetSum, setTargetSum] = useState<TargetSum>('FRS')
  const [hasPropertyPledge, setHasPropertyPledge] = useState(false)
  const [cashBalance, setCashBalance] = useState(0)

  // Use the calculation hook
  const { balancesAt55, result } = useRAConversion({
    inputMode,
    currentAge,
    currentOA,
    currentSA,
    currentMA,
    manualOA,
    manualSA,
    manualMA,
    targetSum,
    hasPropertyPledge,
    cashBalance,
    assumptions,
  })

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Assumptions Panel */}
      <CPFAssumptionsPanel
        assumptions={assumptions}
        onChange={setAssumptions}
        collapsible={true}
        defaultExpanded={false}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-medium text-white">
            <Calculator className="h-5 w-5 text-amber-400" />
            Age 55 RA Conversion Simulator
          </h3>
          <p className="text-sm text-slate-400">
            See how your CPF balances convert to a Retirement Account at age 55
          </p>
        </div>

        {/* Input Mode Toggle */}
        <div className="flex rounded-lg border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setInputMode('current')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              inputMode === 'current'
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Project from Current
          </button>
          <button
            onClick={() => setInputMode('manual')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              inputMode === 'manual'
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Enter at Age 55
          </button>
        </div>
      </div>

      {/* Input Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BalanceInputSection
          inputMode={inputMode}
          currentAge={currentAge}
          setCurrentAge={setCurrentAge}
          currentOA={currentOA}
          setCurrentOA={setCurrentOA}
          currentSA={currentSA}
          setCurrentSA={setCurrentSA}
          currentMA={currentMA}
          setCurrentMA={setCurrentMA}
          manualOA={manualOA}
          setManualOA={setManualOA}
          manualSA={manualSA}
          setManualSA={setManualSA}
          manualMA={manualMA}
          setManualMA={setManualMA}
          balancesAt55={balancesAt55}
        />

        <RetirementSumTargets
          targetSum={targetSum}
          setTargetSum={setTargetSum}
          hasPropertyPledge={hasPropertyPledge}
          setHasPropertyPledge={setHasPropertyPledge}
          cashBalance={cashBalance}
          setCashBalance={setCashBalance}
        />
      </div>

      {/* Decision Flowchart */}
      <Age55DecisionFlowchart
        saBalance={balancesAt55.sa}
        oaBalance={balancesAt55.oa}
      />

      {/* Sankey Flow Chart */}
      <SankeyDiagram result={result} />

      {/* Results Panel */}
      <ResultsCards result={result} targetSum={targetSum} />

      {/* Age 65: RSS vs CPF LIFE Section */}
      <Age65Comparison result={result} />

      {/* CPF LIFE Payout Estimator - shown when eligible */}
      {result.qualifiesForCPFLife && (
        <CPFLifeEstimator
          initialRaBalance={Math.round(result.raAt65)}
          initialBirthYear={inputMode === 'current' ? new Date().getFullYear() - currentAge : undefined}
        />
      )}

      {/* Transfer Breakdown & Educational Footer */}
      <TransferBreakdown result={result} />
    </div>
  )
}
