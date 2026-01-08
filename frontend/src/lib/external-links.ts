/**
 * External Links Registry
 *
 * Centralized registry of all external links used in the application.
 * This allows for:
 * 1. Regular validation that links are still active
 * 2. Easy updates when URLs change
 * 3. Consistent reference across the codebase
 *
 * Run link validation: `pnpm run validate-links` (if script exists)
 */

export interface ExternalLink {
  url: string
  title: string
  description: string
  lastVerified?: string // ISO date string
}

export interface ExternalLinksRegistry {
  cpf: {
    home: ExternalLink
    interestRates: ExternalLink
    extraInterest: ExternalLink
    retirementIncomePlanner: ExternalLink
    cpfLife: ExternalLink
    cpfLifeEstimator: ExternalLink
    detailedNotes: ExternalLink
  }
  government: {
    moh: ExternalLink
  }
}

export const EXTERNAL_LINKS: ExternalLinksRegistry = {
  cpf: {
    home: {
      url: 'https://www.cpf.gov.sg',
      title: 'CPF Board',
      description: 'Central Provident Fund Board official website',
    },
    interestRates: {
      url: 'https://www.cpf.gov.sg/member/growing-your-savings/earning-higher-returns/earning-attractive-interest',
      title: 'CPF Interest Rates',
      description: 'Official CPF interest rates and how they are calculated',
    },
    extraInterest: {
      url: 'https://www.cpf.gov.sg/service/article/how-much-extra-interest-can-i-earn-on-my-cpf-savings',
      title: 'CPF Extra Interest',
      description:
        'How much extra interest you can earn on CPF savings (first $60k, 55+ bonus)',
    },
    retirementIncomePlanner: {
      url: 'https://www.cpf.gov.sg/member/tools-and-services/calculators/cpf-retirement-estimator',
      title: 'CPF Retirement Estimator',
      description: 'Official CPF retirement income planning calculator',
    },
    cpfLife: {
      url: 'https://www.cpf.gov.sg/member/retirement-income/monthly-payouts/cpf-life',
      title: 'CPF LIFE',
      description: 'CPF Lifelong Income For the Elderly scheme details',
    },
    cpfLifeEstimator: {
      url: 'https://www.cpf.gov.sg/member/tools-and-services/calculators/cpf-life-estimator',
      title: 'CPF LIFE Estimator',
      description: 'Official CPF LIFE payout estimator tool',
    },
    detailedNotes: {
      url: 'https://www.cpf.gov.sg/member/tnc/detailed-notes-for-cpf-planner-retirement-income',
      title: 'CPF Planner Methodology',
      description:
        'Detailed notes on assumptions and methodology used in CPF retirement planning tools',
    },
  },
  government: {
    moh: {
      url: 'https://www.moh.gov.sg',
      title: 'Ministry of Health',
      description: 'Singapore Ministry of Health official website',
    },
  },
}

/**
 * Helper to get a formatted link for display
 */
export function getExternalLinkHref(
  category: keyof ExternalLinksRegistry,
  key: string
): string {
  const categoryLinks = EXTERNAL_LINKS[category] as Record<string, ExternalLink>
  return categoryLinks[key]?.url ?? '#'
}

/**
 * CPF Extra Interest Rules (as of 2025)
 *
 * Source: https://www.cpf.gov.sg/service/article/how-much-extra-interest-can-i-earn-on-my-cpf-savings
 *
 * For members below 55:
 * - Extra 1% p.a. on the first $60,000 of combined balances
 * - OA balance capped at $20,000 for this calculation
 *
 * For members 55 and above:
 * - Extra 2% p.a. on the first $30,000 of combined balances (OA capped at $20,000)
 * - Extra 1% p.a. on the next $30,000 of combined balances
 *
 * Order of combined balance calculation:
 * 1st: Retirement Account (RA), including CPF LIFE premium balance
 * 2nd: Ordinary Account (OA)
 * 3rd: Special Account (SA)
 * 4th: MediSave Account (MA)
 *
 * Extra interest on OA goes to SA (or RA if 55+)
 */
export const CPF_EXTRA_INTEREST_RULES = {
  below55: {
    extraInterestRate: 0.01, // 1%
    combinedBalanceCap: 60000,
    oaCap: 20000,
  },
  age55AndAbove: {
    first30k: {
      extraInterestRate: 0.02, // 2% total extra
      combinedBalanceCap: 30000,
      oaCap: 20000,
    },
    next30k: {
      extraInterestRate: 0.01, // 1% extra
      combinedBalanceCap: 30000, // $30k to $60k range
    },
  },
  sourceUrl: EXTERNAL_LINKS.cpf.extraInterest.url,
} as const
