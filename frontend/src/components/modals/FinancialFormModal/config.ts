import type { FinancialDataType } from './types'

export const PROPERTY_CATEGORY = 'property_real_estate'
export const MORTGAGE_CATEGORY = 'mortgage_home'
export const MORTGAGE_EXPENSE_CATEGORY = 'housing_mortgage'

export const assetCategoryOptions = [
  { value: PROPERTY_CATEGORY, label: 'Property (real estate)' },
  { value: 'cash_savings', label: 'Cash / savings' },
  { value: 'bank_account', label: 'Bank account' },
  { value: 'cpf_account', label: 'CPF account' },
  { value: 'stocks_portfolio', label: 'Stocks / ETFs' },
  { value: 'bonds_investment', label: 'Bonds / fixed income' },
  { value: 'cryptocurrency', label: 'Crypto' },
  { value: 'other_asset', label: 'Other asset' },
]

export const liabilityCategoryOptions = [
  { value: MORTGAGE_CATEGORY, label: 'Mortgage (home)' },
  { value: 'personal_loan', label: 'Personal loan' },
  { value: 'car_loan', label: 'Car loan' },
  { value: 'education_loan', label: 'Education loan' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'business_loan', label: 'Business loan' },
  { value: 'overdraft', label: 'Overdraft' },
  { value: 'other_debt', label: 'Other debt' },
]

export const expenseCategoryOptions = [
  { value: MORTGAGE_EXPENSE_CATEGORY, label: 'Housing: Mortgage' },
  { value: 'housing_rent', label: 'Housing: Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'food_groceries', label: 'Food & groceries' },
  { value: 'transport_car', label: 'Transport: Car/public' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other_expense', label: 'Other expense' },
]

export const incomeCategoryOptions = [
  { value: 'employment_income', label: 'Employment income' },
  { value: 'rental_income', label: 'Rental income' },
  { value: 'business_income', label: 'Business income' },
  { value: 'investment_income', label: 'Investment income' },
  { value: 'other_income', label: 'Other income' },
]

export const investmentCategoryOptions = [
  { value: 'stocks_portfolio', label: 'Stocks / Equities' },
  { value: 'bonds_investment', label: 'Bonds / Fixed Income' },
  { value: 'mutual_funds', label: 'Mutual Funds' },
  { value: 'etf', label: 'ETFs' },
  { value: 'reit', label: 'REITs' },
  { value: 'cryptocurrency', label: 'Cryptocurrency' },
  { value: 'other_investment', label: 'Other Investment' },
]

export const defaultCategories: Record<FinancialDataType, string> = {
  asset: PROPERTY_CATEGORY,
  liability: MORTGAGE_CATEGORY,
  expense: MORTGAGE_EXPENSE_CATEGORY,
  income: incomeCategoryOptions[0]?.value ?? '',
  investment: investmentCategoryOptions[0]?.value ?? '',
}

export const fallbackGrowthRates: Record<string, number> = {
  asset_property: 3.0,
  asset_cash: 1.5,
  asset_equity: 6.0,
  liability_debt: -3.0,
  income: 3.0,
  expense: 2.0,
}

export function getCategoryOptions(type: FinancialDataType) {
  switch (type) {
    case 'asset':
      return assetCategoryOptions
    case 'liability':
      return liabilityCategoryOptions
    case 'expense':
      return expenseCategoryOptions
    case 'income':
      return incomeCategoryOptions
    case 'investment':
      return investmentCategoryOptions
    default:
      return []
  }
}

export function getNormalizedCategory(type: FinancialDataType): string {
  switch (type) {
    case 'income':
      return 'incomes'
    case 'expense':
      return 'expenses'
    case 'asset':
      return 'assets'
    case 'liability':
      return 'liabilities'
    case 'investment':
      return 'investments'
    default:
      return type
  }
}

export function getModalTitle(mode: 'create' | 'edit', normalizedCategory: string): string {
  const action = mode === 'edit' ? 'Edit' : 'Add'
  const categoryTitle =
    normalizedCategory === 'incomes'
      ? 'Income'
      : normalizedCategory === 'expenses'
        ? 'Expense'
        : normalizedCategory === 'assets'
          ? 'Asset'
          : normalizedCategory === 'investments'
            ? 'Investment'
            : 'Liability'
  return `${action} ${categoryTitle}`
}

export function getModalIcon(normalizedCategory: string): string {
  return normalizedCategory === 'incomes'
    ? '💼'
    : normalizedCategory === 'expenses'
      ? '💰'
      : normalizedCategory === 'assets'
        ? '📈'
        : normalizedCategory === 'investments'
          ? '📊'
          : '💳'
}

export function getNameLabel(normalizedCategory: string): string {
  return normalizedCategory === 'incomes'
    ? 'Source'
    : normalizedCategory === 'expenses'
      ? 'Payee'
      : 'Name'
}

export function getAmountLabel(normalizedCategory: string): string {
  if (normalizedCategory === 'assets' || normalizedCategory === 'investments') {
    return 'Current Value'
  }
  if (normalizedCategory === 'liabilities') {
    return 'Balance'
  }
  return 'Amount'
}
