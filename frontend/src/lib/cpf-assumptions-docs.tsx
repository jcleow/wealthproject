import { Percent, TrendingUp, Calendar, Zap } from 'lucide-react'

/**
 * Assumption documentation for the CPF info modal
 * Based on CPF official methodology
 */
export const ASSUMPTION_DOCS: {
  category: string
  icon: React.ReactNode
  items: { factor: string; defaultValue: string; description: string }[]
}[] = [
  {
    category: 'Interest Rates',
    icon: <Percent className="h-4 w-4 text-emerald-400" />,
    items: [
      {
        factor: 'OA Interest Rate',
        defaultValue: '2.5% p.a.',
        description:
          'Ordinary Account base rate. OA earns lower interest as funds can be used for housing/education.',
      },
      {
        factor: 'SA/RA/MA Interest Rate',
        defaultValue: '4.0% p.a.',
        description:
          'Special, Retirement, and MediSave accounts earn a floor rate of 4% as these are long-term retirement savings.',
      },
      {
        factor: 'Extra Interest (First $60k)',
        defaultValue: '+1.0%',
        description:
          'Additional interest on first $60,000 of combined balances (OA capped at $20k for this calculation).',
      },
      {
        factor: 'Extra Interest (55+, First $30k)',
        defaultValue: '+1.0%',
        description:
          "Members aged 55+ earn an additional 1% on their first $30,000 of combined balances.",
      },
    ],
  },
  {
    category: 'Growth Rates',
    icon: <TrendingUp className="h-4 w-4 text-amber-400" />,
    items: [
      {
        factor: 'Inflation Rate',
        defaultValue: '2.0%',
        description:
          'Applied to income goals to calculate future purchasing power. CPF uses 2% based on historical Singapore inflation.',
      },
      {
        factor: 'FRS Growth Rate',
        defaultValue: '3.5%',
        description:
          'Annual growth rate for Full/Basic/Enhanced Retirement Sums. Higher than inflation to account for rising living standards and life expectancy.',
      },
      {
        factor: 'Salary Growth Rate',
        defaultValue: '3.0%',
        description:
          'Assumed annual salary increment. CPF applies this at end of each December in projections.',
      },
      {
        factor: 'Escalating Plan Growth',
        defaultValue: '2.0%',
        description:
          'Annual payout increase for CPF LIFE Escalating Plan to help maintain purchasing power against inflation.',
      },
    ],
  },
  {
    category: 'CPF LIFE Payout Factors',
    icon: <Zap className="h-4 w-4 text-purple-400" />,
    items: [
      {
        factor: 'Standard Plan',
        defaultValue: '$5.50 per $1,000 RA (at 65)',
        description:
          'Highest monthly payout but lower bequest. Best for those prioritizing income over inheritance.',
      },
      {
        factor: 'Basic Plan',
        defaultValue: '$5.00 per $1,000 RA (at 65)',
        description:
          'Lower payout but higher bequest. 10-20% of RA reserved as premium, rest paid out until age 90.',
      },
      {
        factor: 'Escalating Plan',
        defaultValue: '$4.40 per $1,000 RA (at 65)',
        description:
          'Starts lowest but grows 2% yearly. Provides inflation protection for longer retirements.',
      },
      {
        factor: 'Deferral Bonus',
        defaultValue: '+7% per year (up to age 70)',
        description:
          'Delaying payout start increases monthly amount. Maximum +35% at age 70.',
      },
    ],
  },
  {
    category: 'Fixed Constants (2025)',
    icon: <Calendar className="h-4 w-4 text-blue-400" />,
    items: [
      {
        factor: 'Full Retirement Sum (FRS)',
        defaultValue: '$213,000',
        description:
          'Target savings for standard retirement income. Set by CPF Board annually.',
      },
      {
        factor: 'Basic Retirement Sum (BRS)',
        defaultValue: '$106,500',
        description:
          'Half of FRS. Allows property pledge to meet retirement requirements.',
      },
      {
        factor: 'Enhanced Retirement Sum (ERS)',
        defaultValue: '$426,000',
        description:
          '2x FRS (increased from 3x in 2025). Maximum amount for higher CPF LIFE payouts.',
      },
      {
        factor: 'Ordinary Wage Ceiling',
        defaultValue: '$7,400/month',
        description: 'Maximum monthly wage subject to CPF contributions.',
      },
    ],
  },
]
