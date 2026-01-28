'use client'

import { useState } from 'react'
import { Calculator } from 'lucide-react'
import type { CPFAssumptions } from '@/types/cpf'
import { DEFAULT_CPF_ASSUMPTIONS } from '@/types/cpf'
import { type TargetSum } from '@/lib/cpf-constants'
import { useTheme } from '@/lib/theme'
import { CPFAssumptionsPanel } from '../CPFAssumptionsPanel'
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
  const { theme } = useTheme()

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
          <h3
            className="flex items-center gap-2 text-lg font-medium"
            style={{ color: theme.textPrimary }}
          >
            <Calculator className="h-5 w-5" style={{ color: theme.amber }} />
            Age 55 RA Conversion Simulator
          </h3>
          <p className="text-sm" style={{ color: theme.textMuted }}>
            See how your CPF balances convert to a Retirement Account at age 55
          </p>
        </div>

        {/* Input Mode Toggle */}
        <div
          className="flex rounded-lg p-1"
          style={{
            background: theme.controlBg,
            border: `1px solid ${theme.controlBorder}`,
          }}
        >
          <button
            onClick={() => setInputMode('current')}
            className="rounded-md px-4 py-1.5 text-sm font-medium transition"
            style={{
              background: inputMode === 'current' ? theme.activeBg : 'transparent',
              color: inputMode === 'current' ? theme.textPrimary : theme.textMuted,
            }}
          >
            Project from Current
          </button>
          <button
            onClick={() => setInputMode('manual')}
            className="rounded-md px-4 py-1.5 text-sm font-medium transition"
            style={{
              background: inputMode === 'manual' ? theme.activeBg : 'transparent',
              color: inputMode === 'manual' ? theme.textPrimary : theme.textMuted,
            }}
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

      {/* Sankey Flow Chart */}
      <SankeyDiagram result={result} />

      {/* Results Panel */}
      <ResultsCards result={result} targetSum={targetSum} />

      {/* Age 65: RSS vs CPF LIFE Section */}
      <Age65Comparison result={result} />

      {/* Transfer Breakdown & Educational Footer */}
      <TransferBreakdown result={result} />
    </div>
  )
}
