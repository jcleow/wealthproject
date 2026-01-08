'use client'

import { useState } from 'react'
import {
  Wallet,
  TrendingUp,
  PiggyBank,
  Home,
  LineChart,
  GraduationCap,
  X,
  Layers,
  ChevronDown,
  Sunset,
} from 'lucide-react'

import {
  CPFContributionFlow,
  CPFISInvestmentDashboard,
  TopUpTaxReliefCalculator,
  PropertyCPFUsage,
  CPFProjectionChart,
  CPFContributionCalculator,
  CPFHousingCalculator,
  CPFJourneyCalculator,
  Age55ConversionSimulator,
} from '@/components/cpf'
import {
  mockCPFProfile,
  mockCPFISInvestments,
  mockInvestibleBalance,
} from '@/lib/cpf-mock-data'

type TabId = 'overview' | 'projection' | 'schemes' | 'property' | 'retirement' | 'learn'

const TABS: { id: TabId; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <Wallet className="h-4 w-4" />,
    description: 'Balances & contribution flow',
  },
  {
    id: 'projection',
    label: 'Projection',
    icon: <LineChart className="h-4 w-4" />,
    description: '30-year forecast',
  },
  {
    id: 'schemes',
    label: 'Schemes',
    icon: <Layers className="h-4 w-4" />,
    description: 'CPFIS & RSTU',
  },
  {
    id: 'property',
    label: 'Property',
    icon: <Home className="h-4 w-4" />,
    description: 'Housing & grants',
  },
  {
    id: 'retirement',
    label: 'Retirement',
    icon: <Sunset className="h-4 w-4" />,
    description: 'Age 55 & CPF LIFE',
  },
  {
    id: 'learn',
    label: 'Learn',
    icon: <GraduationCap className="h-4 w-4" />,
    description: 'Interactive CPF calculator',
  },
]

type SchemeId = 'cpfis' | 'rstu'

const SCHEMES: { id: SchemeId; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'cpfis',
    label: 'CPFIS',
    icon: <TrendingUp className="h-4 w-4" />,
    description: 'CPF Investment Scheme',
  },
  {
    id: 'rstu',
    label: 'RSTU / Top-ups',
    icon: <PiggyBank className="h-4 w-4" />,
    description: 'Retirement Sum Topping-Up',
  },
]

interface CPFSimulationViewProps {
  onClose: () => void
}

type LearnCalculator = 'journey' | 'contribution' | 'housing'

const LEARN_CALCULATORS: { id: LearnCalculator; label: string; description: string }[] = [
  { id: 'journey', label: 'CPF Journey', description: 'Complete lifecycle overview' },
  { id: 'contribution', label: 'CPF Contributions', description: 'How salary flows to OA/SA/MA' },
  { id: 'housing', label: 'Housing Limits', description: 'Valuation & Withdrawal Limits' },
]

export function CPFSimulationView({ onClose }: CPFSimulationViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [activeCalculator, setActiveCalculator] = useState<LearnCalculator>('journey')
  const [activeScheme, setActiveScheme] = useState<SchemeId>('cpfis')

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className={`flex items-center justify-between
px-5 py-4
border-b border-white/[0.06]`}>
        <div className="flex items-center gap-4">
          <div className={`flex items-center justify-center
h-9 w-9
rounded-lg
bg-emerald-500/20`}>
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
          className={`flex items-center justify-center
h-8 w-8
rounded-lg
hover:bg-white/5
text-slate-400 hover:text-white
transition`}
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
        {activeTab === 'overview' && <CPFContributionFlow profile={mockCPFProfile} />}

        {activeTab === 'projection' && <CPFProjectionChart profile={mockCPFProfile} />}

        {activeTab === 'schemes' && (
          <div className="space-y-4">
            {/* Scheme Selector Dropdown */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">Select scheme:</span>
              <div className="relative">
                <select
                  value={activeScheme}
                  onChange={(e) => setActiveScheme(e.target.value as SchemeId)}
                  className="appearance-none rounded-lg border border-white/[0.08] bg-white/[0.03] py-2 pl-3 pr-10 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
                >
                  {SCHEMES.map((scheme) => (
                    <option key={scheme.id} value={scheme.id} className="bg-[#0a0a0a]">
                      {scheme.label} - {scheme.description}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Active Scheme Content */}
            {activeScheme === 'cpfis' && (
              <CPFISInvestmentDashboard
                investments={mockCPFISInvestments}
                investibleBalance={mockInvestibleBalance}
                oaBalance={mockCPFProfile.balances.oa}
                saBalance={mockCPFProfile.balances.sa}
              />
            )}
            {activeScheme === 'rstu' && <TopUpTaxReliefCalculator profile={mockCPFProfile} />}
          </div>
        )}

        {activeTab === 'property' && <PropertyCPFUsage />}

        {activeTab === 'retirement' && <Age55ConversionSimulator />}

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
