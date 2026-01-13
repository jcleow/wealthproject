/**
 * Profile Data Generators
 *
 * Each generator function returns the raw data needed to create a complete
 * financial profile. The mutation hook handles the API calls.
 */

import type { Income, Expense } from '@/types/financial'
import type { CPFAccountCreatePayload } from '@/types/cpf'
import type { ScenarioEvent } from '@/types/scenario'
import type { CreateScenarioInput } from '@/types/propertyPlannerV2'
import { PERSON_COLORS } from '@/types/person'
import { DEFAULT_MONTHLY_CADENCE } from '@/types/scenario'

// Fixed base date for sample data (January 2026)
const SAMPLE_DATA_BASE_DATE = new Date('2026-01-01T00:00:00.000Z')

// Helper to generate YYYY-MM format date strings
function getMonthString(yearsFromNow: number, monthOffset = 0): string {
  const date = new Date(SAMPLE_DATA_BASE_DATE)
  date.setFullYear(date.getFullYear() + yearsFromNow)
  date.setMonth(date.getMonth() + monthOffset)
  return date.toISOString().slice(0, 7)
}

// Helper to calculate date of birth from age
function getDateOfBirth(age: number): string {
  const baseYear = SAMPLE_DATA_BASE_DATE.getFullYear()
  return `${baseYear - age}-01-01`
}

const todayIso = SAMPLE_DATA_BASE_DATE.toISOString()

/**
 * Person configuration for creating via API
 */
export interface PersonCreateConfig {
  name: string
  displayColor: string
  dateOfBirth: string
  gender: 'male' | 'female'
  residencyStatus: 'citizen' | 'pr'
}

/**
 * Asset/Investment configuration
 */
export interface AssetConfig {
  name: string
  category: string
  currentValue: number
  annualGrowthRate: number
  startDate: string
  notes?: string
}

/**
 * Liability configuration
 */
export interface LiabilityConfig {
  name: string
  category: string
  currentBalance: number
  interestRateApr: number
  minimumPayment: number
  startDate: string
  notes?: string
}

/**
 * Cash account configuration
 */
export interface CashAccountConfig {
  name: string
  balance: number
  interestRate: number
  bankName: string
  accountType: 'savings' | 'checking' | 'fixed_deposit'
  isAccumulator: boolean
  notes?: string
}

/**
 * Complete profile data returned by generators
 */
export interface ProfileData {
  persons: PersonCreateConfig[]
  cpfAccounts: Array<CPFAccountCreatePayload & { personIndex: number }>
  cashAccounts: CashAccountConfig[]
  assets: AssetConfig[]
  investments: AssetConfig[]
  liabilities: LiabilityConfig[]
  incomes: Array<Omit<Income, 'id' | 'updatedAt'> & { personIndex: number }>
  expenses: Array<Omit<Expense, 'id' | 'updatedAt'>>
  scenarioEvents: Array<Omit<ScenarioEvent, 'id'>>
  propertyScenario?: Omit<CreateScenarioInput, 'propertySG'> & {
    propertySG: CreateScenarioInput['propertySG'] & {
      borrower1PersonIndex?: number
      borrower2PersonIndex?: number
    }
  }
  incomeAllocations?: Array<{
    incomeIndex: number
    investmentIndex: number
    allocationType: 'fixed' | 'percentage'
    allocationValue: string
  }>
}

// ============================================================================
// PROFILE: Single Early Career (Fresh Graduate)
// ============================================================================
export function generateSingleEarlyCareerProfile(): ProfileData {
  return {
    persons: [
      {
        name: 'You',
        displayColor: PERSON_COLORS[0],
        dateOfBirth: getDateOfBirth(25),
        gender: 'male',
        residencyStatus: 'citizen',
      },
    ],
    cpfAccounts: [
      {
        personIndex: 0,
        personId: '', // Will be filled by mutation
        oaBalance: 15000,
        saBalance: 8000,
        maBalance: 5000,
        raBalance: 0,
        oaUsedForHousing: 0,
      },
    ],
    cashAccounts: [
      {
        name: 'Savings Account',
        balance: 8000,
        interestRate: 2.0,
        bankName: 'DBS',
        accountType: 'savings',
        isAccumulator: true,
        notes: 'Main savings account for emergency fund',
      },
    ],
    assets: [
      {
        name: 'Emergency Fund',
        category: 'cash_savings',
        currentValue: 5000,
        annualGrowthRate: 2.0,
        startDate: todayIso,
        notes: '2-3 months expenses, building up',
      },
    ],
    investments: [
      {
        name: 'Syfe Cash+ Account',
        category: 'Investment',
        currentValue: 3000,
        annualGrowthRate: 3.5,
        startDate: todayIso,
        notes: 'Low-risk starting investment, learning the ropes',
      },
    ],
    liabilities: [
      {
        name: 'Study Loan (NUS/NTU)',
        category: 'Loan',
        currentBalance: 15000,
        interestRateApr: 4.5,
        minimumPayment: 350,
        startDate: todayIso,
        notes: 'Tuition fee loan, ~4 years remaining',
      },
    ],
    incomes: [
      {
        personIndex: 0,
        personId: null,
        name: 'Junior Role Salary',
        category: 'Employment',
        amount: 4500,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 5.0,
        cpfWageType: 'ow',
        notes: 'Entry-level position, good growth potential',
      },
    ],
    expenses: [
      {
        name: 'Room Rental',
        category: 'Housing',
        amount: 1000,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 3.0,
        notes: 'Common room in HDB near MRT',
      },
      {
        name: 'Parents Allowance',
        category: 'Family',
        amount: 300,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'Monthly contribution to parents',
      },
      {
        name: 'Food & Groceries',
        category: 'Food',
        amount: 500,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 3.0,
        notes: 'Hawker centers and home cooking',
      },
      {
        name: 'Transport',
        category: 'Transport',
        amount: 120,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'MRT and bus concession',
      },
      {
        name: 'Mobile & Subscriptions',
        category: 'Bills',
        amount: 60,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 0,
        notes: 'Phone plan + streaming services',
      },
      {
        name: 'Social & Entertainment',
        category: 'Personal',
        amount: 200,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'Outings with friends, hobbies',
      },
    ],
    scenarioEvents: [
      {
        name: 'Pay Off Study Loan',
        description: 'Cleared study loan early with bonus and savings!',
        occursOn: getMonthString(3),
        displayIcon: 'check-circle',
        displayColor: '#10b981',
        tags: ['milestone', 'debt-free'],
        isIncluded: true,
        impacts: [],
      },
      {
        name: 'First Promotion',
        description: 'Promoted to mid-level role with salary increase.',
        occursOn: getMonthString(2),
        displayIcon: 'trending-up',
        displayColor: '#3b82f6',
        tags: ['career', 'income'],
        isIncluded: true,
        impacts: [
          {
            targetType: 'income',
            impactKind: 'delta',
            amount: 1000,
            currency: 'SGD',
            cadence: 'monthly',
            startMonth: getMonthString(2),
            notes: 'Promotion bump: $4,500 → $5,500',
          },
        ],
      },
    ],
    incomeAllocations: [
      {
        incomeIndex: 0,
        investmentIndex: 0,
        allocationType: 'fixed',
        allocationValue: '200',
      },
    ],
  }
}

// ============================================================================
// PROFILE: DINK (Dual Income No Kids)
// ============================================================================
export function generateDinkProfile(): ProfileData {
  return {
    persons: [
      {
        name: 'Partner 1',
        displayColor: PERSON_COLORS[0],
        dateOfBirth: getDateOfBirth(30),
        gender: 'male',
        residencyStatus: 'citizen',
      },
      {
        name: 'Partner 2',
        displayColor: PERSON_COLORS[1],
        dateOfBirth: getDateOfBirth(28),
        gender: 'female',
        residencyStatus: 'citizen',
      },
    ],
    cpfAccounts: [
      {
        personIndex: 0,
        personId: '',
        oaBalance: 70000,
        saBalance: 35000,
        maBalance: 25000,
        raBalance: 0,
        oaUsedForHousing: 0,
      },
      {
        personIndex: 1,
        personId: '',
        oaBalance: 50000,
        saBalance: 28000,
        maBalance: 20000,
        raBalance: 0,
        oaUsedForHousing: 0,
      },
    ],
    cashAccounts: [
      {
        name: 'Joint Savings',
        balance: 80000,
        interestRate: 2.5,
        bankName: 'DBS',
        accountType: 'savings',
        isAccumulator: true,
        notes: 'Shared savings for BTO and investments',
      },
    ],
    assets: [
      {
        name: 'Emergency Fund',
        category: 'cash_savings',
        currentValue: 25000,
        annualGrowthRate: 2.0,
        startDate: todayIso,
        notes: '6 months combined expenses',
      },
    ],
    investments: [
      {
        name: 'Joint Investment Portfolio',
        category: 'Investment',
        currentValue: 40000,
        annualGrowthRate: 6.0,
        startDate: todayIso,
        notes: 'Robo-advisor with regular DCA',
      },
      {
        name: 'Singapore Savings Bonds',
        category: 'Investment',
        currentValue: 15000,
        annualGrowthRate: 3.0,
        startDate: todayIso,
        notes: 'Safe haven allocation',
      },
    ],
    liabilities: [],
    incomes: [
      {
        personIndex: 0,
        personId: null,
        name: 'Software Engineer Salary',
        category: 'Employment',
        amount: 6500,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 4.0,
        cpfWageType: 'ow',
        notes: 'Mid-level tech role',
      },
      {
        personIndex: 1,
        personId: null,
        name: 'Finance Analyst Salary',
        category: 'Employment',
        amount: 5500,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 4.0,
        cpfWageType: 'ow',
        notes: 'Banking sector role',
      },
    ],
    expenses: [
      {
        name: 'Rental (Whole Unit)',
        category: 'Housing',
        amount: 2800,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 3.0,
        notes: '2-bedroom condo near CBD',
      },
      {
        name: 'Parents Allowance',
        category: 'Family',
        amount: 800,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'Combined allowance for both sets of parents',
      },
      {
        name: 'Food & Dining',
        category: 'Food',
        amount: 1200,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 3.0,
        notes: 'Mix of cooking and eating out',
      },
      {
        name: 'Transport',
        category: 'Transport',
        amount: 300,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'MRT + occasional Grab',
      },
      {
        name: 'Utilities & Bills',
        category: 'Bills',
        amount: 200,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 3.0,
        notes: 'Electricity, water, internet, phones',
      },
      {
        name: 'Travel Fund',
        category: 'Travel',
        amount: 6000,
        frequency: 'annual',
        startDate: todayIso,
        growthRate: 3.0,
        notes: '2-3 trips per year',
      },
      {
        name: 'Entertainment & Lifestyle',
        category: 'Personal',
        amount: 500,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'Gym, hobbies, shopping',
      },
    ],
    scenarioEvents: [
      {
        name: 'BTO Key Collection',
        description: 'Collecting keys for our 4-room BTO in Tengah!',
        occursOn: getMonthString(3),
        displayIcon: 'home',
        displayColor: '#3b82f6',
        tags: ['milestone', 'property'],
        isIncluded: true,
        impacts: [
          {
            targetType: 'expense',
            impactKind: 'start',
            amount: 50000,
            currency: 'SGD',
            cadence: DEFAULT_MONTHLY_CADENCE,
            startMonth: getMonthString(3),
            frequency: 'one_time',
            name: 'Renovation & Furnishing',
          },
        ],
      },
      {
        name: 'Career Milestone',
        description: 'Both promoted to senior roles.',
        occursOn: getMonthString(2),
        displayIcon: 'trending-up',
        displayColor: '#10b981',
        tags: ['career'],
        isIncluded: true,
        impacts: [
          {
            targetType: 'income',
            impactKind: 'delta',
            amount: 2500,
            currency: 'SGD',
            cadence: 'monthly',
            startMonth: getMonthString(2),
            notes: 'Combined promotion increase',
          },
        ],
      },
    ],
    propertyScenario: {
      country: 'SG',
      propertySG: {
        name: 'BTO Flat (Tengah)',
        propertyType: 'hdb',
        propertySubtype: 'bto',
        purchaseIcon: 'home',
        purchaseIconColor: '#3b82f6',
        saleIcon: 'banknote',
        saleIconColor: '#10b981',
        // Sale date: 10 years after key collection (MOP is 5 years, typical holding ~10 years)
        saleExpectedDate: getMonthString(13), // 3 years (key collection) + 10 years holding = 13 years from now
        // Expected sale price: ~34% appreciation over 10 years at 3% annual growth
        saleExpectedPrice: Math.round(400000 * Math.pow(1.03, 10)).toString(), // ~$537,567
        isIncluded: true,
        propertyPrice: '400000',
        loanType: 'hdb',
        downpaymentCpfOa: '80000',
        downpaymentCash: '20000',
        borrowerType: 'joint',
        borrower1PersonIndex: 0,
        borrower2PersonIndex: 1,
        borrower1DownpaymentCpfOaAmountType: 'fixed',
        borrower1DownpaymentCpfOa: '45000',
        borrower2DownpaymentCpfOaAmountType: 'fixed',
        borrower2DownpaymentCpfOa: '35000',
        borrower1MonthlyCpfOa: '1380',
        borrower2MonthlyCpfOa: '1170',
        borrower1DownpaymentCashAmountType: 'remainder',
        borrower1DownpaymentCashAmount: '20000',
        borrower2DownpaymentCashAmountType: 'remainder',
        borrower2DownpaymentCashAmount: '0',
        borrower1MonthlyCashAmountType: 'remainder',
        borrower1MonthlyCashAmount: '0',
        borrower2MonthlyCashAmountType: 'remainder',
        borrower2MonthlyCashAmount: '0',
        otherDebt: '0',
        propertyCount: 0,
        btoKeyCollectionDate: getMonthString(3),
      },
      ratePeriods: [
        {
          startMonth: getMonthString(3),
          termYears: 25,
          rate: '2.6',
          rateType: 'fixed' as const,
        },
      ],
      growthPeriods: [
        {
          startYear: 0,
          growthRate: '3.0',
          growthStrategy: 'compound_monthly',
        },
      ],
      fees: [
        // Purchase fees
        {
          feeContext: 'purchase',
          feeType: 'renovation',
          description: 'BTO renovation',
          amount: '50000',
          isPercentage: false,
          frequency: 'one_time',
          startDate: getMonthString(3),
          endDate: getMonthString(3),
        },
        // Sale fees (at sale date: 13 years from now)
        {
          feeContext: 'sale',
          feeType: 'agent_commission',
          description: 'Property agent commission (2%)',
          amount: '2',
          isPercentage: true,
          frequency: 'one_time',
          startDate: getMonthString(13),
          endDate: getMonthString(13),
        },
        {
          feeContext: 'sale',
          feeType: 'legal_conveyancing',
          description: 'Legal & conveyancing fees',
          amount: '3000',
          isPercentage: false,
          frequency: 'one_time',
          startDate: getMonthString(13),
          endDate: getMonthString(13),
        },
        {
          feeContext: 'sale',
          feeType: 'mortgage_discharge',
          description: 'Mortgage discharge fee',
          amount: '500',
          isPercentage: false,
          frequency: 'one_time',
          startDate: getMonthString(13),
          endDate: getMonthString(13),
        },
      ],
    },
    incomeAllocations: [
      {
        incomeIndex: 0,
        investmentIndex: 0,
        allocationType: 'fixed',
        allocationValue: '500',
      },
      {
        incomeIndex: 1,
        investmentIndex: 0,
        allocationType: 'fixed',
        allocationValue: '400',
      },
    ],
  }
}

// ============================================================================
// PROFILE: DINK with Kids Planned (Alex & Sarah - existing profile)
// ============================================================================
export function generateDinkKidsPlannedProfile(): ProfileData {
  return {
    persons: [
      {
        name: 'Alex',
        displayColor: PERSON_COLORS[0],
        dateOfBirth: '1993-01-01',
        gender: 'male',
        residencyStatus: 'citizen',
      },
      {
        name: 'Sarah',
        displayColor: PERSON_COLORS[1],
        dateOfBirth: '1994-06-15',
        gender: 'female',
        residencyStatus: 'citizen',
      },
    ],
    cpfAccounts: [
      {
        personIndex: 0,
        personId: '',
        oaBalance: 85000,
        saBalance: 45000,
        maBalance: 32000,
        raBalance: 0,
        oaUsedForHousing: 0,
      },
      {
        personIndex: 1,
        personId: '',
        oaBalance: 65000,
        saBalance: 35000,
        maBalance: 25000,
        raBalance: 0,
        oaUsedForHousing: 0,
      },
    ],
    cashAccounts: [
      {
        name: 'Joint Savings Account',
        balance: 50000,
        interestRate: 2.5,
        bankName: 'DBS',
        accountType: 'savings',
        isAccumulator: true,
        notes: 'Joint savings for BTO downpayment and monthly mortgage payments',
      },
    ],
    assets: [
      {
        name: 'DBS Multiplier Account',
        category: 'cash_savings',
        currentValue: 25000,
        annualGrowthRate: 2.5,
        startDate: todayIso,
        notes: 'Main savings account with salary crediting',
      },
      {
        name: 'Emergency Fund',
        category: 'cash_savings',
        currentValue: 18000,
        annualGrowthRate: 2.0,
        startDate: todayIso,
        notes: '6 months expenses in high-yield savings',
      },
    ],
    investments: [
      {
        name: 'Syfe Core Growth Portfolio',
        category: 'Investment',
        currentValue: 35000,
        annualGrowthRate: 6.0,
        startDate: todayIso,
        notes: 'Global ETF robo-advisor, monthly DCA $500',
      },
      {
        name: 'Singapore Savings Bonds',
        category: 'Investment',
        currentValue: 20000,
        annualGrowthRate: 3.0,
        startDate: todayIso,
        notes: 'Safe haven, 10-year average yield',
      },
    ],
    liabilities: [
      {
        name: 'Study Loan (NUS)',
        category: 'Loan',
        currentBalance: 8000,
        interestRateApr: 4.5,
        minimumPayment: 250,
        startDate: todayIso,
        notes: 'Remaining balance from university, 3 years left',
      },
      {
        name: 'Credit Card',
        category: 'Credit Card',
        currentBalance: 800,
        interestRateApr: 26,
        minimumPayment: 50,
        startDate: todayIso,
        notes: 'Paid in full monthly, revolving for cashback',
      },
    ],
    incomes: [
      {
        personIndex: 0,
        personId: null,
        name: 'Software Engineer Salary',
        category: 'Employment',
        amount: 7500,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 4.0,
        cpfWageType: 'ow',
        notes: 'Mid-senior role at tech company, 10 years experience',
      },
      {
        personIndex: 1,
        personId: null,
        name: 'Marketing Manager Salary',
        category: 'Employment',
        amount: 5000,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 3.5,
        cpfWageType: 'ow',
        notes: 'Spouse income - marketing role at agency',
      },
    ],
    expenses: [
      {
        name: 'Parents Allowance',
        category: 'Family',
        amount: 500,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'Monthly contribution to parents',
      },
      {
        name: 'Rent (Room)',
        category: 'Housing',
        amount: 1200,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 3.0,
        notes: 'Master bedroom in shared HDB, Toa Payoh',
      },
      {
        name: 'Groceries & Hawker',
        category: 'Food',
        amount: 600,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 3.0,
        notes: 'Mix of cooking and hawker center meals',
      },
      {
        name: 'Dining & Social',
        category: 'Food',
        amount: 400,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'Restaurants, dates, gatherings with friends',
      },
      {
        name: 'Public Transport',
        category: 'Transport',
        amount: 120,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'MRT and bus, monthly concession',
      },
      {
        name: 'Grab/Taxi',
        category: 'Transport',
        amount: 100,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 3.0,
        notes: 'Late nights and rainy days',
      },
      {
        name: 'Mobile Plan',
        category: 'Bills',
        amount: 45,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 0,
        notes: 'Circles.Life SIM-only plan',
      },
      {
        name: 'Subscriptions',
        category: 'Bills',
        amount: 50,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'Netflix, Spotify, iCloud',
      },
      {
        name: 'Term Life Insurance',
        category: 'Insurance',
        amount: 150,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 0,
        notes: 'NTUC Income term life, $500k coverage',
      },
      {
        name: 'Health Insurance (IP)',
        category: 'Insurance',
        amount: 80,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 5.0,
        notes: 'Integrated Shield Plan rider, paid from Medisave + cash',
      },
      {
        name: 'Gym Membership',
        category: 'Health',
        amount: 100,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'ActiveSG + occasional ClassPass',
      },
      {
        name: 'Personal Care',
        category: 'Personal',
        amount: 80,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'Haircut, toiletries, etc',
      },
      {
        name: 'Shopping & Entertainment',
        category: 'Personal',
        amount: 200,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'Clothes, gadgets, movies',
      },
      {
        name: 'Annual Travel Fund',
        category: 'Travel',
        amount: 4000,
        frequency: 'annual',
        startDate: todayIso,
        growthRate: 3.0,
        notes: '1-2 overseas trips per year (Japan, Thailand, etc)',
      },
    ],
    scenarioEvents: [
      {
        name: 'Wedding & ROM',
        description: 'Getting married! Wedding banquet, ROM, photography, honeymoon. Using savings and some help from parents.',
        occursOn: getMonthString(2),
        displayIcon: 'heart',
        displayColor: '#ec4899',
        tags: ['milestone', 'marriage'],
        isIncluded: true,
        impacts: [
          {
            targetType: 'expense',
            impactKind: 'start',
            amount: 50000,
            currency: 'SGD',
            cadence: DEFAULT_MONTHLY_CADENCE,
            startMonth: getMonthString(2),
            frequency: 'one_time',
            name: 'Wedding Expenses',
          },
        ],
      },
      {
        name: 'First Child',
        description: 'Starting a family! Additional expenses for baby essentials, childcare planning. Baby Bonus helps offset initial costs.',
        occursOn: getMonthString(4),
        displayIcon: 'baby',
        displayColor: '#f59e0b',
        tags: ['milestone', 'family'],
        isIncluded: true,
        impacts: [
          {
            targetType: 'expense',
            impactKind: 'start',
            amount: 1500,
            currency: 'SGD',
            cadence: 'monthly',
            startMonth: getMonthString(4),
            frequency: 'monthly',
            name: 'Childcare & Baby Expenses',
          },
          {
            targetType: 'income',
            impactKind: 'start',
            amount: 11000,
            currency: 'SGD',
            cadence: DEFAULT_MONTHLY_CADENCE,
            startMonth: getMonthString(4),
            frequency: 'one_time',
            name: 'Baby Bonus',
            category: 'Government',
          },
        ],
      },
      {
        name: 'Buy a Car',
        description: 'Getting a modest car for the family. Toyota Corolla Hybrid with 10-year COE.',
        occursOn: getMonthString(7),
        displayIcon: 'car',
        displayColor: '#10b981',
        tags: ['milestone', 'vehicle'],
        isIncluded: true,
        impacts: [
          {
            targetType: 'asset',
            impactKind: 'start',
            amount: 150000,
            currency: 'SGD',
            cadence: DEFAULT_MONTHLY_CADENCE,
            startMonth: getMonthString(7),
            name: 'Toyota Corolla Hybrid',
          },
          {
            targetType: 'liability',
            impactKind: 'start',
            amount: 100000,
            currency: 'SGD',
            cadence: DEFAULT_MONTHLY_CADENCE,
            startMonth: getMonthString(7),
            name: 'Car Loan',
          },
          {
            targetType: 'expense',
            impactKind: 'start',
            amount: 1600,
            currency: 'SGD',
            cadence: 'monthly',
            startMonth: getMonthString(7),
            frequency: 'monthly',
            name: 'Car Running Costs',
          },
        ],
      },
      {
        name: 'Salary Promotion',
        description: 'Promoted to Senior/Lead role with significant salary bump (+$2k/month, +$5k bonus).',
        occursOn: getMonthString(3),
        displayIcon: 'trending-up',
        displayColor: '#22c55e',
        tags: ['career', 'income'],
        isIncluded: true,
        impacts: [
          {
            targetType: 'income',
            impactKind: 'delta',
            amount: 2400,
            currency: 'SGD',
            cadence: 'monthly',
            startMonth: getMonthString(3),
            notes: 'Net income increase: +$2k salary + ~$400/month from higher bonus tier',
          },
        ],
      },
      {
        name: 'Retirement at 60',
        description: 'Target retirement age. CPF Life payouts begin, stop working income, focus on passive income and drawdown.',
        occursOn: getMonthString(28),
        displayIcon: 'sunset',
        displayColor: '#f97316',
        tags: ['milestone', 'retirement'],
        isIncluded: true,
        impacts: [
          {
            targetType: 'income',
            impactKind: 'override',
            amount: 2000,
            currency: 'SGD',
            cadence: 'monthly',
            startMonth: getMonthString(28),
            notes: 'Income becomes CPF Life payout only (~$2k/month estimated)',
          },
        ],
      },
    ],
    propertyScenario: {
      country: 'SG',
      propertySG: {
        name: 'BTO Flat (Tengah)',
        propertyType: 'hdb',
        propertySubtype: 'bto',
        purchaseIcon: 'home',
        purchaseIconColor: '#3b82f6',
        saleIcon: 'banknote',
        saleIconColor: '#10b981',
        // Sale date: 10 years after key collection (MOP is 5 years, typical holding ~10 years)
        saleExpectedDate: getMonthString(15), // 5 years (key collection) + 10 years holding = 15 years from now
        // Expected sale price: ~34% appreciation over 10 years at 3% annual growth
        saleExpectedPrice: Math.round(450000 * Math.pow(1.03, 10)).toString(), // ~$604,762
        isIncluded: true,
        propertyPrice: '450000',
        loanType: 'hdb',
        downpaymentCpfOa: '85000',
        downpaymentCash: '27500',
        borrowerType: 'joint',
        borrower1PersonIndex: 0,
        borrower2PersonIndex: 1,
        borrower1DownpaymentCpfOaAmountType: 'fixed',
        borrower1DownpaymentCpfOa: '50000',
        borrower2DownpaymentCpfOaAmountType: 'fixed',
        borrower2DownpaymentCpfOa: '35000',
        borrower1MonthlyCpfOa: '1590',
        borrower2MonthlyCpfOa: '1060',
        borrower1DownpaymentCashAmountType: 'remainder',
        borrower1DownpaymentCashAmount: '27500',
        borrower2DownpaymentCashAmountType: 'remainder',
        borrower2DownpaymentCashAmount: '0',
        borrower1MonthlyCashAmountType: 'remainder',
        borrower1MonthlyCashAmount: '0',
        borrower2MonthlyCashAmountType: 'remainder',
        borrower2MonthlyCashAmount: '0',
        otherDebt: '0',
        propertyCount: 0,
        btoKeyCollectionDate: getMonthString(5),
      },
      ratePeriods: [
        {
          startMonth: getMonthString(5),
          termYears: 25,
          rate: '2.6',
          rateType: 'fixed' as const,
        },
      ],
      growthPeriods: [
        {
          startYear: 0,
          growthRate: '3.0',
          growthStrategy: 'compound_monthly',
        },
      ],
      fees: [
        // Purchase fees
        {
          feeContext: 'purchase',
          feeType: 'renovation',
          description: 'Renovation for new BTO flat',
          amount: '50000',
          isPercentage: false,
          frequency: 'one_time',
          startDate: getMonthString(5),
          endDate: getMonthString(5),
        },
        // Sale fees (at sale date: 15 years from now)
        {
          feeContext: 'sale',
          feeType: 'agent_commission',
          description: 'Property agent commission (2%)',
          amount: '2',
          isPercentage: true,
          frequency: 'one_time',
          startDate: getMonthString(15),
          endDate: getMonthString(15),
        },
        {
          feeContext: 'sale',
          feeType: 'legal_conveyancing',
          description: 'Legal & conveyancing fees',
          amount: '3000',
          isPercentage: false,
          frequency: 'one_time',
          startDate: getMonthString(15),
          endDate: getMonthString(15),
        },
        {
          feeContext: 'sale',
          feeType: 'mortgage_discharge',
          description: 'Mortgage discharge fee',
          amount: '500',
          isPercentage: false,
          frequency: 'one_time',
          startDate: getMonthString(15),
          endDate: getMonthString(15),
        },
      ],
    },
    incomeAllocations: [
      {
        incomeIndex: 0,
        investmentIndex: 0,
        allocationType: 'fixed',
        allocationValue: '300',
      },
      {
        incomeIndex: 0,
        investmentIndex: 1,
        allocationType: 'fixed',
        allocationValue: '200',
      },
    ],
  }
}

// ============================================================================
// PROFILE: Single Income Family
// ============================================================================
export function generateSingleIncomeFamilyProfile(): ProfileData {
  return {
    persons: [
      {
        name: 'Working Parent',
        displayColor: PERSON_COLORS[0],
        dateOfBirth: getDateOfBirth(35),
        gender: 'male',
        residencyStatus: 'citizen',
      },
      {
        name: 'Stay-home Parent',
        displayColor: PERSON_COLORS[1],
        dateOfBirth: getDateOfBirth(33),
        gender: 'female',
        residencyStatus: 'citizen',
      },
    ],
    cpfAccounts: [
      {
        personIndex: 0,
        personId: '',
        oaBalance: 95000,
        saBalance: 55000,
        maBalance: 40000,
        raBalance: 0,
        oaUsedForHousing: 30000, // Already used some for existing HDB
      },
      {
        personIndex: 1,
        personId: '',
        oaBalance: 40000,
        saBalance: 25000,
        maBalance: 18000,
        raBalance: 0,
        oaUsedForHousing: 20000,
      },
    ],
    cashAccounts: [
      {
        name: 'Family Savings',
        balance: 45000,
        interestRate: 2.5,
        bankName: 'OCBC',
        accountType: 'savings',
        isAccumulator: true,
        notes: 'Family emergency and education fund',
      },
    ],
    assets: [
      {
        name: 'Emergency Fund',
        category: 'cash_savings',
        currentValue: 30000,
        annualGrowthRate: 2.0,
        startDate: todayIso,
        notes: '6 months expenses for family security',
      },
    ],
    investments: [
      {
        name: 'Education Savings Plan',
        category: 'Investment',
        currentValue: 25000,
        annualGrowthRate: 4.0,
        startDate: todayIso,
        notes: 'For children university fund',
      },
      {
        name: 'Balanced Portfolio',
        category: 'Investment',
        currentValue: 35000,
        annualGrowthRate: 5.0,
        startDate: todayIso,
        notes: 'Conservative growth investments',
      },
    ],
    liabilities: [
      {
        name: 'HDB Loan',
        category: 'Mortgage',
        currentBalance: 280000,
        interestRateApr: 2.6,
        minimumPayment: 1500,
        startDate: todayIso,
        notes: 'Existing 4-room HDB, 18 years remaining',
      },
    ],
    incomes: [
      {
        personIndex: 0,
        personId: null,
        name: 'Senior Manager Salary',
        category: 'Employment',
        amount: 8500,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 3.5,
        cpfWageType: 'ow',
        notes: 'Senior role supporting family of 4',
      },
    ],
    expenses: [
      {
        name: 'HDB Mortgage',
        category: 'Housing',
        amount: 1500,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 0,
        notes: 'Monthly mortgage payment',
      },
      {
        name: 'Childcare (2 kids)',
        category: 'Family',
        amount: 1800,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 3.0,
        notes: 'Preschool fees for younger child',
      },
      {
        name: 'Parents Allowance',
        category: 'Family',
        amount: 600,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'Supporting elderly parents',
      },
      {
        name: 'Groceries & Food',
        category: 'Food',
        amount: 1000,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 3.0,
        notes: 'Family of 4 monthly groceries',
      },
      {
        name: 'Utilities',
        category: 'Bills',
        amount: 250,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 3.0,
        notes: 'Electricity, water, gas',
      },
      {
        name: 'Children Education',
        category: 'Education',
        amount: 400,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 4.0,
        notes: 'Tuition, enrichment classes',
      },
      {
        name: 'Family Insurance',
        category: 'Insurance',
        amount: 400,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 3.0,
        notes: 'Term life + health insurance for family',
      },
      {
        name: 'Transport',
        category: 'Transport',
        amount: 200,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'Public transport for family',
      },
      {
        name: 'Family Activities',
        category: 'Personal',
        amount: 300,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'Weekend outings, activities',
      },
    ],
    scenarioEvents: [
      {
        name: 'Child 1 Primary School',
        description: 'Eldest starts primary school - reduced childcare, new expenses.',
        occursOn: getMonthString(1),
        displayIcon: 'book-open',
        displayColor: '#3b82f6',
        tags: ['education', 'milestone'],
        isIncluded: true,
        impacts: [
          {
            targetType: 'expense',
            impactKind: 'delta',
            amount: -500,
            currency: 'SGD',
            cadence: 'monthly',
            startMonth: getMonthString(1),
            notes: 'Reduced childcare cost, primary school fees lower',
          },
        ],
      },
      {
        name: 'Child 2 Primary School',
        description: 'Second child starts primary school.',
        occursOn: getMonthString(4),
        displayIcon: 'book-open',
        displayColor: '#8b5cf6',
        tags: ['education', 'milestone'],
        isIncluded: true,
        impacts: [
          {
            targetType: 'expense',
            impactKind: 'delta',
            amount: -800,
            currency: 'SGD',
            cadence: 'monthly',
            startMonth: getMonthString(4),
            notes: 'No more preschool fees',
          },
        ],
      },
      {
        name: 'Return to Workforce',
        description: 'Stay-home parent returns to part-time work.',
        occursOn: getMonthString(5),
        displayIcon: 'briefcase',
        displayColor: '#10b981',
        tags: ['career', 'income'],
        isIncluded: true,
        impacts: [
          {
            targetType: 'income',
            impactKind: 'start',
            amount: 2500,
            currency: 'SGD',
            cadence: 'monthly',
            startMonth: getMonthString(5),
            frequency: 'monthly',
            name: 'Part-time Income',
            category: 'Employment',
          },
        ],
      },
      {
        name: 'University Fund Goal',
        description: 'Target education savings reached for first child university.',
        occursOn: getMonthString(12),
        displayIcon: 'graduation-cap',
        displayColor: '#f59e0b',
        tags: ['education', 'goal'],
        isIncluded: true,
        impacts: [],
      },
    ],
    incomeAllocations: [
      {
        incomeIndex: 0,
        investmentIndex: 0,
        allocationType: 'fixed',
        allocationValue: '300',
      },
    ],
  }
}

// ============================================================================
// PROFILE: FIRE Focused
// ============================================================================
export function generateFireFocusedProfile(): ProfileData {
  return {
    persons: [
      {
        name: 'You',
        displayColor: PERSON_COLORS[0],
        dateOfBirth: getDateOfBirth(35),
        gender: 'male',
        residencyStatus: 'citizen',
      },
    ],
    cpfAccounts: [
      {
        personIndex: 0,
        personId: '',
        oaBalance: 150000,
        saBalance: 80000,
        maBalance: 50000,
        raBalance: 0,
        oaUsedForHousing: 0,
      },
    ],
    cashAccounts: [
      {
        name: 'High-Yield Savings',
        balance: 50000,
        interestRate: 3.5,
        bankName: 'Standard Chartered',
        accountType: 'savings',
        isAccumulator: true,
        notes: 'Maximizing interest with bonus tiers',
      },
    ],
    assets: [
      {
        name: 'Emergency Fund',
        category: 'cash_savings',
        currentValue: 40000,
        annualGrowthRate: 2.5,
        startDate: todayIso,
        notes: '12 months expenses - larger buffer for FIRE',
      },
    ],
    investments: [
      {
        name: 'Global Index ETF Portfolio',
        category: 'Investment',
        currentValue: 250000,
        annualGrowthRate: 7.0,
        startDate: todayIso,
        notes: 'VWRA + ES3 - core FIRE portfolio',
      },
      {
        name: 'Singapore REITs',
        category: 'Investment',
        currentValue: 80000,
        annualGrowthRate: 5.5,
        startDate: todayIso,
        notes: 'Dividend income for passive cashflow',
      },
      {
        name: 'Singapore Savings Bonds',
        category: 'Investment',
        currentValue: 50000,
        annualGrowthRate: 3.0,
        startDate: todayIso,
        notes: 'Stable allocation, 10-year ladder',
      },
    ],
    liabilities: [],
    incomes: [
      {
        personIndex: 0,
        personId: null,
        name: 'Tech Lead Salary',
        category: 'Employment',
        amount: 12000,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 5.0,
        cpfWageType: 'ow',
        notes: 'Senior tech role, maximizing earning years',
      },
      {
        personIndex: 0,
        personId: null,
        name: 'Dividend Income',
        category: 'Investment',
        amount: 800,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 3.0,
        notes: 'REITs and stock dividends',
      },
    ],
    expenses: [
      {
        name: 'Room Rental',
        category: 'Housing',
        amount: 1200,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 3.0,
        notes: 'Renting to maximize investment capital',
      },
      {
        name: 'Food & Groceries',
        category: 'Food',
        amount: 400,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 3.0,
        notes: 'Mostly home cooking, meal prep',
      },
      {
        name: 'Transport',
        category: 'Transport',
        amount: 100,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'Public transport only',
      },
      {
        name: 'Parents Allowance',
        category: 'Family',
        amount: 500,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'Supporting parents',
      },
      {
        name: 'Insurance',
        category: 'Insurance',
        amount: 200,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 3.0,
        notes: 'Term life + health insurance',
      },
      {
        name: 'Misc & Personal',
        category: 'Personal',
        amount: 200,
        frequency: 'monthly',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'Minimal lifestyle spending',
      },
      {
        name: 'Annual Travel',
        category: 'Travel',
        amount: 3000,
        frequency: 'annual',
        startDate: todayIso,
        growthRate: 2.0,
        notes: 'Budget travel, off-peak',
      },
    ],
    scenarioEvents: [
      {
        name: 'Coast FIRE Achieved',
        description: 'Portfolio can grow to FIRE target without additional contributions. Can coast to retirement!',
        occursOn: getMonthString(3),
        displayIcon: 'anchor',
        displayColor: '#06b6d4',
        tags: ['milestone', 'fire'],
        isIncluded: true,
        impacts: [],
      },
      {
        name: '$500k Portfolio',
        description: 'Hit the half-million milestone. Compound growth really kicking in.',
        occursOn: getMonthString(5),
        displayIcon: 'trending-up',
        displayColor: '#10b981',
        tags: ['milestone', 'fire'],
        isIncluded: true,
        impacts: [],
      },
      {
        name: 'Early Retirement at 45',
        description: 'Reached financial independence! Switching to passive income and pursuing passions.',
        occursOn: getMonthString(10),
        displayIcon: 'sunset',
        displayColor: '#f59e0b',
        tags: ['milestone', 'fire', 'retirement'],
        isIncluded: true,
        impacts: [
          {
            targetType: 'income',
            impactKind: 'override',
            amount: 4000,
            currency: 'SGD',
            cadence: 'monthly',
            startMonth: getMonthString(10),
            notes: 'Passive income from dividends + 4% withdrawal rate',
          },
        ],
      },
    ],
    incomeAllocations: [
      {
        incomeIndex: 0,
        investmentIndex: 0,
        allocationType: 'fixed',
        allocationValue: '4000',
      },
      {
        incomeIndex: 0,
        investmentIndex: 1,
        allocationType: 'fixed',
        allocationValue: '1000',
      },
      {
        incomeIndex: 0,
        investmentIndex: 2,
        allocationType: 'fixed',
        allocationValue: '500',
      },
    ],
  }
}

// ============================================================================
// PROFILE: Blank Slate (Empty)
// ============================================================================
export function generateBlankSlateProfile(): ProfileData {
  return {
    persons: [],
    cpfAccounts: [],
    cashAccounts: [],
    assets: [],
    investments: [],
    liabilities: [],
    incomes: [],
    expenses: [],
    scenarioEvents: [],
  }
}

// ============================================================================
// Profile Generator Registry
// ============================================================================
export const PROFILE_GENERATORS: Record<string, () => ProfileData> = {
  'single-early-career': generateSingleEarlyCareerProfile,
  dink: generateDinkProfile,
  'dink-kids-planned': generateDinkKidsPlannedProfile,
  'single-income-family': generateSingleIncomeFamilyProfile,
  'fire-focused': generateFireFocusedProfile,
  'blank-slate': generateBlankSlateProfile,
}

export function getProfileGenerator(profileId: string): (() => ProfileData) | undefined {
  return PROFILE_GENERATORS[profileId]
}
