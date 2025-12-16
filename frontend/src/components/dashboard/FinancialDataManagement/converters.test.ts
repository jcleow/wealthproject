import { describe, it, expect } from 'vitest'
import {
  parseDecimal,
  nonCashAssetV2ToTimelineItem,
  investmentV2ToTimelineItem,
  cashAssetV2ToTimelineItem,
  cpfAssetV2ToTimelineItem,
  liabilityV2ToTimelineItem,
  incomeV2ToTimelineItem,
  expenseV2ToTimelineItem,
} from './converters'
import type {
  NonCashAssetResponseV2,
  InvestmentResponseV2,
  CashAssetResponseV2,
  CPFAssetResponseV2,
  LiabilityResponseV2,
  IncomeResponseV2,
  ExpenseResponseV2,
} from '@/types/timeline'

describe('parseDecimal', () => {
  it('parses valid decimal strings', () => {
    expect(parseDecimal('100.50')).toBe(100.5)
    expect(parseDecimal('1000')).toBe(1000)
    expect(parseDecimal('0.0001')).toBe(0.0001)
  })

  it('returns 0 for undefined', () => {
    expect(parseDecimal(undefined)).toBe(0)
  })

  it('returns 0 for empty string', () => {
    expect(parseDecimal('')).toBe(0)
  })

  it('returns 0 for non-numeric strings', () => {
    expect(parseDecimal('abc')).toBe(0)
    expect(parseDecimal('NaN')).toBe(0)
  })

  it('handles negative numbers', () => {
    expect(parseDecimal('-500.25')).toBe(-500.25)
  })
})

describe('investmentV2ToTimelineItem', () => {
  it('converts investment response to timeline item', () => {
    const investment: InvestmentResponseV2 = {
      id: 'inv-1',
      parentId: 'inv-parent-1',
      name: 'Stock Portfolio',
      category: 'equity',
      balance: '50000.0000',
      eventAdjBalance: '52500.0000',
      growthRate: '5.0000',
      itemType: 'investment',
      startDate: '2025-01-01',
      startYear: 2025,
      startMonth: 1,
    }

    const result = investmentV2ToTimelineItem(investment)

    expect(result.itemId).toBe('inv-1')
    expect(result.parentId).toBe('inv-parent-1')
    expect(result.name).toBe('Stock Portfolio')
    expect(result.category).toBe('equity')
    expect(result.amountAnnual).toBe(50000)
    expect(result.adjAnnualAmt).toBe(52500)
    expect(result.amountMonthly).toBe(50000)
    expect(result.adjMonthlyAmt).toBe(52500)
    expect(result.itemType).toBe('investment')
    expect(result.startYear).toBe(2025)
    expect(result.startMonth).toBe(1)
    expect(result.growthRate).toBe(5)
  })

  it('handles zero balance investment', () => {
    const investment: InvestmentResponseV2 = {
      id: 'inv-2',
      parentId: 'inv-2',
      name: 'New Investment',
      category: 'bonds',
      balance: '0',
      eventAdjBalance: '0',
      growthRate: '0',
      itemType: 'investment',
      startDate: '2025-06-01',
      startYear: 2025,
      startMonth: 6,
    }

    const result = investmentV2ToTimelineItem(investment)

    expect(result.amountAnnual).toBe(0)
    expect(result.adjAnnualAmt).toBe(0)
  })
})

describe('nonCashAssetV2ToTimelineItem', () => {
  it('converts non-cash asset response to timeline item', () => {
    const asset: NonCashAssetResponseV2 = {
      id: 'asset-1',
      parentId: 'asset-parent-1',
      name: 'Property',
      category: 'real_estate',
      balance: '500000.0000',
      eventAdjBalance: '515000.0000',
      itemType: 'nonCashAsset',
      startDate: '2020-01-01',
      startYear: 2020,
      startMonth: 1,
    }

    const result = nonCashAssetV2ToTimelineItem(asset)

    expect(result.itemId).toBe('asset-1')
    expect(result.parentId).toBe('asset-parent-1')
    expect(result.name).toBe('Property')
    expect(result.category).toBe('real_estate')
    expect(result.amountAnnual).toBe(500000)
    expect(result.adjAnnualAmt).toBe(515000)
    expect(result.itemType).toBe('nonCashAsset')
  })
})

describe('cashAssetV2ToTimelineItem', () => {
  it('converts cash asset response to timeline item', () => {
    const cashAsset: CashAssetResponseV2 = {
      itemId: 'cash-1',
      name: 'Savings Account',
      category: 'savings',
      balance: '10000.0000',
      eventAdjBalance: '10200.0000',
      itemType: 'cashAsset',
      startYear: 2025,
      startMonth: 1,
      isAccumulator: true,
    }

    const result = cashAssetV2ToTimelineItem(cashAsset)

    expect(result.itemId).toBe('cash-1')
    expect(result.name).toBe('Savings Account')
    expect(result.category).toBe('savings')
    expect(result.amountAnnual).toBe(10000)
    expect(result.adjAnnualAmt).toBe(10200)
    expect(result.itemType).toBe('cashAsset')
    expect(result.isAccumulator).toBe(true)
  })
})

describe('cpfAssetV2ToTimelineItem', () => {
  it('converts CPF asset response to timeline item', () => {
    const cpfAsset: CPFAssetResponseV2 = {
      id: 'cpf-1',
      parentId: 'cpf-parent-1',
      name: 'CPF OA',
      category: 'cpf_oa',
      balance: '50000.0000',
      eventAdjBalance: '51250.0000',
      itemType: 'cpf_account',
      startDate: '2025-01-01',
      startYear: 2025,
      startMonth: 1,
    }

    const result = cpfAssetV2ToTimelineItem(cpfAsset)

    expect(result.itemId).toBe('cpf-1')
    expect(result.parentId).toBe('cpf-parent-1')
    expect(result.name).toBe('CPF OA')
    expect(result.category).toBe('cpf_oa')
    expect(result.amountAnnual).toBe(50000)
    expect(result.adjAnnualAmt).toBe(51250)
    expect(result.itemType).toBe('cpf_account')
  })
})

describe('liabilityV2ToTimelineItem', () => {
  it('converts liability response to timeline item', () => {
    const liability: LiabilityResponseV2 = {
      id: 'liability-1',
      parentId: 'liability-parent-1',
      name: 'Mortgage',
      category: 'property',
      balance: '350000.0000',
      eventAdjBalance: '345000.0000',
      sourceAmount: '400000.0000',
      itemType: 'liabilities',
      startYear: 2020,
      startMonth: 6,
    }

    const result = liabilityV2ToTimelineItem(liability)

    expect(result.itemId).toBe('liability-1')
    expect(result.parentId).toBe('liability-parent-1')
    expect(result.name).toBe('Mortgage')
    expect(result.category).toBe('property')
    expect(result.amountAnnual).toBe(350000)
    expect(result.adjAnnualAmt).toBe(345000)
    expect(result.sourceAmount).toBe(400000)
    expect(result.itemType).toBe('liabilities')
  })
})

describe('incomeV2ToTimelineItem', () => {
  it('converts income response to timeline item', () => {
    const income: IncomeResponseV2 = {
      id: 'income-1',
      parentId: 'income-parent-1',
      name: 'Salary',
      category: 'employment',
      amount: '8000.0000',
      eventAdjAmount: '8240.0000',
      sourceFrequency: 'monthly',
      itemType: 'income',
      startYear: 2025,
      startMonth: 1,
      growthRate: '3.0000',
    }

    const result = incomeV2ToTimelineItem(income)

    expect(result.itemId).toBe('income-1')
    expect(result.parentId).toBe('income-parent-1')
    expect(result.name).toBe('Salary')
    expect(result.category).toBe('employment')
    expect(result.amountAnnual).toBe(8000)
    expect(result.adjAnnualAmt).toBe(8240)
    expect(result.amountMonthly).toBe(8000)
    expect(result.adjMonthlyAmt).toBe(8240)
    expect(result.sourceFrequency).toBe('monthly')
    expect(result.itemType).toBe('income')
    expect(result.growthRate).toBe(3)
  })
})

describe('expenseV2ToTimelineItem', () => {
  it('converts expense response to timeline item', () => {
    const expense: ExpenseResponseV2 = {
      id: 'expense-1',
      parentId: 'expense-parent-1',
      name: 'Rent',
      category: 'housing',
      amount: '2500.0000',
      eventAdjAmount: '2575.0000',
      sourceFrequency: 'monthly',
      itemType: 'expense',
      startYear: 2025,
      startMonth: 1,
    }

    const result = expenseV2ToTimelineItem(expense)

    expect(result.itemId).toBe('expense-1')
    expect(result.parentId).toBe('expense-parent-1')
    expect(result.name).toBe('Rent')
    expect(result.category).toBe('housing')
    expect(result.amountAnnual).toBe(2500)
    expect(result.adjAnnualAmt).toBe(2575)
    expect(result.amountMonthly).toBe(2500)
    expect(result.adjMonthlyAmt).toBe(2575)
    expect(result.sourceFrequency).toBe('monthly')
    expect(result.itemType).toBe('expense')
  })
})
