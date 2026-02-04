// ─── Category icons for collapsed row summaries and dropdown options ──────────

export const INCOME_CATEGORY_ICONS: Record<string, string> = {
  salary: '💼',
  bonus: '🎁',
  rental: '🏘',
  freelance: '💻',
  dividend: '📈',
  other: '📋',
}

export const EXPENSE_CATEGORY_ICONS: Record<string, string> = {
  housing: '🏠',
  transport: '🚗',
  food: '🍽',
  utilities: '⚡',
  insurance: '🛡',
  living: '💰',
  other: '📦',
}

export const ASSET_CATEGORY_ICONS: Record<string, string> = {
  cash_savings: '💵',
  stocks_etfs: '📊',
  bonds: '🏦',
  property: '🏘',
  vehicle: '🚗',
  other: '📦',
}

export const LIABILITY_CATEGORY_ICONS: Record<string, string> = {
  mortgage: '🏠',
  car_loan: '🚗',
  student_loan: '🎓',
  credit_card: '💳',
  personal_loan: '🤝',
  other: '📋',
}

/** Income categories that default to CPF-eligible (Yes toggle) */
export const CPF_DEFAULT_CATEGORIES = new Set(['salary', 'bonus'])
