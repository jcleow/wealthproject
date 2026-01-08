'use client'

import { useState } from 'react'
import {
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  Building2,
  Heart,
  Shield,
  Accessibility,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RiskLayer } from '@/types/insurance'
import { riskLayerConfig } from '@/types/insurance'

/**
 * OptionsTab - Replaces RecommendationsTab
 *
 * Key changes from original:
 * 1. REMOVED: "Est. monthly to close all gaps" pressure framing
 * 2. REMOVED: "Protection Score: 67% -> 94%" misleading metric
 * 3. REMOVED: Priority badges with rose/red colors
 * 4. REMOVED: "Add This Coverage" aggressive CTAs
 * 5. ADDED: Event-based rationale ("If you want protection beyond 6 months...")
 * 6. ADDED: Neutral "Options to consider" framing
 * 7. ADDED: Educational context without urgency
 */

interface CoverageOption {
  id: string
  riskLayer: RiskLayer
  optionName: string
  description: string
  typicalCost: { min: number; max: number; period: 'monthly' | 'annual' }
  whenToConsider: string[]
  tradeoffs: { pros: string[]; cons: string[] }
  learnMoreUrl?: string
}

// Mock options data - neutral framing, no urgency
const mockOptions: CoverageOption[] = [
  {
    id: '1',
    riskLayer: 'income_interruption',
    optionName: 'Early-Stage Critical Illness Plan',
    description:
      'Pays a lump sum at early diagnosis of specified conditions (e.g., early-stage cancer). Can be used for treatment, income replacement, or other needs.',
    typicalCost: { min: 45, max: 85, period: 'monthly' },
    whenToConsider: [
      'You want income protection beyond what CI riders provide',
      'Your current CI coverage only pays at advanced stages',
      'You have dependents who rely on your income',
    ],
    tradeoffs: {
      pros: [
        'Pays at early diagnosis when treatment is most effective',
        'Can be used for any purpose (not just medical)',
        'Premiums are typically lower than late-stage CI',
      ],
      cons: [
        'Coverage amounts are usually lower than late-stage CI',
        'Specific conditions covered vary by insurer',
        'Some plans have waiting periods after policy starts',
      ],
    },
    learnMoreUrl: 'https://www.moneysense.gov.sg/articles/2018/10/critical-illness-insurance',
  },
  {
    id: '2',
    riskLayer: 'death_dependency',
    optionName: 'Term Life Insurance',
    description:
      'Provides a death benefit to your beneficiaries if you pass away during the policy term. The most cost-effective way to provide financial protection for dependents.',
    typicalCost: { min: 25, max: 55, period: 'monthly' },
    whenToConsider: [
      'You have dependents who would face financial hardship without your income',
      'You have outstanding debts (mortgage, loans) that would burden your family',
      'You want coverage for a specific period (e.g., until children are adults)',
    ],
    tradeoffs: {
      pros: [
        'Most affordable form of life insurance',
        'High coverage amounts for low premiums',
        'Some policies are convertible to whole life',
      ],
      cons: [
        'No cash value - you pay for protection only',
        'Coverage ends when term expires',
        'Premiums increase at renewal (for renewable term)',
      ],
    },
    learnMoreUrl: 'https://www.moneysense.gov.sg/articles/2018/10/term-life-insurance',
  },
  {
    id: '3',
    riskLayer: 'permanent_disability',
    optionName: 'Disability Income Insurance',
    description:
      'Replaces a portion of your income if you become disabled and cannot work. Pays monthly benefits rather than a lump sum.',
    typicalCost: { min: 30, max: 60, period: 'monthly' },
    whenToConsider: [
      'Your income is your primary financial asset',
      'You don\'t have significant savings to sustain you during disability',
      'CareShield Life alone wouldn\'t cover your lifestyle needs',
    ],
    tradeoffs: {
      pros: [
        'Monthly payments match income replacement needs',
        'Some policies cover own-occupation disability',
        'Can supplement CareShield Life payouts',
      ],
      cons: [
        'Waiting period before benefits begin (30-90 days)',
        'Benefits typically cap at 60-75% of income',
        'Premiums can be higher for certain occupations',
      ],
    },
    learnMoreUrl: 'https://www.moneysense.gov.sg/articles/2018/10/disability-income-insurance',
  },
  {
    id: '4',
    riskLayer: 'medical_costs',
    optionName: 'Integrated Shield Plan Upgrade',
    description:
      'Upgrades your MediShield Life coverage to cover private hospital wards (A or B1). Includes higher claim limits and access to private specialists.',
    typicalCost: { min: 200, max: 600, period: 'annual' },
    whenToConsider: [
      'You prefer private hospital care over restructured hospitals',
      'You want shorter wait times for elective procedures',
      'You value choice of specialist and hospital',
    ],
    tradeoffs: {
      pros: [
        'Access to private wards with better amenities',
        'Shorter waiting times for treatment',
        'Choice of specialist doctors',
      ],
      cons: [
        'Higher premiums than MediShield Life alone',
        'Co-insurance and deductibles still apply',
        'Some plans have panel restrictions',
      ],
    },
    learnMoreUrl: 'https://www.moh.gov.sg/healthcare-schemes-subsidies/medishield-life/about-integrated-shield-plans',
  },
]

const layerIcons: Record<RiskLayer, typeof Heart> = {
  medical_costs: Building2,
  income_interruption: Heart,
  permanent_disability: Accessibility,
  death_dependency: Shield,
  old_age_care: HelpCircle,
}

export function OptionsTab() {
  const [expandedOption, setExpandedOption] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Header - neutral framing */}
      <div>
        <h2 className="text-xl font-semibold text-white">Coverage Options</h2>
        <p className="text-sm text-slate-400">
          Options to consider based on your scenario analysis
        </p>
      </div>

      {/* Educational intro - no pressure */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
        <div>
          <p className="text-sm text-slate-300">
            These options address areas where your scenario analysis showed potential
            exposure. There's no urgency - take time to understand each option and
            consult a licensed financial advisor before making decisions.
          </p>
        </div>
      </div>

      {/* Options list */}
      <div className="space-y-4">
        {mockOptions.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            isExpanded={expandedOption === option.id}
            onToggle={() =>
              setExpandedOption(expandedOption === option.id ? null : option.id)
            }
          />
        ))}
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
          Important Notes
        </h4>
        <ul className="space-y-2 text-xs text-slate-400">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
            Cost estimates are typical ranges for a 35-year-old non-smoker. Your actual
            premiums will vary based on age, health, and coverage amount.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
            This is educational information only, not financial advice. Consult a
            licensed financial advisor for personalized recommendations.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
            Compare multiple insurers before purchasing. Use{' '}
            <a
              href="https://www.comparefirst.sg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              CompareFirst
            </a>{' '}
            for direct plan comparisons.
          </li>
        </ul>
      </div>
    </div>
  )
}

function OptionCard({
  option,
  isExpanded,
  onToggle,
}: {
  option: CoverageOption
  isExpanded: boolean
  onToggle: () => void
}) {
  const layerConfig = riskLayerConfig[option.riskLayer]
  const LayerIcon = layerIcons[option.riskLayer]

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header - always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-white/[0.02]"
      >
        {/* Icon */}
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
            `bg-${layerConfig.color}-500/15`
          )}
        >
          <LayerIcon className={cn('h-6 w-6', `text-${layerConfig.color}-400`)} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white">{option.optionName}</h3>
            <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-xs text-slate-400">
              {layerConfig.shortLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400 line-clamp-2">
            {option.description}
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
            <span>
              Typical cost: ${option.typicalCost.min}-${option.typicalCost.max}/
              {option.typicalCost.period === 'monthly' ? 'mo' : 'yr'}
            </span>
          </div>
        </div>

        {/* Expand indicator */}
        <div className="shrink-0 pt-1 text-slate-500">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-white/[0.06] p-5 pt-4">
          {/* When to consider */}
          <div className="mb-4">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              When to Consider This
            </h4>
            <ul className="space-y-2">
              {option.whenToConsider.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-300"
                >
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Trade-offs */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-emerald-500/5 p-4">
              <h5 className="mb-2 text-xs font-medium uppercase tracking-wider text-emerald-400">
                Advantages
              </h5>
              <ul className="space-y-1.5">
                {option.tradeoffs.pros.map((pro, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-slate-300"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-slate-500/5 p-4">
              <h5 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                Considerations
              </h5>
              <ul className="space-y-1.5">
                {option.tradeoffs.cons.map((con, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-slate-400"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Learn more link */}
          {option.learnMoreUrl && (
            <div className="mt-4">
              <a
                href={option.learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
              >
                Learn more on MoneySense
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
