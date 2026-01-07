import { GraduationCap, Users, Baby, Home, Flame, Sparkles } from 'lucide-react'
import { PERSON_COLORS } from '@/types/person'
import type { FinancialProfile } from './types'

/**
 * Singapore-specific financial profile templates
 * Each profile represents a common life stage with realistic financial data
 */
export const FINANCIAL_PROFILES: FinancialProfile[] = [
  {
    id: 'single-early-career',
    name: 'Fresh Graduate',
    tagline: 'Starting your career journey',
    description: '25-year-old fresh graduate building wealth from scratch. Renting a room, paying off study loan, and learning to save.',
    icon: GraduationCap,
    gradient: {
      from: '#3b82f6', // blue-500
      to: '#06b6d4', // cyan-500
    },
    persons: [
      {
        name: 'You',
        age: 25,
        displayColor: PERSON_COLORS[0],
        residencyStatus: 'citizen',
        cpfBalances: { oa: 15000, sa: 8000, ma: 5000 },
        income: {
          name: 'Junior Role Salary',
          amount: 4500,
          growthRate: 5.0,
          cpfWageType: 'ow',
        },
      },
    ],
  },
  {
    id: 'dink',
    name: 'DINK Couple',
    tagline: 'Dual income, enjoying life',
    description: 'Married couple in their early 30s, both working, no kids. Planning for BTO and building joint savings.',
    icon: Users,
    gradient: {
      from: '#10b981', // emerald-500
      to: '#14b8a6', // teal-500
    },
    persons: [
      {
        name: 'Partner 1',
        age: 30,
        displayColor: PERSON_COLORS[0],
        residencyStatus: 'citizen',
        cpfBalances: { oa: 70000, sa: 35000, ma: 25000 },
        income: {
          name: 'Software Engineer Salary',
          amount: 6500,
          growthRate: 4.0,
          cpfWageType: 'ow',
        },
      },
      {
        name: 'Partner 2',
        age: 28,
        displayColor: PERSON_COLORS[1],
        residencyStatus: 'citizen',
        cpfBalances: { oa: 50000, sa: 28000, ma: 20000 },
        income: {
          name: 'Finance Role Salary',
          amount: 5500,
          growthRate: 4.0,
          cpfWageType: 'ow',
        },
      },
    ],
  },
  {
    id: 'dink-kids-planned',
    name: 'Young Family',
    tagline: 'Planning for children soon',
    description: 'Married couple planning wedding, BTO, and first child. Balancing current expenses with future family goals.',
    icon: Baby,
    gradient: {
      from: '#f43f5e', // rose-500
      via: '#f59e0b', // amber-500
      to: '#ec4899', // pink-500
    },
    persons: [
      {
        name: 'Alex',
        age: 32,
        displayColor: PERSON_COLORS[0],
        residencyStatus: 'citizen',
        cpfBalances: { oa: 85000, sa: 45000, ma: 32000 },
        income: {
          name: 'Software Engineer Salary',
          amount: 7500,
          growthRate: 4.0,
          cpfWageType: 'ow',
        },
      },
      {
        name: 'Sarah',
        age: 31,
        displayColor: PERSON_COLORS[1],
        residencyStatus: 'citizen',
        cpfBalances: { oa: 65000, sa: 35000, ma: 25000 },
        income: {
          name: 'Marketing Manager Salary',
          amount: 5000,
          growthRate: 3.5,
          cpfWageType: 'ow',
        },
      },
    ],
  },
  {
    id: 'single-income-family',
    name: 'Single Income Family',
    tagline: 'One works, one nurtures',
    description: 'Family with one working parent and one stay-at-home parent. Managing household on single income with 2 kids.',
    icon: Home,
    gradient: {
      from: '#8b5cf6', // violet-500
      to: '#6366f1', // indigo-500
    },
    persons: [
      {
        name: 'Working Parent',
        age: 35,
        displayColor: PERSON_COLORS[0],
        residencyStatus: 'citizen',
        cpfBalances: { oa: 95000, sa: 55000, ma: 40000 },
        income: {
          name: 'Senior Manager Salary',
          amount: 8500,
          growthRate: 3.5,
          cpfWageType: 'ow',
        },
      },
      {
        name: 'Stay-home Parent',
        age: 33,
        displayColor: PERSON_COLORS[1],
        residencyStatus: 'citizen',
        cpfBalances: { oa: 40000, sa: 25000, ma: 18000 },
        // No income - stay-at-home parent
      },
    ],
  },
  {
    id: 'fire-focused',
    name: 'FIRE Pursuer',
    tagline: 'Retire early by 45',
    description: 'High-income professional aggressively saving 50%+ of income. On track for financial independence and early retirement.',
    icon: Flame,
    gradient: {
      from: '#f59e0b', // amber-500
      to: '#f97316', // orange-500
    },
    persons: [
      {
        name: 'You',
        age: 35,
        displayColor: PERSON_COLORS[0],
        residencyStatus: 'citizen',
        cpfBalances: { oa: 150000, sa: 80000, ma: 50000 },
        income: {
          name: 'Tech Lead Salary',
          amount: 12000,
          growthRate: 5.0,
          cpfWageType: 'ow',
        },
      },
    ],
  },
  {
    id: 'blank-slate',
    name: 'Start Fresh',
    tagline: 'Build your own plan',
    description: 'Empty profile - add your own financial data from scratch. Perfect for those who want complete control.',
    icon: Sparkles,
    gradient: {
      from: '#64748b', // slate-500
      to: '#475569', // slate-600
    },
    persons: [],
  },
]

/**
 * Get a profile by ID
 */
export function getProfileById(id: string): FinancialProfile | undefined {
  return FINANCIAL_PROFILES.find((p) => p.id === id)
}
