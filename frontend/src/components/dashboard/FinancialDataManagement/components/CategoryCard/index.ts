/**
 * CategoryCard Subcomponents
 *
 * These components are extracted from CategoryCard for better maintainability.
 */

// Header components
export { CategoryCardHeader } from './CategoryCardHeader'
export { CategoryCardTotal } from './CategoryCardTotal'

// Item section components
export { GroupedItemsSection, GroupedAssetsSection } from './GroupedItemsSection'
export { FlatItemsSection } from './FlatItemsSection'

// Asset subsections
export { InvestmentsAssetsSection } from './InvestmentsAssetsSection'
export { CPFAssetsSection } from './CPFAssetsSection'
export { PropertiesAssetsSection } from './PropertiesAssetsSection'

// Liability subsections
export { PropertiesMortgagesSection } from './PropertiesMortgagesSection'

// Income subsections
export { CPFContributionsSection } from './CPFContributionsSection'
export { InvestmentsIncomeSection } from './InvestmentsIncomeSection'

// Expense subsections
export { DebtRepaymentsSection } from './DebtRepaymentsSection'
export { InsurancePremiumsSection } from './InsurancePremiumsSection'

// Types
export type {
  ItemRenderingProps,
  ScenarioEventProps,
  SelectionProps,
  CRUDProps,
  CashAccountProps,
  PropertyLinkProps,
  AllocationProps,
  BaseSectionProps,
  InvestmentsSectionProps,
  CPFContributionsSectionProps,
  DebtRepaymentsSectionProps,
  AssetSubsectionProps,
} from './types'
