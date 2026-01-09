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
    medishieldLife: ExternalLink
    careshieldLife: ExternalLink
    eldershield: ExternalLink
    dps: ExternalLink
  }
  government: {
    moh: ExternalLink
    mohFeeBenchmarks: ExternalLink
    mohIntegratedShieldPlans: ExternalLink
  }
  insurance: {
    compareFirst: ExternalLink
    moneySenseCriticalIllness: ExternalLink
    moneySenseTermLife: ExternalLink
    moneySenseDisabilityIncome: ExternalLink
  }
  iras: {
    taxRates: ExternalLink
    earnedIncomeRelief: ExternalLink
    cpfTopUpRelief: ExternalLink
    srsRelief: ExternalLink
    lifeInsuranceRelief: ExternalLink
    courseFeesRelief: ExternalLink
    nsmanRelief: ExternalLink
    spouseRelief: ExternalLink
    childRelief: ExternalLink
    parentRelief: ExternalLink
    fdwlRelief: ExternalLink
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
    medishieldLife: {
      url: 'https://www.cpf.gov.sg/member/healthcare-financing/medishield-life',
      title: 'MediShield Life',
      description: 'Basic health insurance for all Singapore Citizens and PRs',
    },
    careshieldLife: {
      url: 'https://www.cpf.gov.sg/member/healthcare-financing/careshield-life',
      title: 'CareShield Life',
      description: 'Severe disability insurance for long-term care',
    },
    eldershield: {
      url: 'https://www.cpf.gov.sg/member/healthcare-financing/eldershield',
      title: 'ElderShield',
      description: 'Severe disability insurance (legacy scheme)',
    },
    dps: {
      url: 'https://www.cpf.gov.sg/member/account-services/providing-for-loved-ones/dps',
      title: 'Dependants\' Protection Scheme',
      description: 'Term life insurance for CPF members',
    },
  },
  government: {
    moh: {
      url: 'https://www.moh.gov.sg',
      title: 'Ministry of Health',
      description: 'Singapore Ministry of Health official website',
    },
    mohFeeBenchmarks: {
      url: 'https://www.moh.gov.sg/cost-financing/fee-benchmarks-and-bill-amount-information',
      title: 'MOH Fee Benchmarks',
      description: 'Hospital bill size and fee benchmark information',
    },
    mohIntegratedShieldPlans: {
      url: 'https://www.moh.gov.sg/healthcare-schemes-subsidies/medishield-life/about-integrated-shield-plans',
      title: 'Integrated Shield Plans',
      description: 'Information about ISPs that supplement MediShield Life',
    },
  },
  insurance: {
    compareFirst: {
      url: 'https://www.comparefirst.sg',
      title: 'CompareFIRST',
      description: 'MAS portal to compare insurance products',
    },
    moneySenseCriticalIllness: {
      url: 'https://www.moneysense.gov.sg/articles/2018/10/critical-illness-insurance',
      title: 'Critical Illness Insurance Guide',
      description: 'MoneySense guide on critical illness insurance',
    },
    moneySenseTermLife: {
      url: 'https://www.moneysense.gov.sg/articles/2018/10/term-life-insurance',
      title: 'Term Life Insurance Guide',
      description: 'MoneySense guide on term life insurance',
    },
    moneySenseDisabilityIncome: {
      url: 'https://www.moneysense.gov.sg/articles/2018/10/disability-income-insurance',
      title: 'Disability Income Insurance Guide',
      description: 'MoneySense guide on disability income insurance',
    },
  },
  iras: {
    taxRates: {
      url: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-residency-and-tax-rates/individual-income-tax-rates',
      title: 'Individual Income Tax Rates',
      description: 'Singapore resident tax rates and brackets',
    },
    earnedIncomeRelief: {
      url: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/earned-income-relief',
      title: 'Earned Income Relief',
      description: 'Tax relief for employment income',
    },
    cpfTopUpRelief: {
      url: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/cpf-cash-top-up-relief',
      title: 'CPF Cash Top-up Relief',
      description: 'Tax relief for voluntary CPF contributions',
    },
    srsRelief: {
      url: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/srs-relief',
      title: 'SRS Relief',
      description: 'Tax relief for Supplementary Retirement Scheme contributions',
    },
    lifeInsuranceRelief: {
      url: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/life-insurance-relief',
      title: 'Life Insurance Relief',
      description: 'Tax relief for life insurance premiums',
    },
    courseFeesRelief: {
      url: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/course-fees-relief',
      title: 'Course Fees Relief',
      description: 'Tax relief for approved courses and education',
    },
    nsmanRelief: {
      url: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/nsman-relief-(self-wife-and-parents)',
      title: 'NSman Relief',
      description: 'Tax relief for National Service obligations',
    },
    spouseRelief: {
      url: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/spouse-relief-handicapped-spouse-relief',
      title: 'Spouse Relief',
      description: 'Tax relief for supporting spouse',
    },
    childRelief: {
      url: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/qualifying-child-relief-(qcr)-handicapped-child-relief-(hcr)',
      title: 'Child Relief',
      description: 'Tax relief for qualifying and handicapped children',
    },
    parentRelief: {
      url: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/parent-relief-handicapped-parent-relief',
      title: 'Parent Relief',
      description: 'Tax relief for supporting parents',
    },
    fdwlRelief: {
      url: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/foreign-domestic-worker-levy-(fdwl)-relief',
      title: 'Foreign Domestic Worker Levy Relief',
      description: 'Tax relief for FDW levy paid',
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
