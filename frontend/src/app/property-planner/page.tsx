"use client"

import { useState, useCallback } from 'react'
import { PropertyTimeline, ScenarioInfo } from '@/components/property-timeline/PropertyTimeline'
import type { Milestone } from '@/components/property-timeline/PropertyTimeline'
import { MortgageCalculatorPanel, type ScenarioType } from '@/components/property-timeline/MortgageCalculatorPanel'

// ============================================
// PURCHASE TIMELINES
// ============================================

// HDB Resale milestones
const hdbResaleMilestones: Milestone[] = [
  {
    id: 'otp',
    label: 'Option To Purchase (OTP)',
    sublabel: '$1k cash',
    position: 5,
  },
  {
    id: 'exercise',
    label: 'Exercise OTP',
    sublabel: '$4k cash',
    position: 10,
  },
  {
    id: 'application',
    label: 'HDB resale application',
    sublabel: '',
    details: ['HDB Admin Fee ($80)', 'Buyer Stamp Duty ($2K)', 'Legal / Conveyancing ($2K)'],
    position: 15,
  },
  {
    id: 'completion',
    label: 'HDB Resale Completion',
    sublabel: 'Down payment (25%)',
    position: 25,
  },
  {
    id: 'loan',
    label: 'Loan repayment',
    sublabel: '(75%)',
    details: ['$600K + interest', '30 years'],
    position: 60,
    color: 'text-green-400',
  },
]

// HDB BTO milestones
const hdbBtoMilestones: Milestone[] = [
  {
    id: 'apply',
    label: 'Apply',
    sublabel: '$30 fee',
    position: 2,
  },
  {
    id: 'ballot',
    label: 'Ballot result',
    position: 8,
  },
  {
    id: 'choose',
    label: 'Choose Unit',
    sublabel: 'Option Fee ($2k)',
    position: 14,
  },
  {
    id: 'sign',
    label: 'Sign Lease',
    sublabel: 'Down payment (5% or 20%)',
    details: ['Legal ($2K)'],
    position: 22,
  },
  {
    id: 'construction',
    label: 'Construction',
    sublabel: '5 years',
    position: 40,
    color: 'text-yellow-400',
  },
  {
    id: 'key',
    label: 'Key Collection',
    position: 55,
  },
  {
    id: 'loan',
    label: 'Loan repayment',
    sublabel: '(80 - 95%)',
    details: ['$480K - $570K', '30 years'],
    position: 75,
    color: 'text-green-400',
  },
]

// EC milestones
const ecMilestones: Milestone[] = [
  {
    id: 'aip',
    label: 'AIP from bank',
    sublabel: 'Approval-In-Principle',
    position: 3,
  },
  {
    id: 'apply',
    label: 'Apply',
    sublabel: 'EC Launch',
    position: 10,
  },
  {
    id: 'choose',
    label: 'Choose Unit',
    sublabel: 'Booking Fee (5%)',
    position: 15,
  },
  {
    id: 'spa',
    label: 'Sign Purchase Agreement',
    sublabel: '',
    details: ['BSD ($32K)', 'Legal (4K)', 'Down payment (15%)'],
    position: 22,
  },
  {
    id: 'construction',
    label: 'Construction',
    sublabel: '3 years',
    position: 42,
    color: 'text-yellow-400',
  },
  {
    id: 'key',
    label: 'Key Collection',
    position: 55,
  },
  {
    id: 'loan',
    label: 'Loan repayment',
    sublabel: '$960K (80%)',
    details: ['30 years', 'Starts progressively during construction'],
    position: 75,
    color: 'text-green-400',
  },
]

// ============================================
// SALE TIMELINES
// ============================================

// HDB Sale (after MOP) milestones
const hdbSaleMilestones: Milestone[] = [
  {
    id: 'mop',
    label: 'MOP Fulfilled',
    sublabel: '5 years from key collection',
    position: 5,
    color: 'text-green-400',
  },
  {
    id: 'list',
    label: 'List Property',
    sublabel: 'Engage agent (optional)',
    position: 10,
  },
  {
    id: 'otp',
    label: 'Grant OTP to Buyer',
    sublabel: 'Receive $1K option fee',
    position: 18,
  },
  {
    id: 'exercise',
    label: 'Buyer Exercises OTP',
    sublabel: 'Receive $4K (within 21 days)',
    position: 25,
  },
  {
    id: 'resale_app',
    label: 'HDB Resale Application',
    sublabel: 'Submit with buyer',
    details: ['Admin fee ($80)'],
    position: 32,
  },
  {
    id: 'completion',
    label: 'Completion',
    sublabel: 'Receive balance',
    details: ['Discharge mortgage', 'Refund CPF + accrued interest'],
    position: 45,
    color: 'text-yellow-400',
  },
  {
    id: 'cpf_refund',
    label: 'CPF Refund',
    sublabel: 'Within 1 month',
    details: ['Principal used', '+ 2.5% accrued interest'],
    position: 55,
    color: 'text-red-400',
  },
]

// Private Property Sale milestones
const privateSaleMilestones: Milestone[] = [
  {
    id: 'list',
    label: 'List Property',
    sublabel: 'No MOP for private',
    position: 5,
  },
  {
    id: 'otp',
    label: 'Grant OTP to Buyer',
    sublabel: 'Receive 1% option fee',
    details: ['Typically 2 weeks validity'],
    position: 15,
  },
  {
    id: 'exercise',
    label: 'Buyer Exercises OTP',
    sublabel: 'Receive 4% deposit',
    position: 22,
  },
  {
    id: 'completion',
    label: 'Completion',
    sublabel: '8-12 weeks',
    details: ['Receive balance (95%)', 'Discharge mortgage'],
    position: 40,
  },
  {
    id: 'ssd_check',
    label: 'SSD Check',
    sublabel: 'If < 3 years ownership',
    details: ['Year 1: 12%', 'Year 2: 8%', 'Year 3: 4%'],
    position: 55,
    color: 'text-red-400',
  },
  {
    id: 'cpf_refund',
    label: 'CPF Refund',
    sublabel: 'If used CPF',
    details: ['Principal + 2.5% accrued interest'],
    position: 70,
    color: 'text-yellow-400',
  },
]

// Upgrade scenario: Sell HDB, Buy Private
const upgradeScenarioMilestones: Milestone[] = [
  {
    id: 'sell_otp',
    label: 'Sell: Grant OTP',
    sublabel: 'Sell existing HDB',
    position: 5,
  },
  {
    id: 'buy_otp',
    label: 'Buy: Sign OTP',
    sublabel: 'New private property',
    details: ['1% option fee'],
    position: 12,
    color: 'text-blue-400',
  },
  {
    id: 'sell_complete',
    label: 'Sell: Completion',
    sublabel: 'Receive sale proceeds',
    details: ['CPF refund triggered'],
    position: 25,
    color: 'text-green-400',
  },
  {
    id: 'absd_remission',
    label: 'ABSD Consideration',
    sublabel: 'If buying before selling',
    details: ['Pay ABSD upfront', 'Remission if sell within 6 months'],
    position: 35,
    color: 'text-red-400',
  },
  {
    id: 'buy_complete',
    label: 'Buy: Completion',
    sublabel: 'New property keys',
    details: ['Use sale proceeds', 'New loan disbursement'],
    position: 50,
    color: 'text-blue-400',
  },
  {
    id: 'loan_start',
    label: 'New Loan Repayment',
    sublabel: 'Monthly instalments begin',
    position: 70,
    color: 'text-green-400',
  },
]

export default function PropertyPlannerPage() {
  // State for selected scenario (for calculator panel)
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('hdb-resale')

  // State for purchase scenarios
  const [resaleMilestones, setResaleMilestones] = useState(hdbResaleMilestones)
  const [btoMilestones, setBtoMilestones] = useState(hdbBtoMilestones)
  const [ecMilestonesState, setEcMilestones] = useState(ecMilestones)

  // State for sale scenarios
  const [hdbSaleState, setHdbSaleState] = useState(hdbSaleMilestones)
  const [privateSaleState, setPrivateSaleState] = useState(privateSaleMilestones)
  const [upgradeState, setUpgradeState] = useState(upgradeScenarioMilestones)

  // Handle milestone move - purchase
  const handleResaleMove = useCallback((id: string, newPosition: number) => {
    setResaleMilestones(prev =>
      prev.map(m => m.id === id ? { ...m, position: newPosition } : m)
    )
  }, [])

  const handleBtoMove = useCallback((id: string, newPosition: number) => {
    setBtoMilestones(prev =>
      prev.map(m => m.id === id ? { ...m, position: newPosition } : m)
    )
  }, [])

  const handleEcMove = useCallback((id: string, newPosition: number) => {
    setEcMilestones(prev =>
      prev.map(m => m.id === id ? { ...m, position: newPosition } : m)
    )
  }, [])

  // Handle milestone move - sale
  const handleHdbSaleMove = useCallback((id: string, newPosition: number) => {
    setHdbSaleState(prev =>
      prev.map(m => m.id === id ? { ...m, position: newPosition } : m)
    )
  }, [])

  const handlePrivateSaleMove = useCallback((id: string, newPosition: number) => {
    setPrivateSaleState(prev =>
      prev.map(m => m.id === id ? { ...m, position: newPosition } : m)
    )
  }, [])

  const handleUpgradeMove = useCallback((id: string, newPosition: number) => {
    setUpgradeState(prev =>
      prev.map(m => m.id === id ? { ...m, position: newPosition } : m)
    )
  }, [])

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          {/* Main content - scrollable */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold mb-4">Property Purchase Timeline</h1>
            <p className="text-slate-400 mb-8">Click a scenario to calculate CPF + Cash repayment. Drag milestone markers to adjust timing.</p>

            {/* Down Payment Options - Top Right */}
            <div className="flex justify-end mb-4">
              <div className="text-right text-sm">
                <div className="text-yellow-400 font-medium">Down Payment options</div>
                <div className="text-slate-300">1 - Bank Loan - 25%</div>
                <div className="text-slate-300">2 - HDB Loan - 20% CPF + 5% cash</div>
              </div>
            </div>

            {/* Scenario 1: HDB Resale */}
            <div
              className={`cursor-pointer transition-all rounded-xl ${selectedScenario === 'hdb-resale' ? 'ring-2 ring-pink-500 ring-offset-2 ring-offset-black' : 'hover:bg-white/5'}`}
              onClick={() => setSelectedScenario('hdb-resale')}
            >
              <PropertyTimeline
                milestones={resaleMilestones}
                onMilestoneMove={handleResaleMove}
                startLabel="Start"
                endLabel="Year 30"
                leftInfo={
                  <ScenarioInfo
                    title="HDB Resale"
                    subtitle="Scenario 1"
                    price="$800K"
                    highlights={[
                      { label: 'Upfront', value: '227K (5K cash / rest CPF)' },
                      { label: 'Downpayment', value: '$200K (CPF/cash)' },
                      { label: 'OTP', value: '$5K (cash)', color: 'text-yellow-300' },
                      { label: 'Legal + Admin', value: '$3K (CPF)' },
                      { label: 'BSD', value: '$19K (CPF)', color: 'text-green-300' },
                    ]}
                  />
                }
                className="mb-12 border-b border-slate-800 pb-12"
              />
            </div>

            {/* Down Payment Options for BTO */}
            <div className="flex justify-end mb-4">
              <div className="text-right text-sm">
                <div className="text-yellow-400 font-medium">Down Payment options</div>
                <div className="text-slate-300">1 - Bank Loan - 5% CPF</div>
                <div className="text-slate-300">2 - HDB Loan - 15% CPF + 5% cash</div>
              </div>
            </div>

            {/* Scenario 2: HDB BTO */}
            <div
              className={`cursor-pointer transition-all rounded-xl ${selectedScenario === 'hdb-bto' ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-black' : 'hover:bg-white/5'}`}
              onClick={() => setSelectedScenario('hdb-bto')}
            >
              <PropertyTimeline
                milestones={btoMilestones}
                onMilestoneMove={handleBtoMove}
                startLabel="Start"
                endLabel="Year 35"
                leftInfo={
                  <ScenarioInfo
                    title="HDB BTO"
                    subtitle="Scenario 2"
                    price="$600K"
                    highlights={[
                      { label: 'Option 1 HDB loan', value: '47K (2K cash / rest CPF)', color: 'text-yellow-300' },
                      { label: 'Option 2 Bank loan', value: '137K (32K cash)', color: 'text-yellow-300' },
                      { label: 'Down Payment', value: '30K or 120K (CPF)' },
                      { label: 'Option Fee', value: '$2K (cash)' },
                      { label: 'Legal Fee', value: '$2K (CPF)' },
                      { label: 'BSD', value: '$13K (CPF)', color: 'text-green-300' },
                    ]}
                    className="bg-purple-700"
                  />
                }
                className="mb-12 border-b border-slate-800 pb-12"
              />
            </div>

            {/* Scenario 3: EC */}
            <div
              className={`cursor-pointer transition-all rounded-xl ${selectedScenario === 'ec' ? 'ring-2 ring-teal-500 ring-offset-2 ring-offset-black' : 'hover:bg-white/5'}`}
              onClick={() => setSelectedScenario('ec')}
            >
              <PropertyTimeline
                milestones={ecMilestonesState}
                onMilestoneMove={handleEcMove}
                startLabel="Start"
                endLabel="Year 35"
                leftInfo={
                  <ScenarioInfo
                    title="Exec Condo"
                    subtitle="Scenario 3"
                    price="$1.2M"
                    highlights={[
                      { label: 'Upfront', value: '276K (60K cash / rest CPF)', color: 'text-yellow-300' },
                      { label: '5% Booking Fee', value: '$60K (cash)' },
                      { label: '15% Down Payment', value: '$180K (CPF)' },
                      { label: 'Admin', value: '$4K (CPF)' },
                      { label: 'BSD', value: '$32K (CPF)', color: 'text-green-300' },
                    ]}
                    className="bg-teal-700"
                  />
                }
                className="mb-12 border-b border-slate-800 pb-12"
              />
            </div>

            {/* ============================================ */}
            {/* SALE TIMELINES */}
            {/* ============================================ */}

            <h2 className="text-2xl font-bold mt-16 mb-8 text-orange-400">Property Sale Timelines</h2>

            {/* HDB Sale */}
            <div
              className={`cursor-pointer transition-all rounded-xl ${selectedScenario === 'hdb-sale' ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-black' : 'hover:bg-white/5'}`}
              onClick={() => setSelectedScenario('hdb-sale')}
            >
              <PropertyTimeline
                milestones={hdbSaleState}
                onMilestoneMove={handleHdbSaleMove}
                startLabel="After MOP"
                endLabel="Month 6"
                leftInfo={
                  <ScenarioInfo
                    title="HDB Sale"
                    subtitle="Sale Scenario 1"
                    price="Selling at $900K"
                    highlights={[
                      { label: 'Sale proceeds', value: '$900K' },
                      { label: 'Less mortgage', value: '-$400K outstanding' },
                      { label: 'Less CPF refund', value: '-$250K (principal + interest)', color: 'text-red-300' },
                      { label: 'Cash proceeds', value: '$250K', color: 'text-green-300' },
                      { label: 'Agent fee', value: '~2% ($18K)' },
                    ]}
                    className="bg-orange-700"
                  />
                }
                className="mb-12 border-b border-slate-800 pb-12"
              />
            </div>

            {/* Private Sale */}
            <div
              className={`cursor-pointer transition-all rounded-xl ${selectedScenario === 'private-sale' ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-black' : 'hover:bg-white/5'}`}
              onClick={() => setSelectedScenario('private-sale')}
            >
              <PropertyTimeline
                milestones={privateSaleState}
                onMilestoneMove={handlePrivateSaleMove}
                startLabel="Start"
                endLabel="Month 6"
                leftInfo={
                  <ScenarioInfo
                    title="Private Sale"
                    subtitle="Sale Scenario 2"
                    price="Selling at $1.5M"
                    highlights={[
                      { label: 'Sale proceeds', value: '$1.5M' },
                      { label: 'Less mortgage', value: '-$800K outstanding' },
                      { label: 'Less CPF refund', value: '-$300K (if used CPF)', color: 'text-red-300' },
                      { label: 'Less SSD', value: 'Check holding period!', color: 'text-yellow-300' },
                      { label: 'Agent fee', value: '~2% ($30K)' },
                    ]}
                    className="bg-red-800"
                  />
                }
                className="mb-12 border-b border-slate-800 pb-12"
              />
            </div>

            {/* Upgrade Scenario */}
            <div
              className={`cursor-pointer transition-all rounded-xl ${selectedScenario === 'upgrade' ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-black' : 'hover:bg-white/5'}`}
              onClick={() => setSelectedScenario('upgrade')}
            >
              <PropertyTimeline
                milestones={upgradeState}
                onMilestoneMove={handleUpgradeMove}
                startLabel="Start"
                endLabel="Month 12"
                leftInfo={
                  <ScenarioInfo
                    title="Upgrade Path"
                    subtitle="Sell HDB → Buy Private"
                    price="Complex Scenario"
                    highlights={[
                      { label: 'Timing', value: 'Sell first to avoid ABSD', color: 'text-yellow-300' },
                      { label: 'ABSD risk', value: '17% if buy before sell', color: 'text-red-300' },
                      { label: 'CPF refund', value: 'Goes back to OA first' },
                      { label: 'Bridge loan', value: 'May be needed' },
                      { label: 'Rental gap', value: 'Plan for interim housing' },
                    ]}
                    className="bg-indigo-700"
                  />
                }
                className="mb-12 border-b border-slate-800 pb-12"
              />
            </div>

            {/* ============================================ */}
            {/* IMPORTANT NOTES */}
            {/* ============================================ */}

            <h2 className="text-2xl font-bold mt-16 mb-8 text-red-400">Important Notes: Grants & CPF</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {/* CPF Usage Notes */}
              <div className="rounded-lg bg-slate-900 border border-slate-700 p-6">
                <h3 className="text-lg font-bold text-emerald-400 mb-4">CPF OA for Housing</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-2">
                    <span className="text-emerald-400">•</span>
                    <span><strong className="text-white">Valuation Limit (VL):</strong> Can only use CPF up to property valuation or purchase price, whichever is lower</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400">•</span>
                    <span><strong className="text-white">Withdrawal Limit (WL):</strong> Max CPF usage = VL × remaining lease ÷ 99 years</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400">•</span>
                    <span><strong className="text-white">Accrued Interest:</strong> 2.5% p.a. on all CPF used - must refund when selling!</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400">•</span>
                    <span><strong className="text-white">Age 55 Impact:</strong> CPF used for housing affects your retirement sum calculations</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-yellow-400">•</span>
                    <span><strong className="text-white">Monthly payments:</strong> Can use CPF OA for monthly mortgage if insufficient cash</span>
                  </li>
                </ul>
              </div>

              {/* Grant Clawback Notes */}
              <div className="rounded-lg bg-slate-900 border border-slate-700 p-6">
                <h3 className="text-lg font-bold text-pink-400 mb-4">Grant Conditions & Clawback</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-2">
                    <span className="text-pink-400">•</span>
                    <span><strong className="text-white">MOP Requirement:</strong> Must fulfill 5-year MOP before selling (10 years for Prime/Plus)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-pink-400">•</span>
                    <span><strong className="text-white">EHG Clawback:</strong> If sell within 5 years, return grant + accrued interest to CPF</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-pink-400">•</span>
                    <span><strong className="text-white">PHG Proximity:</strong> Must continue living near parents/children to keep grant</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400">•</span>
                    <span><strong className="text-white">Second-timer:</strong> If received grant before, may not be eligible again or get reduced amount</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-yellow-400">•</span>
                    <span><strong className="text-white">Income ceiling:</strong> Grants have income ceiling requirements at point of application</span>
                  </li>
                </ul>
              </div>

              {/* Stamp Duty Notes */}
              <div className="rounded-lg bg-slate-900 border border-slate-700 p-6">
                <h3 className="text-lg font-bold text-blue-400 mb-4">Stamp Duties (BSD/ABSD/SSD)</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-2">
                    <span className="text-blue-400">•</span>
                    <span><strong className="text-white">BSD:</strong> 1-6% tiered rate on purchase price (buyer pays)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400">•</span>
                    <span><strong className="text-white">ABSD (SC 2nd property):</strong> 20% additional stamp duty</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400">•</span>
                    <span><strong className="text-white">ABSD (PR 1st property):</strong> 5% additional stamp duty</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400">•</span>
                    <span><strong className="text-white">SSD (Seller):</strong> If selling within 3 years: Year 1 = 12%, Year 2 = 8%, Year 3 = 4%</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-yellow-400">•</span>
                    <span><strong className="text-white">ABSD Remission:</strong> If upgrading, sell old property within 6 months to get ABSD back</span>
                  </li>
                </ul>
              </div>

              {/* Loan Considerations */}
              <div className="rounded-lg bg-slate-900 border border-slate-700 p-6">
                <h3 className="text-lg font-bold text-purple-400 mb-4">Loan Considerations</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-2">
                    <span className="text-purple-400">•</span>
                    <span><strong className="text-white">HDB Loan:</strong> 2.6% fixed, 75% LTV, no cash down required</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">•</span>
                    <span><strong className="text-white">Bank Loan:</strong> Variable rates (~3-4%), 75% LTV, 5% min cash down</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">•</span>
                    <span><strong className="text-white">MSR Limit:</strong> Monthly payment ≤ 30% of gross income (HDB/EC)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">•</span>
                    <span><strong className="text-white">TDSR Limit:</strong> Total debt ≤ 55% of gross income (all loans)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-yellow-400">•</span>
                    <span><strong className="text-white">Age factor:</strong> Loan tenure may be shortened based on borrower age (65-year limit)</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* CPF Refund Calculator Note */}
            <div className="rounded-lg bg-red-900/30 border border-red-700 p-6 mb-12">
              <h3 className="text-lg font-bold text-red-400 mb-4">⚠️ CPF Accrued Interest - Don&apos;t Get Caught Off Guard!</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <div className="text-slate-400 mb-2">Example: Used $200K CPF over 10 years</div>
                  <div className="font-mono text-lg text-white">
                    Principal: $200,000<br/>
                    + Interest: ~$56,000<br/>
                    <span className="text-red-400">= Refund: ~$256,000</span>
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 mb-2">Example: Used $300K CPF over 20 years</div>
                  <div className="font-mono text-lg text-white">
                    Principal: $300,000<br/>
                    + Interest: ~$197,000<br/>
                    <span className="text-red-400">= Refund: ~$497,000</span>
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 mb-2">Impact on sale proceeds</div>
                  <div className="text-white">
                    The CPF refund comes from your sale proceeds first.<br/>
                    <span className="text-yellow-400">Plan ahead - you may have less cash than expected!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Calculator Panel - Right Side */}
          <div className="w-96 flex-shrink-0">
            <div className="sticky top-8">
              <MortgageCalculatorPanel selectedScenario={selectedScenario} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
