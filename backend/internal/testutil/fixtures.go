//go:build e2e
// +build e2e

package testutil

import (
	"context"
	"testing"
	"time"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/repository"
	"financial-chat-system/backend/internal/financial_v2/scenario"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// Fixture creation helpers for E2E tests
// These helpers create test data directly via SQL for maximum control

// CreateAssetFixture creates a test asset using direct SQL.
func CreateAssetFixture(t *testing.T, pool *pgxpool.Pool, userID, name string) string {
	t.Helper()
	ctx := context.Background()

	var id string
	err := pool.QueryRow(ctx, `
		INSERT INTO finance_assets (user_id, name, category, current_value, growth_rate, start_date, growth_strategy)
		VALUES ($1, $2, 'real_estate', 100000, 3.5, '2025-01-01', 'compound_monthly')
		RETURNING id
	`, userID, name).Scan(&id)
	require.NoError(t, err, "failed to create asset fixture")
	return id
}

// CreateLiabilityFixture creates a test liability using direct SQL.
func CreateLiabilityFixture(t *testing.T, pool *pgxpool.Pool, userID, name string) string {
	t.Helper()
	ctx := context.Background()

	var id string
	err := pool.QueryRow(ctx, `
		INSERT INTO finance_liabilities (user_id, name, category, current_balance, interest_rate_apr, minimum_payment, start_date, repayment_strategy)
		VALUES ($1, $2, 'mortgage', 250000, 4.5, 1500, '2025-01-01', 'standard_amortization')
		RETURNING id
	`, userID, name).Scan(&id)
	require.NoError(t, err, "failed to create liability fixture")
	return id
}

// CreateIncomeFixture creates a test income using direct SQL.
func CreateIncomeFixture(t *testing.T, pool *pgxpool.Pool, userID, name string) string {
	t.Helper()
	ctx := context.Background()

	var id string
	err := pool.QueryRow(ctx, `
		INSERT INTO finance_incomes (user_id, name, amount, frequency, category, start_date, growth_rate, growth_strategy, income_type, cpf_wage_type)
		VALUES ($1, $2, 5000, 'monthly', 'salary', '2025-01-01', 3.0, 'annual_step', 'salary', 'ow')
		RETURNING id
	`, userID, name).Scan(&id)
	require.NoError(t, err, "failed to create income fixture")
	return id
}

// CreateExpenseFixture creates a test expense using direct SQL.
func CreateExpenseFixture(t *testing.T, pool *pgxpool.Pool, userID, name string) string {
	t.Helper()
	ctx := context.Background()

	var id string
	err := pool.QueryRow(ctx, `
		INSERT INTO finance_expenses (user_id, name, amount, frequency, category, start_date, growth_rate, growth_strategy)
		VALUES ($1, $2, 500, 'monthly', 'utilities', '2025-01-01', 2.0, 'annual_step')
		RETURNING id
	`, userID, name).Scan(&id)
	require.NoError(t, err, "failed to create expense fixture")
	return id
}

// CreateInvestmentFixture creates a test investment using direct SQL.
func CreateInvestmentFixture(t *testing.T, pool *pgxpool.Pool, userID, name string) string {
	t.Helper()
	ctx := context.Background()

	var id string
	err := pool.QueryRow(ctx, `
		INSERT INTO finance_investments (user_id, name, category, current_value, growth_rate, start_date, growth_strategy)
		VALUES ($1, $2, 'stocks', 50000, 7.0, '2025-01-01', 'compound_monthly')
		RETURNING id
	`, userID, name).Scan(&id)
	require.NoError(t, err, "failed to create investment fixture")
	return id
}

// CreateCashAccountFixture creates a test cash account using direct SQL.
func CreateCashAccountFixture(t *testing.T, pool *pgxpool.Pool, userID, name string) string {
	t.Helper()
	ctx := context.Background()

	var id string
	err := pool.QueryRow(ctx, `
		INSERT INTO finance_cash_accounts (user_id, name, balance, interest_rate, bank_name, account_type, is_accumulator, start_date)
		VALUES ($1, $2, 10000, 2.0, 'Test Bank', 'savings', false, '2025-01-01')
		RETURNING id
	`, userID, name).Scan(&id)
	require.NoError(t, err, "failed to create cash account fixture")
	return id
}

// CreateScenarioEventFixture creates a test scenario event using the repository store.
func CreateScenarioEventFixture(t *testing.T, store *repository.Store, userID, name string) scenario.Event {
	t.Helper()
	ctx := context.Background()

	event, err := store.CreateScenarioEventV2(ctx, scenario.Event{
		UserID:      userID,
		Name:        name,
		OccursOn:    time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC),
		IsIncluded:  true,
		Description: "Test scenario event",
		DisplayIcon: "calendar",
	})
	require.NoError(t, err, "failed to create scenario event fixture")
	return event
}

// CreateCPFAccountFixture creates a test CPF account using direct SQL.
func CreateCPFAccountFixture(t *testing.T, pool *pgxpool.Pool, userID string) string {
	t.Helper()
	ctx := context.Background()

	var id string
	err := pool.QueryRow(ctx, `
		INSERT INTO cpf_accounts (user_id, oa_balance, sa_balance, ma_balance, ra_balance, date_of_birth, residency_status, start_date)
		VALUES ($1, 50000, 30000, 20000, 0, '1990-01-01', 'citizen', '2025-01-01')
		RETURNING id
	`, userID).Scan(&id)
	require.NoError(t, err, "failed to create CPF account fixture")
	return id
}

// CreateIncomeAllocationFixture creates a test income allocation using direct SQL.
func CreateIncomeAllocationFixture(t *testing.T, pool *pgxpool.Pool, incomeID string, targetInvestmentID *string, targetCashAccountID *string) string {
	t.Helper()
	ctx := context.Background()

	var id string
	err := pool.QueryRow(ctx, `
		INSERT INTO income_allocations (income_id, target_investment_id, target_cash_account_id, allocation_type, allocation_value, start_date)
		VALUES ($1, $2, $3, 'percentage', 50, '2025-01-01')
		RETURNING id
	`, incomeID, targetInvestmentID, targetCashAccountID).Scan(&id)
	require.NoError(t, err, "failed to create income allocation fixture")
	return id
}

// CreateAssetFixtureWithStore creates a test asset using the repository store.
func CreateAssetFixtureWithStore(t *testing.T, store *repository.Store, userID, name string) repository.NonCashAsset {
	t.Helper()
	ctx := context.Background()

	currentValue, _ := decimal.NewFromString("100000")
	growthRate, _ := decimal.NewFromString("3.5")

	asset, err := store.CreateNonCashAsset(ctx, userID, repository.NonCashAsset{
		Name:             name,
		Category:         "real_estate",
		CurrentValue:     *currentValue,
		AnnualGrowthRate: *growthRate,
		StartDate:        time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
		GrowthStrategy:   "compound_monthly",
	})
	require.NoError(t, err, "failed to create asset fixture")
	return asset
}

// CreateLiabilityFixtureWithStore creates a test liability using the repository store.
func CreateLiabilityFixtureWithStore(t *testing.T, store *repository.Store, userID, name string) repository.Liability {
	t.Helper()
	ctx := context.Background()

	balance, _ := decimal.NewFromString("250000")
	interestRate, _ := decimal.NewFromString("4.5")
	minPayment, _ := decimal.NewFromString("1500")

	liability, err := store.CreateLiability(ctx, userID, repository.Liability{
		Name:              name,
		Category:          "mortgage",
		CurrentBalance:    *balance,
		InterestRateAPR:   *interestRate,
		MinimumPayment:    *minPayment,
		StartDate:         time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
		RepaymentStrategy: "standard_amortization",
	})
	require.NoError(t, err, "failed to create liability fixture")
	return liability
}

// CreateIncomeFixtureWithStore creates a test income using the repository store.
func CreateIncomeFixtureWithStore(t *testing.T, store *repository.Store, userID, name string) repository.Income {
	t.Helper()
	ctx := context.Background()

	amount, _ := decimal.NewFromString("5000")
	growthRate, _ := decimal.NewFromString("3.0")

	income, err := store.CreateIncome(ctx, userID, repository.Income{
		Name:           name,
		Amount:         *amount,
		Frequency:      "monthly",
		Category:       "salary",
		StartDate:      time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
		GrowthRate:     *growthRate,
		GrowthStrategy: "annual_step",
		IncomeType:     "salary",
		CPFWageType:    "ow",
	})
	require.NoError(t, err, "failed to create income fixture")
	return income
}

// CreateExpenseFixtureWithStore creates a test expense using the repository store.
func CreateExpenseFixtureWithStore(t *testing.T, store *repository.Store, userID, name string) repository.Expense {
	t.Helper()
	ctx := context.Background()

	amount, _ := decimal.NewFromString("500")
	growthRate, _ := decimal.NewFromString("2.0")

	expense, err := store.CreateExpense(ctx, userID, repository.Expense{
		Name:           name,
		Amount:         *amount,
		Frequency:      "monthly",
		Category:       "utilities",
		StartDate:      time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
		GrowthRate:     *growthRate,
		GrowthStrategy: "annual_step",
	})
	require.NoError(t, err, "failed to create expense fixture")
	return expense
}

// CreateInvestmentFixtureWithStore creates a test investment using the repository store.
func CreateInvestmentFixtureWithStore(t *testing.T, store *repository.Store, userID, name string) repository.Investment {
	t.Helper()
	ctx := context.Background()

	currentValue, _ := decimal.NewFromString("50000")
	growthRate, _ := decimal.NewFromString("7.0")

	investment, err := store.CreateInvestment(ctx, userID, repository.Investment{
		Name:           name,
		Category:       "stocks",
		CurrentValue:   *currentValue,
		GrowthRate:     *growthRate,
		StartDate:      time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
		GrowthStrategy: "compound_monthly",
	})
	require.NoError(t, err, "failed to create investment fixture")
	return investment
}
