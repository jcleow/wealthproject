package timeline_v2

import (
	"testing"

	"financial-chat-system/backend/internal/decimal"
)

func TestPopulateAnnualAmounts_SumsMonthlyIncomeForYear(t *testing.T) {
	// Create 12 months of data for 2025 with an income that grows
	months := make([]MonthDetailResponse, 12)
	baseAmount := 1000.0

	for i := 0; i < 12; i++ {
		// Simulate monthly growth: amount increases slightly each month
		monthlyAmount := baseAmount + float64(i)*10 // 1000, 1010, 1020, ..., 1110
		amt := decimal.MustFromFloat64(monthlyAmount)
		adjAmt := decimal.MustFromFloat64(monthlyAmount * 1.1) // 10% scenario increase

		months[i] = MonthDetailResponse{
			Year:  2025,
			Month: i + 1,
			Income: []IncomeResponse{
				{
					ID:             "income-1",
					Name:           "Salary",
					Amount:         *amt,
					EventAdjAmount: *adjAmt,
				},
			},
		}
	}

	// Call the function
	populateAnnualAmounts(months)

	// Expected annual total: 1000+1010+1020+...+1110 = 12*1000 + 10*(0+1+2+...+11) = 12000 + 10*66 = 12660
	expectedAnnual := 12660.0
	expectedAdjAnnual := expectedAnnual * 1.1

	// Check that all months have the same annual amount
	for i, m := range months {
		if len(m.Income) != 1 {
			t.Fatalf("Month %d: expected 1 income, got %d", i+1, len(m.Income))
		}

		annualFloat := m.Income[0].AnnualAmount.ToFloat64()
		if annualFloat != expectedAnnual {
			t.Errorf("Month %d: expected AnnualAmount %.2f, got %.2f", i+1, expectedAnnual, annualFloat)
		}

		adjAnnualFloat := m.Income[0].EventAdjAnnualAmount.ToFloat64()
		if int(adjAnnualFloat) != int(expectedAdjAnnual) {
			t.Errorf("Month %d: expected EventAdjAnnualAmount %.2f, got %.2f", i+1, expectedAdjAnnual, adjAnnualFloat)
		}
	}
}

func TestPopulateAnnualAmounts_SumsMonthlyExpenseForYear(t *testing.T) {
	// Create 12 months of data for 2025 with an expense
	months := make([]MonthDetailResponse, 12)

	for i := 0; i < 12; i++ {
		monthlyAmount := 500.0
		amt := decimal.MustFromFloat64(monthlyAmount)
		adjAmt := decimal.MustFromFloat64(monthlyAmount * 0.9) // 10% scenario decrease

		months[i] = MonthDetailResponse{
			Year:  2025,
			Month: i + 1,
			Expenses: []ExpenseResponse{
				{
					ID:             "expense-1",
					Name:           "Rent",
					Amount:         *amt,
					EventAdjAmount: *adjAmt,
				},
			},
		}
	}

	populateAnnualAmounts(months)

	// Expected: 500 * 12 = 6000
	expectedAnnual := 6000.0
	expectedAdjAnnual := 6000.0 * 0.9

	for i, m := range months {
		if len(m.Expenses) != 1 {
			t.Fatalf("Month %d: expected 1 expense, got %d", i+1, len(m.Expenses))
		}

		annualFloat := m.Expenses[0].AnnualAmount.ToFloat64()
		if annualFloat != expectedAnnual {
			t.Errorf("Month %d: expected AnnualAmount %.2f, got %.2f", i+1, expectedAnnual, annualFloat)
		}

		adjAnnualFloat := m.Expenses[0].EventAdjAnnualAmount.ToFloat64()
		if int(adjAnnualFloat) != int(expectedAdjAnnual) {
			t.Errorf("Month %d: expected EventAdjAnnualAmount %.2f, got %.2f", i+1, expectedAdjAnnual, adjAnnualFloat)
		}
	}
}

func TestPopulateAnnualAmounts_SeparateYearsCalculatedIndependently(t *testing.T) {
	// Create 24 months spanning 2025 and 2026
	months := make([]MonthDetailResponse, 24)

	for i := 0; i < 24; i++ {
		year := 2025
		month := i + 1
		if i >= 12 {
			year = 2026
			month = i - 11
		}

		// Different amounts per year: 1000 in 2025, 2000 in 2026
		monthlyAmount := 1000.0
		if year == 2026 {
			monthlyAmount = 2000.0
		}

		amt := decimal.MustFromFloat64(monthlyAmount)

		months[i] = MonthDetailResponse{
			Year:  year,
			Month: month,
			Income: []IncomeResponse{
				{
					ID:             "income-1",
					Name:           "Salary",
					Amount:         *amt,
					EventAdjAmount: *amt,
				},
			},
		}
	}

	populateAnnualAmounts(months)

	// Check 2025 months have annual = 12000
	for i := 0; i < 12; i++ {
		annualFloat := months[i].Income[0].AnnualAmount.ToFloat64()
		if annualFloat != 12000.0 {
			t.Errorf("2025 Month %d: expected AnnualAmount 12000, got %.2f", i+1, annualFloat)
		}
	}

	// Check 2026 months have annual = 24000
	for i := 12; i < 24; i++ {
		annualFloat := months[i].Income[0].AnnualAmount.ToFloat64()
		if annualFloat != 24000.0 {
			t.Errorf("2026 Month %d: expected AnnualAmount 24000, got %.2f", months[i].Month, annualFloat)
		}
	}
}

func TestPopulateAnnualAmounts_MultipleItemsTrackedSeparately(t *testing.T) {
	// Create 12 months with two different incomes
	months := make([]MonthDetailResponse, 12)

	for i := 0; i < 12; i++ {
		amt1 := decimal.MustFromFloat64(1000.0)
		amt2 := decimal.MustFromFloat64(500.0)

		months[i] = MonthDetailResponse{
			Year:  2025,
			Month: i + 1,
			Income: []IncomeResponse{
				{
					ID:             "income-1",
					Name:           "Salary",
					Amount:         *amt1,
					EventAdjAmount: *amt1,
				},
				{
					ID:             "income-2",
					Name:           "Side Gig",
					Amount:         *amt2,
					EventAdjAmount: *amt2,
				},
			},
		}
	}

	populateAnnualAmounts(months)

	// Check first month (representative of all months in year)
	m := months[0]

	// Income-1 should have annual = 12000
	if m.Income[0].AnnualAmount.ToFloat64() != 12000.0 {
		t.Errorf("Income-1: expected AnnualAmount 12000, got %.2f", m.Income[0].AnnualAmount.ToFloat64())
	}

	// Income-2 should have annual = 6000
	if m.Income[1].AnnualAmount.ToFloat64() != 6000.0 {
		t.Errorf("Income-2: expected AnnualAmount 6000, got %.2f", m.Income[1].AnnualAmount.ToFloat64())
	}
}

func TestPopulateAnnualAmounts_PartialYear(t *testing.T) {
	// Create only 6 months of data (Jan-Jun 2025)
	// This simulates an item that starts mid-year
	months := make([]MonthDetailResponse, 6)

	for i := 0; i < 6; i++ {
		amt := decimal.MustFromFloat64(1000.0)

		months[i] = MonthDetailResponse{
			Year:  2025,
			Month: i + 1,
			Income: []IncomeResponse{
				{
					ID:             "income-1",
					Name:           "Salary",
					Amount:         *amt,
					EventAdjAmount: *amt,
				},
			},
		}
	}

	populateAnnualAmounts(months)

	// Annual amount should be sum of available months: 6 * 1000 = 6000
	for i, m := range months {
		annualFloat := m.Income[0].AnnualAmount.ToFloat64()
		if annualFloat != 6000.0 {
			t.Errorf("Month %d: expected AnnualAmount 6000, got %.2f", i+1, annualFloat)
		}
	}
}

func TestPopulateAnnualAmounts_ScenarioImpactMidYear(t *testing.T) {
	// Simulate a scenario that changes income mid-year (e.g., promotion in July)
	months := make([]MonthDetailResponse, 12)

	for i := 0; i < 12; i++ {
		baseAmount := 5000.0
		adjAmount := 5000.0
		if i >= 6 { // July onwards: scenario gives 20% raise
			adjAmount = 6000.0
		}

		amt := decimal.MustFromFloat64(baseAmount)
		adjAmt := decimal.MustFromFloat64(adjAmount)

		months[i] = MonthDetailResponse{
			Year:  2025,
			Month: i + 1,
			Income: []IncomeResponse{
				{
					ID:             "income-1",
					Name:           "Salary",
					Amount:         *amt,
					EventAdjAmount: *adjAmt,
				},
			},
		}
	}

	populateAnnualAmounts(months)

	// Base annual: 5000 * 12 = 60000
	// Adjusted annual: 5000 * 6 + 6000 * 6 = 30000 + 36000 = 66000
	expectedAnnual := 60000.0
	expectedAdjAnnual := 66000.0

	m := months[0]
	if m.Income[0].AnnualAmount.ToFloat64() != expectedAnnual {
		t.Errorf("Expected AnnualAmount %.2f, got %.2f", expectedAnnual, m.Income[0].AnnualAmount.ToFloat64())
	}
	if m.Income[0].EventAdjAnnualAmount.ToFloat64() != expectedAdjAnnual {
		t.Errorf("Expected EventAdjAnnualAmount %.2f, got %.2f", expectedAdjAnnual, m.Income[0].EventAdjAnnualAmount.ToFloat64())
	}
}

func TestPopulateAnnualAmounts_EmptyMonths(t *testing.T) {
	// Test with empty slice - should not panic
	months := []MonthDetailResponse{}
	populateAnnualAmounts(months) // Should not panic

	// Test with months but no income/expenses
	months = []MonthDetailResponse{
		{Year: 2025, Month: 1},
		{Year: 2025, Month: 2},
	}
	populateAnnualAmounts(months) // Should not panic
}
