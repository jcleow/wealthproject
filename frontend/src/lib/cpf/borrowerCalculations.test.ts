import { describe, it, expect } from 'vitest'
import {
  calculateHoldingMonths,
  calculateProportionalInterest,
  calculateBorrowerCPFUsage,
  extractBackendTotalInterest,
} from './borrowerCalculations'
import { CPF_OA_INTEREST_RATE } from './constants'
import type { CPFAccount } from '@/types/cpf'

describe('calculateHoldingMonths', () => {
  it('should calculate months between two dates', () => {
    const start = new Date('2024-01-01')
    const end = new Date('2024-06-01')
    expect(calculateHoldingMonths(start, end)).toBe(5)
  })

  it('should return minimum of 1 month', () => {
    const start = new Date('2024-06-01')
    const end = new Date('2024-06-01')
    expect(calculateHoldingMonths(start, end)).toBe(1)
  })

  it('should handle year boundaries', () => {
    const start = new Date('2023-10-01')
    const end = new Date('2024-03-01')
    expect(calculateHoldingMonths(start, end)).toBe(5)
  })

  it('should handle multi-year periods', () => {
    const start = new Date('2020-01-01')
    const end = new Date('2025-01-01')
    expect(calculateHoldingMonths(start, end)).toBe(60)
  })

  it('should return 1 when end is before start (edge case)', () => {
    const start = new Date('2024-06-01')
    const end = new Date('2024-01-01')
    expect(calculateHoldingMonths(start, end)).toBe(1)
  })
})

describe('calculateProportionalInterest', () => {
  describe('with backend interest available', () => {
    it('should distribute interest proportionally between borrowers', () => {
      const result = calculateProportionalInterest(60000, 40000, 12, 2500)
      expect(result.b1Interest).toBe(1500) // 60% of 2500
      expect(result.b2Interest).toBe(1000) // 40% of 2500
    })

    it('should handle single borrower (b2Total = 0)', () => {
      const result = calculateProportionalInterest(100000, 0, 12, 2500)
      expect(result.b1Interest).toBe(2500)
      expect(result.b2Interest).toBe(0)
    })

    it('should handle equal borrower amounts', () => {
      const result = calculateProportionalInterest(50000, 50000, 12, 2500)
      expect(result.b1Interest).toBe(1250)
      expect(result.b2Interest).toBe(1250)
    })
  })

  describe('without backend interest (fallback calculation)', () => {
    it('should calculate simple interest for single borrower', () => {
      const result = calculateProportionalInterest(100000, 0, 12, null)
      // 100000 * 0.025 * (12/12) = 2500
      expect(result.b1Interest).toBe(100000 * CPF_OA_INTEREST_RATE * 1)
      expect(result.b2Interest).toBe(0)
    })

    it('should calculate proportional simple interest for joint borrowers', () => {
      const result = calculateProportionalInterest(60000, 40000, 24, null)
      // b1: 60000 * 0.025 * 2 = 3000
      // b2: 40000 * 0.025 * 2 = 2000
      expect(result.b1Interest).toBe(60000 * CPF_OA_INTEREST_RATE * 2)
      expect(result.b2Interest).toBe(40000 * CPF_OA_INTEREST_RATE * 2)
    })

    it('should handle partial year correctly', () => {
      const result = calculateProportionalInterest(100000, 0, 6, null)
      // 100000 * 0.025 * 0.5 = 1250
      expect(result.b1Interest).toBe(100000 * CPF_OA_INTEREST_RATE * 0.5)
    })
  })

  describe('edge cases', () => {
    it('should handle zero totals', () => {
      const result = calculateProportionalInterest(0, 0, 12, 1000)
      expect(result.b1Interest).toBe(1000) // b1Ratio defaults to 1
      expect(result.b2Interest).toBe(0)
    })

    it('should handle zero totals with null backend interest', () => {
      const result = calculateProportionalInterest(0, 0, 12, null)
      expect(result.b1Interest).toBe(0)
      expect(result.b2Interest).toBe(0)
    })
  })
})

describe('extractBackendTotalInterest', () => {
  it('should extract total accrued interest from valid response', () => {
    const response = {
      usage: {
        accruedInterest: {
          totalAccrued: '2500.50',
        },
      },
    }
    expect(extractBackendTotalInterest(response)).toBe(2500.5)
  })

  it('should return null for null response', () => {
    expect(extractBackendTotalInterest(null)).toBeNull()
  })

  it('should return null for undefined response', () => {
    expect(extractBackendTotalInterest(undefined)).toBeNull()
  })

  it('should return null for null usage', () => {
    const response = { usage: null }
    expect(extractBackendTotalInterest(response)).toBeNull()
  })

  it('should return null for missing accruedInterest', () => {
    const response = { usage: {} }
    expect(extractBackendTotalInterest(response)).toBeNull()
  })

  it('should return null for missing totalAccrued', () => {
    const response = { usage: { accruedInterest: {} } }
    expect(extractBackendTotalInterest(response)).toBeNull()
  })

  it('should return null for empty string totalAccrued', () => {
    const response = { usage: { accruedInterest: { totalAccrued: '' } } }
    expect(extractBackendTotalInterest(response)).toBeNull()
  })
})

describe('calculateBorrowerCPFUsage', () => {
  const createMockAccountMap = (accounts: Array<{ id: string; personName: string }>) => {
    return new Map(accounts.map(a => [a.id, { personName: a.personName } as CPFAccount]))
  }

  describe('single borrower', () => {
    it('should calculate CPF usage for single borrower', () => {
      const accountMap = createMockAccountMap([{ id: 'cpf-1', personName: 'Alice' }])

      const result = calculateBorrowerCPFUsage({
        borrower1CpfAccountId: 'cpf-1',
        borrower1DownpaymentCpfOa: '50000',
        borrower1MonthlyCpfOa: '1000',
        borrowerType: 'single',
        holdingMonths: 12,
        accountMap,
        backendTotalInterest: 2625, // Accurate compound interest from backend
      })

      expect(result.borrower1).not.toBeNull()
      expect(result.borrower1?.name).toBe('Alice')
      expect(result.borrower1?.downpaymentCpfOa).toBe(50000)
      expect(result.borrower1?.monthlyCpfOa).toBe(1000)
      expect(result.borrower1?.totalCpfUsed).toBe(62000) // 50000 + (1000 * 12)
      expect(result.borrower1?.accruedInterest).toBe(2625)
      expect(result.borrower2).toBeNull()
      expect(result.totalCpfUsed).toBe(62000)
      expect(result.totalAccruedInterest).toBe(2625)
    })

    it('should use fallback calculation when backend interest unavailable', () => {
      const accountMap = createMockAccountMap([{ id: 'cpf-1', personName: 'Alice' }])

      const result = calculateBorrowerCPFUsage({
        borrower1CpfAccountId: 'cpf-1',
        borrower1DownpaymentCpfOa: '100000',
        borrower1MonthlyCpfOa: '0',
        borrowerType: 'single',
        holdingMonths: 12,
        accountMap,
        backendTotalInterest: null,
      })

      // Fallback: 100000 * 0.025 * 1 = 2500
      expect(result.borrower1?.accruedInterest).toBe(2500)
    })
  })

  describe('joint borrowers', () => {
    it('should calculate CPF usage for both borrowers', () => {
      const accountMap = createMockAccountMap([
        { id: 'cpf-1', personName: 'Alice' },
        { id: 'cpf-2', personName: 'Bob' },
      ])

      const result = calculateBorrowerCPFUsage({
        borrower1CpfAccountId: 'cpf-1',
        borrower1DownpaymentCpfOa: '30000',
        borrower1MonthlyCpfOa: '500',
        borrowerType: 'joint',
        borrower2CpfAccountId: 'cpf-2',
        borrower2DownpaymentCpfOa: '20000',
        borrower2MonthlyCpfOa: '500',
        holdingMonths: 12,
        accountMap,
        backendTotalInterest: 2000,
      })

      expect(result.borrower1?.name).toBe('Alice')
      expect(result.borrower1?.totalCpfUsed).toBe(36000) // 30000 + (500 * 12)
      expect(result.borrower2?.name).toBe('Bob')
      expect(result.borrower2?.totalCpfUsed).toBe(26000) // 20000 + (500 * 12)

      // Interest split proportionally: 36000/(36000+26000) = 0.58
      const b1Ratio = 36000 / 62000
      expect(result.borrower1?.accruedInterest).toBeCloseTo(2000 * b1Ratio)
      expect(result.borrower2?.accruedInterest).toBeCloseTo(2000 * (1 - b1Ratio))

      expect(result.totalCpfUsed).toBe(62000)
      expect(result.totalAccruedInterest).toBeCloseTo(2000)
    })

    it('should not include borrower2 if marked as single', () => {
      const accountMap = createMockAccountMap([
        { id: 'cpf-1', personName: 'Alice' },
        { id: 'cpf-2', personName: 'Bob' },
      ])

      const result = calculateBorrowerCPFUsage({
        borrower1CpfAccountId: 'cpf-1',
        borrower1DownpaymentCpfOa: '50000',
        borrower1MonthlyCpfOa: '1000',
        borrowerType: 'single', // Single even though borrower2 data provided
        borrower2CpfAccountId: 'cpf-2',
        borrower2DownpaymentCpfOa: '30000',
        borrower2MonthlyCpfOa: '500',
        holdingMonths: 12,
        accountMap,
        backendTotalInterest: 1550,
      })

      expect(result.borrower1).not.toBeNull()
      expect(result.borrower2).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should handle null/undefined string values', () => {
      const accountMap = createMockAccountMap([{ id: 'cpf-1', personName: 'Alice' }])

      const result = calculateBorrowerCPFUsage({
        borrower1CpfAccountId: 'cpf-1',
        borrower1DownpaymentCpfOa: null,
        borrower1MonthlyCpfOa: undefined,
        borrowerType: 'single',
        holdingMonths: 12,
        accountMap,
        backendTotalInterest: null,
      })

      expect(result.borrower1?.downpaymentCpfOa).toBe(0)
      expect(result.borrower1?.monthlyCpfOa).toBe(0)
      expect(result.borrower1?.totalCpfUsed).toBe(0)
    })

    it('should return null borrower1 if no CPF account ID', () => {
      const accountMap = createMockAccountMap([])

      const result = calculateBorrowerCPFUsage({
        borrower1CpfAccountId: null,
        borrower1DownpaymentCpfOa: '50000',
        borrower1MonthlyCpfOa: '1000',
        borrowerType: 'single',
        holdingMonths: 12,
        accountMap,
        backendTotalInterest: null,
      })

      expect(result.borrower1).toBeNull()
    })

    it('should use fallback name if person not found in account map', () => {
      const accountMap = createMockAccountMap([])

      const result = calculateBorrowerCPFUsage({
        borrower1CpfAccountId: 'unknown-id',
        borrower1DownpaymentCpfOa: '50000',
        borrower1MonthlyCpfOa: '0',
        borrowerType: 'single',
        holdingMonths: 12,
        accountMap,
        backendTotalInterest: null,
      })

      expect(result.borrower1?.name).toBe('Borrower 1')
    })
  })
})

describe('CPF_OA_INTEREST_RATE', () => {
  it('should be 2.5% (0.025)', () => {
    expect(CPF_OA_INTEREST_RATE).toBe(0.025)
  })
})
