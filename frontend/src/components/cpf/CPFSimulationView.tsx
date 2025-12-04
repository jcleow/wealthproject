'use client'

import { useState } from 'react'
import {
  Wallet,
  TrendingUp,
  PiggyBank,
  Shield,
  Home,
  LineChart,
  GitBranch,
  Banknote,
  GraduationCap,
  X,
} from 'lucide-react'

import {
  CPFBalanceOverview,
  CPFContributionFlow,
  CPFISInvestmentDashboard,
  TopUpTaxReliefCalculator,
  SAShieldingPlanner,
  PropertyCPFUsage,
  CPFProjectionChart,
  RetirementPayoutPlanner,
  CPFContributionCalculator,
  CPFHousingCalculator,
  CPFLifeEstimator,
  Age55RASimulator,
  CPFJourneyCalculator,
} from '@/components/cpf'
import {
  mockCPFProfile,
  mockCPFISInvestments,
  mockInvestibleBalance,
} from '@/lib/cpf-mock-data'

type TabId = 'overview' | 'flow' | 'projection' | 'retirement' | 'investments' | 'topup' | 'shielding' | 'property' | 'learn'

const TABS: { id: TabId; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <Wallet className="h-4 w-4" />,
    description: 'CPF account balances',
  },
  {
    id: 'flow',
    label: 'Contribution Flow',
    icon: <GitBranch className="h-4 w-4" />,
    description: 'How salary flows to CPF accounts',
  },
  {
    id: 'projection',
    label: 'Projection',
    icon: <LineChart className="h-4 w-4" />,
    description: '30-year forecast',
  },
  {
    id: 'retirement',
    label: 'Retirement Payout',
    icon: <Banknote className="h-4 w-4" />,
    description: 'CPF LIFE estimator',
  },
  {
    id: 'investments',
    label: 'CPFIS',
    icon: <TrendingUp className="h-4 w-4" />,
    description: 'Investment scheme',
  },
  {
    id: 'topup',
    label: 'Top-ups',
    icon: <PiggyBank className="h-4 w-4" />,
    description: 'Tax relief calculator',
  },
  {
    id: 'shielding',
    label: 'SA Shielding',
    icon: <Shield className="h-4 w-4" />,
    description: 'Pre-55 strategy',
  },
  {
    id: 'property',
    label: 'Property',
    icon: <Home className="h-4 w-4" />,
    description: 'Housing & grants',
  },
  {
    id: 'learn',
    label: 'Learn',
    icon: <GraduationCap className="h-4 w-4" />,
    description: 'Interactive CPF calculator',
  },
]

interface CPFSimulationViewProps {
  onClose: () => void
}

type LearnCalculator = 'journey' | 'contribution' | 'housing' | 'age55' | 'cpflife'

const LEARN_CALCULATORS: { id: LearnCalculator; label: string; description: string }[] = [
  { id: 'journey', label: 'CPF Journey', description: 'Complete lifecycle overview' },
  { id: 'contribution', label: 'CPF Contributions', description: 'How salary flows to OA/SA/MA' },
  { id: 'housing', label: 'Housing Limits', description: 'Valuation & Withdrawal Limits' },
  { id: 'age55', label: 'Age 55 (RA Creation)', description: 'SA/OA transfer to RA' },
  { id: 'cpflife', label: 'CPF LIFE Payouts', description: 'Retirement income estimator' },
]

export function CPFSimulationView({ onClose }: CPFSimulationViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [activeCalculator, setActiveCalculator] = useState<LearnCalculator>('journey')

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20">
            <Wallet className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">CPF Simulation</h1>
            <p className="text-xs text-slate-400">
              Age {mockCPFProfile.age} · {mockCPFProfile.residencyStatus.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
          title="Close CPF Simulation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-white/[0.06] px-5">
        <div className="scrollbar-hide flex gap-1 overflow-x-auto py-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-white/[0.08] text-white'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'overview' && <CPFBalanceOverview profile={mockCPFProfile} />}

        {activeTab === 'flow' && <CPFContributionFlow profile={mockCPFProfile} />}

        {activeTab === 'projection' && <CPFProjectionChart profile={mockCPFProfile} />}

        {activeTab === 'retirement' && <RetirementPayoutPlanner profile={mockCPFProfile} />}

        {activeTab === 'investments' && (
          <CPFISInvestmentDashboard
            investments={mockCPFISInvestments}
            investibleBalance={mockInvestibleBalance}
            oaBalance={mockCPFProfile.balances.oa}
            saBalance={mockCPFProfile.balances.sa}
          />
        )}

        {activeTab === 'topup' && <TopUpTaxReliefCalculator profile={mockCPFProfile} />}

        {activeTab === 'shielding' && <SAShieldingPlanner profile={mockCPFProfile} />}

        {activeTab === 'property' && <PropertyCPFUsage />}

        {activeTab === 'learn' && (
          <div className="space-y-4">
            {/* Calculator Selector */}
            <div className="flex flex-wrap gap-2">
              {LEARN_CALCULATORS.map((calc) => (
                <button
                  key={calc.id}
                  onClick={() => setActiveCalculator(calc.id)}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    activeCalculator === calc.id
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/[0.02] text-slate-400 border border-white/[0.06] hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <div className="font-medium">{calc.label}</div>
                  <div className="text-xs opacity-70">{calc.description}</div>
                </button>
              ))}
            </div>

            {/* Active Calculator */}
            {activeCalculator === 'journey' && <CPFJourneyCalculator />}
            {activeCalculator === 'contribution' && <CPFContributionCalculator />}
            {activeCalculator === 'housing' && <CPFHousingCalculator />}
            {activeCalculator === 'age55' && <Age55RASimulator />}
            {activeCalculator === 'cpflife' && <CPFLifeEstimator />}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.06] px-5 py-3">
        <p className="text-center text-xs text-slate-500">
          Mock data for demonstration. Verify with{' '}
          <a
            href="https://www.cpf.gov.sg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            cpf.gov.sg
          </a>
        </p>
      </div>
    </div>
  )
}
