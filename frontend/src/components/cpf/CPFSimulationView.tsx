'use client'

import { useState, useMemo, useEffect } from 'react'
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
  CPFBalanceOverview,
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
import { useCpfAccountsQuery } from '@/hooks/queries/useCpfQuery'
import {
  cpfAccountToProfile,
  computeAgeFromDob,
  formatAccountLabel,
} from '@/lib/cpf-utils'

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

  // CPF Account selection state
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [simulatedAge, setSimulatedAge] = useState<number>(34)

  // Fetch real CPF accounts
  const { data: cpfAccounts, isLoading: isLoadingAccounts } = useCpfAccountsQuery()

  // Auto-select first account when data loads
  useEffect(() => {
    if (cpfAccounts && cpfAccounts.length > 0 && !selectedAccountId) {
      const firstAccount = cpfAccounts[0]
      setSelectedAccountId(firstAccount.id)
      setSimulatedAge(computeAgeFromDob(firstAccount.dateOfBirth))
    }
  }, [cpfAccounts, selectedAccountId])

  // Handle account selection change
  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId)
    const account = cpfAccounts?.find((a) => a.id === accountId)
    if (account) {
      setSimulatedAge(computeAgeFromDob(account.dateOfBirth))
    }
  }

  // Derive CPFProfile from selected account or fall back to mock
  const selectedAccount = cpfAccounts?.find((a) => a.id === selectedAccountId)
  const profile = useMemo(() => {
    if (selectedAccount) {
      return cpfAccountToProfile(selectedAccount, simulatedAge)
    }
    return { ...mockCPFProfile, age: simulatedAge }
  }, [selectedAccount, simulatedAge])

  // Check if we're using mock data
  const usingMockData = !selectedAccount

  // Age group boundaries for visual indicators
  const getAgeGroupLabel = (age: number) => {
    if (age <= 55) return '≤55'
    if (age <= 60) return '55-60'
    if (age <= 65) return '60-65'
    if (age <= 70) return '65-70'
    return '>70'
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20">
              <Wallet className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">CPF Simulation</h1>
              <p className="text-xs text-slate-400">
                Age {simulatedAge} · {profile.residencyStatus.replace(/_/g, ' ')}
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
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Controls - compact, aligned right, fixed width to match main page */}
            <div className="flex justify-end">
              <div className="w-[280px] flex flex-col rounded-xl border border-white/[0.08] bg-white/[0.02]">
                {/* Top row: Person + Age dropdowns */}
                <div className="flex items-center gap-1 p-1">
                  {/* Person Selector */}
                  <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.04] transition-colors">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Person</span>
                    {isLoadingAccounts ? (
                      <div className="h-5 w-16 animate-pulse rounded bg-white/[0.05]" />
                    ) : cpfAccounts && cpfAccounts.length > 0 ? (
                      <div className="relative">
                        <select
                          value={selectedAccountId || ''}
                          onChange={(e) => handleAccountChange(e.target.value)}
                          className="appearance-none bg-transparent pr-5 text-sm font-medium text-white focus:outline-none cursor-pointer"
                        >
                          {cpfAccounts.map((account) => (
                            <option key={account.id} value={account.id} className="bg-[#0a0a0a]">
                              {formatAccountLabel(account)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-amber-300">Demo</span>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="h-6 w-px bg-white/[0.08]" />

                  {/* Age Selector */}
                  <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.04] transition-colors">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Age</span>
                    <span className="text-sm font-medium text-white">{simulatedAge}</span>
                    <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-500">
                      {getAgeGroupLabel(simulatedAge)}
                    </span>
                  </div>
                </div>

                {/* Bottom row: Slider */}
                <div className="border-t border-white/[0.08] px-3 py-2">
                  <input
                    type="range"
                    min={18}
                    max={70}
                    step={1}
                    value={simulatedAge}
                    onChange={(e) => setSimulatedAge(parseInt(e.target.value))}
                    className="h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-700/60 accent-blue-500 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-400 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
                  />
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left: Balance Overview with Pie Chart */}
              <CPFBalanceOverview profile={profile} />
              {/* Right: Contribution Flow (Sankey/Waterfall) */}
              <CPFContributionFlow profile={profile} />
            </div>
          </div>
        )}

        {activeTab === 'projection' && <CPFProjectionChart profile={profile} />}

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
                oaBalance={profile.balances.oa}
                saBalance={profile.balances.sa}
              />
            )}
            {activeScheme === 'rstu' && <TopUpTaxReliefCalculator profile={profile} />}
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
          {usingMockData ? (
            <>
              Demo data for illustration. Verify calculations with{' '}
              <a
                href="https://www.cpf.gov.sg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                cpf.gov.sg
              </a>
            </>
          ) : (
            <>
              Using your CPF data. Simulated age: {simulatedAge}. Verify with{' '}
              <a
                href="https://www.cpf.gov.sg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                cpf.gov.sg
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
