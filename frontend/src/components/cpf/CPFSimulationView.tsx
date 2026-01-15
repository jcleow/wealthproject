'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Wallet,
  Home,
  LineChart,
  GraduationCap,
  X,
  Layers,
  User,
} from 'lucide-react'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'

import {
  CPFBalanceOverview,
  CPFContributionFlow,
  CPFISInvestmentDashboard,
  TopUpTaxReliefCalculator,
  CPFProjectionChart,
  CPFContributionCalculator,
  CPFHousingCalculator,
  CPFJourneyCalculator,
  Age55ConversionSimulator,
  CPFLifePayoutDebug,
} from '@/components/cpf'
import { CPFPropertyOverview } from '@/components/cpf/property'
import {
  mockCPFProfile,
  mockCPFISInvestments,
  mockInvestibleBalance,
} from '@/lib/cpf-mock-data'
import { EXTERNAL_LINKS } from '@/lib/external-links'
import { useCpfAccountsQuery, useCpfBalanceProjectionQuery } from '@/hooks/queries/useCpfQuery'
import {
  cpfAccountToProfile,
  computeAgeFromDob,
  formatAccountLabel,
} from '@/lib/cpf-utils'

type TabId = 'overview' | 'projection' | 'strategies' | 'property' | 'learn'

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
    id: 'property',
    label: 'Property',
    icon: <Home className="h-4 w-4" />,
    description: 'Housing & grants',
  },
  {
    id: 'strategies',
    label: 'Strategies',
    icon: <Layers className="h-4 w-4" />,
    description: 'CPF growth strategies',
  },
]

const LEARN_TAB = {
  id: 'learn' as TabId,
  label: 'Learn',
  icon: <GraduationCap className="h-4 w-4" />,
  description: 'Interactive CPF calculator',
}

type StrategyId = 'contributions' | 'self-employed' | 'vc3a' | 'medisave-topup' | 'rstu' | 'transfers' | 'housing-refund' | 'cpfis'

const STRATEGIES: { id: StrategyId; label: string; description: string }[] = [
  { id: 'contributions', label: 'Regular Contributions', description: 'Building CPF through work' },
  { id: 'self-employed', label: 'Self-Employed', description: 'Contributing as self-employed' },
  { id: 'vc3a', label: 'VC3A', description: 'Voluntary contributions to all accounts' },
  { id: 'medisave-topup', label: 'MediSave Top-Up', description: 'Top-up MediSave only' },
  { id: 'rstu', label: 'RSTU', description: 'Retirement Sum Topping-Up' },
  { id: 'transfers', label: 'CPF Transfers', description: 'Transfer between accounts/members' },
  { id: 'housing-refund', label: 'Housing Refund', description: 'Voluntary housing refund' },
  { id: 'cpfis', label: 'CPFIS', description: 'CPF Investment Scheme' },
]

interface CPFSimulationViewProps {
  onClose: () => void
  initialTab?: TabId
}

// Placeholder component for strategies that don't have dedicated implementations yet
interface StrategyPlaceholderProps {
  title: string
  description: string
  points: string[]
}

function StrategyPlaceholder({ title, description, points }: StrategyPlaceholderProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 mb-4">{description}</p>
      <div className="space-y-2">
        {points.map((point, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-sm text-slate-300">{point}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <p className="text-xs text-blue-300">
          <strong>Coming soon:</strong> Interactive calculator for this strategy will be available in a future update.
        </p>
      </div>
    </div>
  )
}

type LearnCalculator = 'journey' | 'contribution' | 'housing' | 'retirement'

const LEARN_CALCULATORS: { id: LearnCalculator; label: string; description: string }[] = [
  { id: 'journey', label: 'CPF Journey', description: 'Complete lifecycle overview' },
  { id: 'contribution', label: 'CPF Contributions', description: 'How salary flows to OA/SA/MA' },
  { id: 'housing', label: 'Housing Limits', description: 'Valuation & Withdrawal Limits' },
  { id: 'retirement', label: 'Retirement', description: 'Age 55 & CPF LIFE' },
]

export function CPFSimulationView({ onClose, initialTab = 'overview' }: CPFSimulationViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  const [activeCalculator, setActiveCalculator] = useState<LearnCalculator>('journey')
  const [activeStrategy, setActiveStrategy] = useState<StrategyId>('contributions')

  // Check if we're in routed mode (URL-based navigation)
  const isRoutedMode = pathname?.startsWith('/dashboard/cpf')

  // Handle tab change - use URL navigation if in routed mode
  const handleTabChange = (tabId: TabId) => {
    if (isRoutedMode) {
      // Navigate to the appropriate route
      if (tabId === 'overview') {
        router.push('/dashboard/cpf')
      } else if (tabId === 'learn') {
        // Learn tab stays in the current page (no dedicated route)
        setActiveTab(tabId)
      } else {
        router.push(`/dashboard/cpf/${tabId}`)
      }
    } else {
      // Not in routed mode, just update state
      setActiveTab(tabId)
    }
  }

  // CPF Account selection state
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [simulatedAge, setSimulatedAge] = useState<number>(34)
  const [baseAge, setBaseAge] = useState<number>(34) // User's actual current age
  const [displayMode, setDisplayMode] = useState<'age' | 'year'>('age')

  // Current year for age/year conversion
  const currentYear = new Date().getFullYear()

  // Convert between age and year
  const ageToYear = (age: number) => currentYear + (age - baseAge)
  const yearToAge = (year: number) => baseAge + (year - currentYear)

  // Current display value (age or year)
  const displayValue = displayMode === 'age' ? simulatedAge : ageToYear(simulatedAge)
  const minValue = displayMode === 'age' ? baseAge : currentYear
  const maxValue = displayMode === 'age' ? 100 : ageToYear(100)

  // Fetch real CPF accounts
  const { data: cpfAccounts, isLoading: isLoadingAccounts } = useCpfAccountsQuery()

  // Fetch balance projection for the selected account
  const { data: balanceProjection } = useCpfBalanceProjectionQuery(selectedAccountId ?? undefined)

  // Auto-select first account when data loads
  useEffect(() => {
    if (cpfAccounts && cpfAccounts.length > 0 && !selectedAccountId) {
      const firstAccount = cpfAccounts[0]
      setSelectedAccountId(firstAccount.id)
      const age = computeAgeFromDob(firstAccount.dateOfBirth)
      setSimulatedAge(age)
      setBaseAge(age)
    }
  }, [cpfAccounts, selectedAccountId])

  // Handle account selection change
  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId)
    const account = cpfAccounts?.find((a) => a.id === accountId)
    if (account) {
      const age = computeAgeFromDob(account.dateOfBirth)
      setSimulatedAge(age)
      setBaseAge(age)
    }
  }

  // Derive CPFProfile from selected account or fall back to mock
  // Use projected balances when simulated age differs from base age
  const selectedAccount = cpfAccounts?.find((a) => a.id === selectedAccountId)
  const profile = useMemo(() => {
    if (selectedAccount) {
      const baseProfile = cpfAccountToProfile(selectedAccount, simulatedAge)

      // If we have projection data and the simulated age differs from base age,
      // use the projected balances for that age
      if (balanceProjection?.snapshots && simulatedAge !== baseAge) {
        const snapshot = balanceProjection.snapshots.find((s) => s.age === simulatedAge)
        if (snapshot) {
          return {
            ...baseProfile,
            balances: {
              oa: parseFloat(snapshot.oa) || 0,
              sa: parseFloat(snapshot.sa) || 0,
              ma: parseFloat(snapshot.ma) || 0,
              ra: parseFloat(snapshot.ra) || 0,
            },
          }
        }
      }

      return baseProfile
    }
    return { ...mockCPFProfile, age: simulatedAge }
  }, [selectedAccount, simulatedAge, baseAge, balanceProjection])

  // Check if we're using mock data
  const usingMockData = !selectedAccount

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
              <Wallet className="h-4 w-4 text-emerald-400" />
            </div>
            <h1 className="text-base font-semibold text-white">CPF Simulation</h1>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
            title="Close CPF Simulation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="border-b border-white/[0.06] px-5 py-2">
        <div className="flex items-center gap-4">
          {/* Person Selector */}
          {isLoadingAccounts ? (
            <div className="h-9 w-32 animate-pulse rounded-lg bg-white/[0.05]" />
          ) : cpfAccounts && cpfAccounts.length > 0 ? (
            <CustomDropdown
              value={selectedAccountId || ''}
              onChange={handleAccountChange}
              options={cpfAccounts.map((account) => ({
                value: account.id,
                label: formatAccountLabel(account),
              }))}
              showIcon
              icon={<User className="h-4 w-4" />}
              iconColor="text-slate-400"
              minWidth="120px"
            />
          ) : (
            <span className="text-sm font-medium text-amber-300">Demo Mode</span>
          )}

          {/* Age/Year Toggle + Input + Slider */}
          <div className="flex items-center gap-2">
            {/* Age/Year Toggle */}
            <div className="inline-flex rounded-lg bg-white/[0.03] p-0.5 border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setDisplayMode('age')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                  displayMode === 'age'
                    ? 'bg-white/[0.1] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Age
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('year')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                  displayMode === 'year'
                    ? 'bg-white/[0.1] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Year
              </button>
            </div>
            <input
              type="number"
              min={minValue}
              max={maxValue}
              value={displayValue}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                if (!isNaN(val)) {
                  // Clamp to valid range
                  const clampedVal = Math.max(minValue, Math.min(maxValue, val))
                  const newAge = displayMode === 'age' ? clampedVal : yearToAge(clampedVal)
                  setSimulatedAge(newAge)
                }
              }}
              onBlur={(e) => {
                // Ensure valid value on blur
                const val = parseInt(e.target.value)
                if (isNaN(val)) {
                  setSimulatedAge(baseAge)
                }
              }}
              className="w-14 bg-transparent text-sm font-medium text-white text-center focus:outline-none border-b border-white/20 focus:border-blue-400"
            />
            <span className="text-sm text-slate-400">{displayMode === 'age' ? 'y/o' : ''}</span>
            <input
              type="range"
              min={minValue}
              max={maxValue}
              step={1}
              value={displayValue}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                const newAge = displayMode === 'age' ? val : yearToAge(val)
                setSimulatedAge(newAge)
              }}
              className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-slate-700/60 accent-blue-500 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-400 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
            />
          </div>

          {/* Residency Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">🇸🇬</span>
            <span className="text-sm text-slate-300">{profile.residencyStatus.replace(/_/g, ' ')}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-white/[0.06] px-5">
        <div className="scrollbar-hide flex items-center gap-1 overflow-x-auto py-2">
          {/* Main tabs */}
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
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
          {/* Spacer */}
          <div className="flex-1" />
          {/* Learn tab on right */}
          <button
            onClick={() => handleTabChange(LEARN_TAB.id)}
            className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === LEARN_TAB.id
                ? 'bg-white/[0.08] text-white'
                : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            {LEARN_TAB.icon}
            <span>{LEARN_TAB.label}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Balance Overview with Pie Chart */}
            <CPFBalanceOverview profile={profile} />
            {/* Right: Contribution Flow (Sankey/Waterfall) */}
            <CPFContributionFlow profile={profile} />
          </div>
        )}

        {activeTab === 'projection' && <CPFProjectionChart profile={profile} />}

        {activeTab === 'strategies' && (
          <div className="space-y-4">
            {/* Strategy Selector Dropdown */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">Select strategy:</span>
              <CustomDropdown
                value={activeStrategy}
                onChange={(val) => setActiveStrategy(val as StrategyId)}
                options={STRATEGIES.map((strategy) => ({
                  value: strategy.id,
                  label: `${strategy.label} - ${strategy.description}`,
                }))}
                minWidth="280px"
              />
            </div>

            {/* Active Strategy Content */}
            {activeStrategy === 'contributions' && (
              <StrategyPlaceholder
                title="Regular Work Contributions"
                description="Building your CPF through employment contributions from you and your employer."
                points={[
                  'Employee contributes up to 20% of monthly wages',
                  'Employer contributes up to 17% of monthly wages',
                  'Contributions allocated to OA, SA, and MA based on age',
                  'Subject to CPF contribution caps (OW ceiling: $6,800/month)',
                ]}
              />
            )}
            {activeStrategy === 'self-employed' && (
              <StrategyPlaceholder
                title="Self-Employed Contributions"
                description="Contributing to your CPF as a self-employed person (SEP)."
                points={[
                  'Mandatory MediSave contributions based on net trade income',
                  'Optional voluntary contributions to OA and SA',
                  'Enjoy tax relief on contributions',
                  'Build retirement savings while self-employed',
                ]}
              />
            )}
            {activeStrategy === 'vc3a' && (
              <StrategyPlaceholder
                title="Voluntary Contributions (VC3A)"
                description="Make voluntary contributions to all three CPF accounts."
                points={[
                  'Contribute to OA, SA, and MA in standard allocation ratios',
                  'Enjoy tax relief up to CPF Annual Limit',
                  'Top up anytime through CPF website or app',
                  'Good for those with irregular income',
                ]}
              />
            )}
            {activeStrategy === 'medisave-topup' && (
              <StrategyPlaceholder
                title="MediSave Top-Up"
                description="Top up your MediSave Account only for healthcare needs."
                points={[
                  'Contribute directly to MediSave only',
                  'Enjoy tax relief on contributions',
                  'Useful for healthcare coverage and MediShield Life premiums',
                  'Subject to Basic Healthcare Sum (BHS) cap',
                ]}
              />
            )}
            {activeStrategy === 'rstu' && <TopUpTaxReliefCalculator profile={profile} />}
            {activeStrategy === 'transfers' && (
              <StrategyPlaceholder
                title="CPF Transfers"
                description="Transfer CPF savings between accounts or to family members."
                points={[
                  'Transfer from OA to SA for higher interest (up to FRS)',
                  'Top up family members\' SA or RA',
                  'Receive tax relief for topping up family members',
                  'Help parents/grandparents with retirement adequacy',
                ]}
              />
            )}
            {activeStrategy === 'housing-refund' && (
              <StrategyPlaceholder
                title="Voluntary Housing Refund"
                description="Voluntarily refund CPF used for housing back to your OA."
                points={[
                  'Refund principal + accrued interest to OA',
                  'Restore CPF savings for retirement',
                  'Useful when you have excess cash',
                  'Reduces future accrued interest obligations',
                ]}
              />
            )}
            {activeStrategy === 'cpfis' && (
              <CPFISInvestmentDashboard
                investments={mockCPFISInvestments}
                investibleBalance={mockInvestibleBalance}
                oaBalance={profile.balances.oa}
                saBalance={profile.balances.sa}
              />
            )}
          </div>
        )}

        {activeTab === 'property' && <CPFPropertyOverview />}

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
            {activeCalculator === 'retirement' && <Age55ConversionSimulator />}
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
                href={EXTERNAL_LINKS.cpf.home.url}
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
                href={EXTERNAL_LINKS.cpf.home.url}
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

      {/* Dev-only debug panel for CPF LIFE payout testing */}
      <CPFLifePayoutDebug />
    </div>
  )
}
