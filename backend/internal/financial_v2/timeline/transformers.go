package timeline_v2

import (
	cpfProcessor "financial-chat-system/backend/internal/cpf/processor"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// =============================================================================
// Transform Functions (used by loadEffectiveRows)
// =============================================================================

// transformNonCashAssets converts repository.NonCashAsset to FinancialDataRow
func transformNonCashAssets(assets []repo.NonCashAsset) []FinancialDataRow {
	rows := make([]FinancialDataRow, 0, len(assets))
	for _, a := range assets {
		rows = append(rows, FinancialDataRow{
			ID:              a.ID,
			ParentID:        a.ParentID, // Already coalesced in SQL
			Name:            a.Name,
			Category:        a.Category,
			Amount:          a.CurrentValue,
			StartDate:       a.StartDate,
			EndDate:         a.EndDate,
			ItemType:        FinNonCashAsset,
			GrowthRate:      a.AnnualGrowthRate,
			TerminalValue:   a.TerminalValue,
			LeaseStartYear:  a.LeaseStartYear,
			ScenarioEventID: a.ScenarioEventID,
		})
	}
	return rows
}

// transformInvestments converts repository.Investment to FinancialDataRow
func transformInvestments(investments []repo.Investment) []FinancialDataRow {
	rows := make([]FinancialDataRow, 0, len(investments))
	for _, inv := range investments {
		rows = append(rows, FinancialDataRow{
			ID:              inv.ID,
			ParentID:        inv.ParentID,
			Name:            inv.Name,
			Category:        inv.Category,
			Amount:          inv.CurrentValue,
			StartDate:       inv.StartDate,
			EndDate:         inv.EndDate,
			ItemType:        FinInvestment,
			GrowthRate:      inv.GrowthRate,
			ScenarioEventID: inv.ScenarioEventID,
		})
	}
	return rows
}

// transformCashAssets converts repository.CashAsset to FinancialDataRow
func transformCashAssets(assets []repo.CashAsset) []FinancialDataRow {
	rows := make([]FinancialDataRow, 0, len(assets))
	for _, a := range assets {
		rows = append(rows, FinancialDataRow{
			ID:            a.ID,
			ParentID:      a.ID, // Cash accounts use ID as ParentID
			Name:          a.Name,
			Category:      a.AccountType,
			Amount:        a.Balance,
			StartDate:     a.StartDate,
			EndDate:       a.EndDate,
			ItemType:      FinCashAsset,
			GrowthRate:    a.InterestRate,
			IsAccumulator: a.IsAccumulator,
		})
	}
	return rows
}

// transformLiabilities converts repository.Liability to FinancialDataRow
func transformLiabilities(liabilities []repo.Liability) []FinancialDataRow {
	rows := make([]FinancialDataRow, 0, len(liabilities))
	for _, l := range liabilities {
		rows = append(rows, FinancialDataRow{
			ID:                l.ID,
			ParentID:          l.ParentID,
			Name:              l.Name,
			Category:          l.Category,
			Amount:            l.CurrentBalance,
			StartDate:         l.StartDate,
			EndDate:           l.EndDate,
			ItemType:          FinLiabilities,
			GrowthRate:        l.InterestRateAPR,
			InterestRate:      l.InterestRateAPR,
			MinimumPay:        l.MinimumPayment,
			RepaymentStrategy: l.RepaymentStrategy,
			ScenarioEventID:   l.ScenarioEventID,
		})
	}
	return rows
}

// transformIncomes converts repository.Income to FinancialDataRow
func transformIncomes(incomes []repo.Income) []FinancialDataRow {
	rows := make([]FinancialDataRow, 0, len(incomes))
	for _, i := range incomes {
		rows = append(rows, FinancialDataRow{
			ID:              i.ID,
			ParentID:        i.ParentID,
			Name:            i.Name,
			Earner:          i.Earner,
			PersonID:        i.PersonID,
			Category:        i.Category,
			Amount:          i.Amount,
			Frequency:       Frequency(i.Frequency), // Keep actual frequency
			StartDate:       i.StartDate,
			EndDate:         i.EndDate,
			ItemType:        FinIncome,
			GrowthRate:      i.GrowthRate,
			CPFWageType:     cpfProcessor.CPFWageType(i.CPFWageType),
			ScenarioEventID: i.ScenarioEventID,
		})
	}
	return rows
}

// transformExpenses converts repository.Expense to FinancialDataRow
func transformExpenses(expenses []repo.Expense) []FinancialDataRow {
	rows := make([]FinancialDataRow, 0, len(expenses))
	for _, e := range expenses {
		rows = append(rows, FinancialDataRow{
			ID:                e.ID,
			ParentID:          e.ParentID,
			Name:              e.Name,
			Category:          e.Category,
			Amount:            e.Amount,
			Frequency:         Frequency(e.Frequency), // Keep actual frequency
			StartDate:         e.StartDate,
			EndDate:           e.EndDate,
			ItemType:          FinExpense,
			GrowthRate:        e.GrowthRate,
			SourceLiabilityID: e.SourceLiabilityID,
			ScenarioEventID:   e.ScenarioEventID,
		})
	}
	return rows
}
