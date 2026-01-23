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
import { useTheme } from '@/lib/theme'

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
import { PropertyPlannerModal } from '@/components/modals/PropertyPlannerModal/PropertyPlannerModal'
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
import { useFeatureModulesStore } from '@/stores/featureModulesStore'

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
  const { theme, isMonet } = useTheme()

  return (
    <div
      className="rounded-xl p-6 transition-colors duration-300"
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
      }}
    >
      <h3
        className="text-lg font-semibold mb-2"
        style={{ color: theme.textPrimary }}
      >
        {title}
      </h3>
      <p className="text-sm mb-4" style={{ color: theme.textMuted }}>
        {description}
      </p>
      <div className="space-y-2">
        {points.map((point, index) => (
          <div key={index} className="flex items-start gap-2">
            <div
              className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ background: theme.sage }}
            />
            <span className="text-sm" style={{ color: theme.textSecondary }}>
              {point}
            </span>
          </div>
        ))}
      </div>
      <div
        className="mt-6 p-4 rounded-lg transition-colors duration-300"
        style={{
          background: isMonet ? `${theme.blue}15` : 'rgba(59, 130, 246, 0.1)',
          border: `1px solid ${isMonet ? `${theme.blue}30` : 'rgba(59, 130, 246, 0.2)'}`,
        }}
      >
        <p className="text-xs" style={{ color: theme.blue }}>
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
  const { theme, isMonet } = useTheme()
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  const [activeCalculator, setActiveCalculator] = useState<LearnCalculator>('journey')
  const [activeStrategy, setActiveStrategy] = useState<StrategyId>('contributions')

  // Property Planner modal state and actions
  const openPropertyPlanner = useFeatureModulesStore((state) => state.openPropertyPlanner)
  const closePropertyPlanner = useFeatureModulesStore((state) => state.closePropertyPlanner)
  const showPropertyPlanner = useFeatureModulesStore((state) => state.showPropertyPlanner)
  const propertyScenarioToEdit = useFeatureModulesStore((state) => state.propertyScenarioToEdit)

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
    <div
      className="flex h-full flex-col transition-colors duration-300"
      style={{
        background: isMonet ? theme.panelBg : 'transparent',
        fontFamily: theme.fontFamily,
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-3 transition-colors duration-300"
        style={{
          borderBottom: `1px solid ${theme.panelBorder}`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-300"
              style={{
                background: isMonet ? `${theme.sage}20` : 'rgba(16, 185, 129, 0.2)',
              }}
            >
              <Wallet className="h-4 w-4" style={{ color: theme.sage }} />
            </div>
            <h1
              className="text-base font-semibold transition-colors duration-300"
              style={{ color: theme.textPrimary }}
            >
              CPF Simulation
            </h1>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-300"
            style={{
              color: theme.textMuted,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.hoverBg
              e.currentTarget.style.color = theme.textPrimary
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = theme.textMuted
            }}
            title="Close CPF Simulation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div
        className="px-5 py-2 transition-colors duration-300"
        style={{
          borderBottom: `1px solid ${theme.panelBorder}`,
        }}
      >
        <div className="flex items-center gap-4">
          {/* Person Selector */}
          {isLoadingAccounts ? (
            <div
              className="h-9 w-32 animate-pulse rounded-lg"
              style={{ background: theme.surfaceBg }}
            />
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
              iconColor={isMonet ? 'text-[#6B6B6B]' : 'text-slate-400'}
              minWidth="120px"
            />
          ) : (
            <span
              className="text-sm font-medium"
              style={{ color: theme.amber }}
            >
              Demo Mode
            </span>
          )}

          {/* Age/Year Toggle + Input + Slider */}
          <div className="flex items-center gap-2">
            {/* Age/Year Toggle */}
            <div
              className="inline-flex rounded-lg p-0.5 transition-colors duration-300"
              style={{
                background: theme.controlBg,
                border: `1px solid ${theme.controlBorder}`,
              }}
            >
              <button
                type="button"
                onClick={() => setDisplayMode('age')}
                className="px-2 py-1 rounded-md text-xs font-medium transition-all duration-150"
                style={{
                  background: displayMode === 'age' ? theme.activeBg : 'transparent',
                  color: displayMode === 'age' ? theme.textPrimary : theme.textMuted,
                  boxShadow: displayMode === 'age' ? `0 1px 2px ${theme.shadowSoft}` : 'none',
                }}
              >
                Age
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('year')}
                className="px-2 py-1 rounded-md text-xs font-medium transition-all duration-150"
                style={{
                  background: displayMode === 'year' ? theme.activeBg : 'transparent',
                  color: displayMode === 'year' ? theme.textPrimary : theme.textMuted,
                  boxShadow: displayMode === 'year' ? `0 1px 2px ${theme.shadowSoft}` : 'none',
                }}
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
              className="w-14 bg-transparent text-sm font-medium text-center focus:outline-none transition-colors duration-300"
              style={{
                color: theme.textPrimary,
                borderBottom: `1px solid ${theme.inputBorder}`,
              }}
            />
            <span className="text-sm" style={{ color: theme.textMuted }}>
              {displayMode === 'age' ? 'y/o' : ''}
            </span>
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
              className="h-1 w-48 cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
              style={{
                background: isMonet ? 'rgba(155, 139, 180, 0.3)' : 'rgba(100, 116, 139, 0.6)',
                accentColor: theme.blue,
              }}
            />
          </div>

          {/* Residency Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: theme.textMuted }}>🇸🇬</span>
            <span className="text-sm" style={{ color: theme.textSecondary }}>
              {profile.residencyStatus.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        className="px-5 transition-colors duration-300"
        style={{
          borderBottom: `1px solid ${theme.panelBorder}`,
        }}
      >
        <div className="scrollbar-hide flex items-center gap-1 overflow-x-auto py-2">
          {/* Main tabs */}
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className="flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200"
                style={{
                  background: isActive ? theme.activeBg : 'transparent',
                  color: isActive ? theme.textPrimary : theme.textMuted,
                  boxShadow: isActive && isMonet ? `0 2px 8px ${theme.shadowSoft}` : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = theme.hoverBg
                    e.currentTarget.style.color = theme.textPrimary
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = theme.textMuted
                  }
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            )
          })}
          {/* Spacer */}
          <div className="flex-1" />
          {/* Learn tab on right */}
          {(() => {
            const isActive = activeTab === LEARN_TAB.id
            return (
              <button
                onClick={() => handleTabChange(LEARN_TAB.id)}
                className="flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200"
                style={{
                  background: isActive ? theme.activeBg : 'transparent',
                  color: isActive ? theme.textPrimary : theme.textMuted,
                  boxShadow: isActive && isMonet ? `0 2px 8px ${theme.shadowSoft}` : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = theme.hoverBg
                    e.currentTarget.style.color = theme.textPrimary
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = theme.textMuted
                  }
                }}
              >
                {LEARN_TAB.icon}
                <span>{LEARN_TAB.label}</span>
              </button>
            )
          })()}
        </div>
      </div>

      {/* Content */}
      {/* TODO(human): Add max-width constraint to prevent content from stretching too wide on large screens */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Balance Overview with Pie Chart */}
            <CPFBalanceOverview profile={profile} />
            {/* Right: Contribution Flow (Sankey/Waterfall) */}
            <CPFContributionFlow profile={profile} />
          </div>
        )}

        {activeTab === 'projection' && (
          <CPFProjectionChart
            profile={profile}
            selectedAge={simulatedAge}
            onAgeChange={setSimulatedAge}
          />
        )}

        {activeTab === 'strategies' && (
          <div className="space-y-4">
            {/* Strategy Selector Dropdown */}
            <div className="flex items-center gap-3">
              <span className="text-sm" style={{ color: theme.textMuted }}>Select strategy:</span>
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

        {activeTab === 'property' && <CPFPropertyOverview onOpenPropertyPlanner={openPropertyPlanner} />}

        {activeTab === 'learn' && (
          <div className="space-y-4">
            {/* Calculator Selector */}
            <div className="flex flex-wrap gap-2">
              {LEARN_CALCULATORS.map((calc) => {
                const isActive = activeCalculator === calc.id
                return (
                  <button
                    key={calc.id}
                    onClick={() => setActiveCalculator(calc.id)}
                    className="rounded-lg px-3 py-2 text-sm transition-all duration-200"
                    style={{
                      background: isActive
                        ? isMonet ? `${theme.sage}20` : 'rgba(16, 185, 129, 0.2)'
                        : theme.cardBg,
                      color: isActive ? theme.sage : theme.textMuted,
                      border: `1px solid ${isActive
                        ? isMonet ? `${theme.sage}40` : 'rgba(16, 185, 129, 0.3)'
                        : theme.cardBorder}`,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = theme.cardBgHover
                        e.currentTarget.style.color = theme.textPrimary
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = theme.cardBg
                        e.currentTarget.style.color = theme.textMuted
                      }
                    }}
                  >
                    <div className="font-medium">{calc.label}</div>
                    <div className="text-xs opacity-70">{calc.description}</div>
                  </button>
                )
              })}
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
      <div
        className="px-5 py-3 transition-colors duration-300"
        style={{
          borderTop: `1px solid ${theme.panelBorder}`,
        }}
      >
        <p className="text-center text-xs" style={{ color: theme.textMuted }}>
          {usingMockData ? (
            <>
              Demo data for illustration. Verify calculations with{' '}
              <a
                href={EXTERNAL_LINKS.cpf.home.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                style={{ color: theme.blue }}
              >
                cpf.gov.sg
              </a>
            </>
          ) : (
            <>
            Always verify with{' '}
              <a
                href={EXTERNAL_LINKS.cpf.home.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                style={{ color: theme.blue }}
              >
                cpf.gov.sg
              </a>
            </>
          )}
        </p>
      </div>

      {/* Dev-only debug panel for CPF LIFE payout testing */}
      <CPFLifePayoutDebug />

      {/* Property Planner Modal - rendered here for routed CPF pages */}
      <PropertyPlannerModal
        isOpen={showPropertyPlanner}
        onClose={closePropertyPlanner}
        initialScenarioId={propertyScenarioToEdit ?? undefined}
      />
    </div>
  )
}
