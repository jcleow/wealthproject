package repository

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"runtime"
	"strings"
	"time"

	"financial-chat-system/backend/internal/decimal"
)

// DebugSQL enables SQL query logging when set to true
var DebugSQL = false

type Store struct {
	db *sql.DB
}

// NewStore creates a new repository Store
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// logQuery prints the SQL query and args if DebugSQL is enabled
func logQuery(query string, args []any) {
	if !DebugSQL {
		return
	}
	pc, _, _, _ := runtime.Caller(1)
	funcName := runtime.FuncForPC(pc).Name()

	// Substitute placeholders with actual values
	substituted := query
	for i, arg := range args {
		placeholder := fmt.Sprintf("$%d", i+1)
		var value string
		switch v := arg.(type) {
		case string:
			value = fmt.Sprintf("'%s'", v)
		case time.Time:
			value = fmt.Sprintf("'%s'", v.Format("02-01-2006"))
		default:
			value = fmt.Sprintf("%v", v)
		}
		substituted = strings.Replace(substituted, placeholder, value, 1)
	}

	log.Printf("[SQL] %s\n%s\n", funcName, substituted)
}

// PaginationParams holds pagination parameters for list queries.
type PaginationParams struct {
	Limit  *int
	Offset *int
}

// PaginatedResult holds paginated list results with metadata.
type PaginatedResult[T any] struct {
	Data   []T  `json:"data"`
	Count  int  `json:"count"`
	Limit  *int `json:"limit"`
	Offset *int `json:"offset"`
}

// Structs for Domain entities

type NonCashAsset struct {
	ID               string          `json:"id"`
	ParentID         string          `json:"parentId"`
	Name             string          `json:"name"`
	Category         string          `json:"category"`
	CurrentValue     decimal.Decimal `json:"currentValue"`
	AnnualGrowthRate decimal.Decimal `json:"annualGrowthRate"`
	StartDate        time.Time       `json:"startDate"`         // Precise start date (day-level)
	EndDate          *time.Time      `json:"endDate,omitempty"` // NULL means ongoing
	Notes            string          `json:"notes"`
	GrowthStrategy   string          `json:"growthStrategy"`
	UpdatedAt        time.Time       `json:"updatedAt"`
}

// Investment mirrors NonCashAsset but lives in finance_investments
type Investment struct {
	ID               string          `json:"id"`
	ParentID         string          `json:"parentId"`
	Name             string          `json:"name"`
	Category         string          `json:"category"`
	CurrentValue     decimal.Decimal `json:"currentValue"`
	AnnualGrowthRate decimal.Decimal `json:"annualGrowthRate"`
	StartDate        time.Time       `json:"startDate"`         // Precise start date (day-level)
	EndDate          *time.Time      `json:"endDate,omitempty"` // NULL means ongoing
	Notes            string          `json:"notes"`
	GrowthStrategy   string          `json:"growthStrategy"`
	UpdatedAt        time.Time       `json:"updatedAt"`
}

type CashAsset struct {
	ID             string          `json:"id"`
	UserID         string          `json:"userId"`
	Name           string          `json:"name"`
	Balance        decimal.Decimal `json:"balance"`
	InterestRate   decimal.Decimal `json:"interestRate"`
	BankName       string          `json:"bankName,omitempty"`
	AccountType    string          `json:"accountType,omitempty"` // 'checking', 'savings', 'money_market'
	IsAccumulator  bool            `json:"isAccumulator"`
	StartDate      time.Time       `json:"startDate"`         // Precise start date (day-level)
	EndDate        *time.Time      `json:"endDate,omitempty"` // NULL means ongoing
	Notes          string          `json:"notes,omitempty"`
	GrowthStrategy string          `json:"growthStrategy"`
	CreatedAt      time.Time       `json:"createdAt"`
	UpdatedAt      time.Time       `json:"updatedAt"`
}

// Liability represents a persisted liability record.
type Liability struct {
	ID                string          `json:"id"`
	ParentID          string          `json:"parentId"`
	Name              string          `json:"name"`
	Category          string          `json:"category"`
	CurrentBalance    decimal.Decimal `json:"currentBalance"`
	InterestRateAPR   decimal.Decimal `json:"interestRateApr"`
	MinimumPayment    decimal.Decimal `json:"minimumPayment"`
	StartDate         time.Time       `json:"startDate"`         // Precise start date (day-level)
	EndDate           *time.Time      `json:"endDate,omitempty"` // NULL means ongoing
	Notes             string          `json:"notes"`
	GrowthStrategy    string          `json:"growthStrategy"`
	RepaymentStrategy string          `json:"repaymentStrategy"`
	UpdatedAt         time.Time       `json:"updatedAt"`
}

// Income represents a persisted income record.
type Income struct {
	ID             string          `json:"id"`
	ParentID       string          `json:"parentId"`
	Source         string          `json:"source"`
	Amount         decimal.Decimal `json:"amount"`
	Frequency      string          `json:"frequency"`
	StartDate      time.Time       `json:"startDate"`         // Precise start date (day-level) - now required
	EndDate        *time.Time      `json:"endDate,omitempty"` // NULL means ongoing
	Category       string          `json:"category"`
	GrowthRate     decimal.Decimal `json:"growthRate"`
	Notes          string          `json:"notes"`
	GrowthStrategy string          `json:"growthStrategy"`
	UpdatedAt      time.Time       `json:"updatedAt"`
	// CPF-related fields
	IncomeType  string `json:"incomeType"`  // 'salary', 'bonus', 'commission', 'rental', 'dividend', 'freelance', 'other'
	CPFWageType string `json:"cpfWageType"` // 'ow' (Ordinary Wages) or 'aw' (Additional Wages)
}

// Expense represents a persisted expense record.
type Expense struct {
	ID                string          `json:"id"`
	ParentID          string          `json:"parentId"`
	Payee             string          `json:"payee"`
	Amount            decimal.Decimal `json:"amount"`
	Frequency         string          `json:"frequency"`
	StartDate         time.Time       `json:"startDate"`         // Precise start date (day-level)
	EndDate           *time.Time      `json:"endDate,omitempty"` // NULL means ongoing
	Category          string          `json:"category"`
	GrowthRate        decimal.Decimal `json:"growthRate"`
	Notes             string          `json:"notes"`
	GrowthStrategy    string          `json:"growthStrategy"`
	UpdatedAt         time.Time       `json:"updatedAt"`
	SourceLiabilityID *string         `json:"sourceLiabilityId,omitempty"` // Link to liability this expense pays down
}

// CPFAccount represents a user's CPF account with balances and profile data.
type CPFAccount struct {
	ID               string          `json:"id"`
	UserID           string          `json:"userId"`
	OABalance        decimal.Decimal `json:"oaBalance"`        // Ordinary Account balance
	SABalance        decimal.Decimal `json:"saBalance"`        // Special Account balance
	MABalance        decimal.Decimal `json:"maBalance"`        // MediSave Account balance
	RABalance        decimal.Decimal `json:"raBalance"`        // Retirement Account balance (only after age 55)
	OAUsedForHousing decimal.Decimal `json:"oaUsedForHousing"` // OA amount used for housing (for accrued interest)
	HousingStartDate *time.Time      `json:"housingStartDate,omitempty"`
	DateOfBirth      time.Time       `json:"dateOfBirth"`
	ResidencyStatus  string          `json:"residencyStatus"` // 'citizen', 'pr_year_1', 'pr_year_2', 'pr_year_3_plus'
	PRGrantDate      *time.Time      `json:"prGrantDate,omitempty"`
	CreatedAt        time.Time       `json:"createdAt"`
	UpdatedAt        time.Time       `json:"updatedAt"`
}

type DateRangeOptions struct {
	StartDate *time.Time // Filter items where start_date >= this
	EndDate   *time.Time // Filter items where start_date <= this
}

func addDateRangeFilterQuery(opts DateRangeOptions, argIdx int) (string, int) {
	dateRangeSubquery := []string{}

	if opts.StartDate != nil {
		dateRangeSubquery = append(dateRangeSubquery, fmt.Sprintf(`start_date >= $%d`, argIdx))
		argIdx++
	}
	if opts.EndDate != nil {
		dateRangeSubquery = append(dateRangeSubquery, fmt.Sprintf(`start_date < $%d`, argIdx))
		argIdx++
	}

	subQuery := strings.Join(dateRangeSubquery, " AND ")

	return subQuery, argIdx
}

func addPaginationQuery(
	pagination PaginationParams,
	argIdx int,
) (string, int) {
	paginationSubquery := []string{}

	if pagination.Limit != nil {
		paginationSubquery = append(paginationSubquery, fmt.Sprintf(`LIMIT $%d `, argIdx))
		argIdx += 1
	}

	if pagination.Offset != nil {
		paginationSubquery = append(paginationSubquery, fmt.Sprintf(`OFFSET $%d `, argIdx))
		argIdx += 1
	}

	subQuery := strings.Join(paginationSubquery, " ")

	return subQuery, argIdx
}

func (s *Store) ListNonCashAssets(
	ctx context.Context,
	userID string,
	dateRangeOpts DateRangeOptions,
	pagination PaginationParams,
) (PaginatedResult[NonCashAsset], error) {
	query := `
	SELECT id,
		COALESCE(parent_id, id) as parent_id,
		name,
		category,
		current_value,
		annual_growth_rate,
		start_date,
		end_date,
		COALESCE(notes, '') as notes,
		updated_at
	FROM finance_assets
	WHERE user_id = $1	
	`

	args := []any{userID}
	argIdx := 2 // i.e start 2

	// Add dynamic date range filtering
	dateRangeSubQuery, argIdx := addDateRangeFilterQuery(dateRangeOpts, argIdx)
	if dateRangeSubQuery != "" {
		query += " AND " + dateRangeSubQuery
		if dateRangeOpts.StartDate != nil {
			args = append(args, *dateRangeOpts.StartDate)
		}
		if dateRangeOpts.EndDate != nil {
			args = append(args, *dateRangeOpts.EndDate)
		}
	}

	query += ` ORDER BY parent_id, start_date`

	// Add pagination
	paginationSubQuery, _ := addPaginationQuery(pagination, argIdx)
	if paginationSubQuery != "" {
		query += " " + paginationSubQuery
		if pagination.Limit != nil {
			args = append(args, *pagination.Limit)
		}
		if pagination.Offset != nil {
			args = append(args, *pagination.Offset)
		}
	}

	logQuery(query, args)
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		fmt.Printf("Failed to query for non cash assets")
		fmt.Printf(query, "=== query\n ===")
		return PaginatedResult[NonCashAsset]{
			Data:   []NonCashAsset{},
			Count:  0,
			Limit:  nil,
			Offset: nil,
		}, err
	}

	defer rows.Close()

	nonCashAssets := []NonCashAsset{}
	for rows.Next() {
		var a NonCashAsset
		var endDate sql.NullTime

		err := rows.Scan(&a.ID, &a.ParentID, &a.Name, &a.Category, &a.CurrentValue, &a.AnnualGrowthRate, &a.StartDate, &endDate, &a.Notes, &a.UpdatedAt)
		if err != nil {
			return PaginatedResult[NonCashAsset]{}, err
		}

		if endDate.Valid {
			a.EndDate = &endDate.Time
		}

		nonCashAssets = append(nonCashAssets, a)
	}

	return PaginatedResult[NonCashAsset]{
		Data:   nonCashAssets,
		Count:  len(nonCashAssets),
		Limit:  pagination.Limit,
		Offset: pagination.Offset,
	}, nil
}

func (s *Store) ListInvestments(
	ctx context.Context,
	userID string,
	dateRangeOpts DateRangeOptions,
	pagination PaginationParams,
) (PaginatedResult[Investment], error) {
	query := `
	SELECT id,
		COALESCE(parent_id, id) as parent_id,
		name,
		category,
		current_value,
		annual_growth_rate,
		start_date,
		end_date,
		COALESCE(notes, '') as notes,
		updated_at
	FROM finance_investments
	WHERE user_id = $1	
	`

	args := []any{userID}
	argIdx := 2

	dateRangeSubQuery, argIdx := addDateRangeFilterQuery(dateRangeOpts, argIdx)
	if dateRangeSubQuery != "" {
		query += " AND " + dateRangeSubQuery
		if dateRangeOpts.StartDate != nil {
			args = append(args, *dateRangeOpts.StartDate)
		}
		if dateRangeOpts.EndDate != nil {
			args = append(args, *dateRangeOpts.EndDate)
		}
	}

	query += ` ORDER BY parent_id, start_date`

	paginationSubQuery, _ := addPaginationQuery(pagination, argIdx)
	if paginationSubQuery != "" {
		query += " " + paginationSubQuery
		if pagination.Limit != nil {
			args = append(args, *pagination.Limit)
		}
		if pagination.Offset != nil {
			args = append(args, *pagination.Offset)
		}
	}

	logQuery(query, args)
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		fmt.Printf("Failed to query investments")
		return PaginatedResult[Investment]{
			Data:   []Investment{},
			Count:  0,
			Limit:  nil,
			Offset: nil,
		}, err
	}
	defer rows.Close()

	investments := []Investment{}
	for rows.Next() {
		var inv Investment
		var endDate sql.NullTime

		err := rows.Scan(&inv.ID, &inv.ParentID, &inv.Name, &inv.Category, &inv.CurrentValue, &inv.AnnualGrowthRate, &inv.StartDate, &endDate, &inv.Notes, &inv.UpdatedAt)
		if err != nil {
			return PaginatedResult[Investment]{}, err
		}

		if endDate.Valid {
			inv.EndDate = &endDate.Time
		}

		investments = append(investments, inv)
	}

	return PaginatedResult[Investment]{
		Data:   investments,
		Count:  len(investments),
		Limit:  pagination.Limit,
		Offset: pagination.Offset,
	}, nil
}

func (s *Store) ListCashAssets(
	ctx context.Context,
	userID string,
	dateRangeOpts DateRangeOptions,
	pagination PaginationParams,
) (PaginatedResult[CashAsset], error) {
	query := `
	SELECT id,
		user_id,
		name,
		balance,
		interest_rate,
		COALESCE(bank_name, '') as bank_name,
		COALESCE(account_type, '') as account_type,
		is_accumulator,
		start_date,
		end_date,
		COALESCE(notes, '') as notes,
	COALESCE(growth_strategy, '') as growth_strategy,
	created_at,
	updated_at
FROM finance_cash_accounts
WHERE user_id = $1`

	args := []any{userID}
	argIdx := 2

	// Add dynamic date range filtering
	dateRangeSubQuery, argIdx := addDateRangeFilterQuery(dateRangeOpts, argIdx)
	if dateRangeSubQuery != "" {
		query += " AND " + dateRangeSubQuery
		if dateRangeOpts.StartDate != nil {
			args = append(args, *dateRangeOpts.StartDate)
		}
		if dateRangeOpts.EndDate != nil {
			args = append(args, *dateRangeOpts.EndDate)
		}
	}

	query += ` ORDER BY created_at`

	// Add pagination
	paginationSubQuery, _ := addPaginationQuery(pagination, argIdx)
	if paginationSubQuery != "" {
		query += " " + paginationSubQuery
		if pagination.Limit != nil {
			args = append(args, *pagination.Limit)
		}
		if pagination.Offset != nil {
			args = append(args, *pagination.Offset)
		}
	}

	logQuery(query, args)
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		fmt.Printf("Failed to query cash assets: %v\n", err)
		return PaginatedResult[CashAsset]{}, err
	}
	defer rows.Close()

	cashAssets := []CashAsset{}
	for rows.Next() {
		var a CashAsset
		var endDate sql.NullTime

		err := rows.Scan(
			&a.ID, &a.UserID, &a.Name, &a.Balance, &a.InterestRate,
			&a.BankName, &a.AccountType, &a.IsAccumulator,
			&a.StartDate, &endDate, &a.Notes, &a.GrowthStrategy,
			&a.CreatedAt, &a.UpdatedAt,
		)
		if err != nil {
			return PaginatedResult[CashAsset]{}, err
		}

		if endDate.Valid {
			a.EndDate = &endDate.Time
		}

		cashAssets = append(cashAssets, a)
	}

	return PaginatedResult[CashAsset]{
		Data:   cashAssets,
		Count:  len(cashAssets),
		Limit:  pagination.Limit,
		Offset: pagination.Offset,
	}, nil
}

func (s *Store) ListLiabilities(
	ctx context.Context,
	userID string,
	dateRangeOpts DateRangeOptions,
	pagination PaginationParams,
) (PaginatedResult[Liability], error) {
	query := `
	SELECT id,
		COALESCE(parent_id, id) as parent_id,
		name,
		category,
		current_balance,
		interest_rate_apr,
		minimum_payment,
		start_date,
		end_date,
		COALESCE(notes, '') as notes,
		COALESCE(growth_strategy, '') as growth_strategy,
		COALESCE(repayment_strategy, 'standard_amortization') as repayment_strategy,
		updated_at
	FROM finance_liabilities
	WHERE user_id = $1`

	args := []any{userID}
	argIdx := 2

	// Add dynamic date range filtering
	dateRangeSubQuery, argIdx := addDateRangeFilterQuery(dateRangeOpts, argIdx)
	if dateRangeSubQuery != "" {
		query += " AND " + dateRangeSubQuery
		if dateRangeOpts.StartDate != nil {
			args = append(args, *dateRangeOpts.StartDate)
		}
		if dateRangeOpts.EndDate != nil {
			args = append(args, *dateRangeOpts.EndDate)
		}
	}

	query += ` ORDER BY parent_id, start_date`

	// Add pagination
	paginationSubQuery, _ := addPaginationQuery(pagination, argIdx)
	if paginationSubQuery != "" {
		query += " " + paginationSubQuery
		if pagination.Limit != nil {
			args = append(args, *pagination.Limit)
		}
		if pagination.Offset != nil {
			args = append(args, *pagination.Offset)
		}
	}

	logQuery(query, args)
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		fmt.Printf("Failed to query liabilities: %v\n", err)
		return PaginatedResult[Liability]{}, err
	}
	defer rows.Close()

	liabilities := []Liability{}
	for rows.Next() {
		var l Liability
		var endDate sql.NullTime

		err := rows.Scan(
			&l.ID, &l.ParentID, &l.Name, &l.Category,
			&l.CurrentBalance, &l.InterestRateAPR, &l.MinimumPayment,
			&l.StartDate, &endDate, &l.Notes, &l.GrowthStrategy,
			&l.RepaymentStrategy, &l.UpdatedAt,
		)
		if err != nil {
			return PaginatedResult[Liability]{}, err
		}

		if endDate.Valid {
			l.EndDate = &endDate.Time
		}

		liabilities = append(liabilities, l)
	}

	return PaginatedResult[Liability]{
		Data:   liabilities,
		Count:  len(liabilities),
		Limit:  pagination.Limit,
		Offset: pagination.Offset,
	}, nil
}

func (s *Store) ListIncomes(
	ctx context.Context,
	userID string,
	dateRangeOpts DateRangeOptions,
	pagination PaginationParams,
) (PaginatedResult[Income], error) {
	query := `
	SELECT id,
		COALESCE(parent_id, id) as parent_id,
		source,
		amount,
		frequency,
		start_date,
		end_date,
		category,
		growth_rate,
		COALESCE(notes, '') as notes,
		COALESCE(growth_strategy, '') as growth_strategy,
		updated_at,
		COALESCE(income_type, 'other') as income_type,
		COALESCE(cpf_wage_type, '') as cpf_wage_type
	FROM finance_incomes
	WHERE user_id = $1`

	args := []any{userID}
	argIdx := 2

	// Add dynamic date range filtering
	dateRangeSubQuery, argIdx := addDateRangeFilterQuery(dateRangeOpts, argIdx)
	if dateRangeSubQuery != "" {
		query += " AND " + dateRangeSubQuery
		if dateRangeOpts.StartDate != nil {
			args = append(args, *dateRangeOpts.StartDate)
		}
		if dateRangeOpts.EndDate != nil {
			args = append(args, *dateRangeOpts.EndDate)
		}
	}

	query += ` ORDER BY parent_id, start_date`

	// Add pagination
	paginationSubQuery, _ := addPaginationQuery(pagination, argIdx)
	if paginationSubQuery != "" {
		query += " " + paginationSubQuery
		if pagination.Limit != nil {
			args = append(args, *pagination.Limit)
		}
		if pagination.Offset != nil {
			args = append(args, *pagination.Offset)
		}
	}

	logQuery(query, args)
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		fmt.Printf("Failed to query incomes: %v\n", err)
		return PaginatedResult[Income]{}, err
	}
	defer rows.Close()

	incomes := []Income{}
	for rows.Next() {
		var i Income
		var endDate sql.NullTime

		err := rows.Scan(
			&i.ID, &i.ParentID, &i.Source, &i.Amount, &i.Frequency,
			&i.StartDate, &endDate, &i.Category, &i.GrowthRate,
			&i.Notes, &i.GrowthStrategy, &i.UpdatedAt,
			&i.IncomeType, &i.CPFWageType,
		)
		if err != nil {
			return PaginatedResult[Income]{}, err
		}

		if endDate.Valid {
			i.EndDate = &endDate.Time
		}

		incomes = append(incomes, i)
	}

	return PaginatedResult[Income]{
		Data:   incomes,
		Count:  len(incomes),
		Limit:  pagination.Limit,
		Offset: pagination.Offset,
	}, nil
}

func (s *Store) ListExpenses(
	ctx context.Context,
	userID string,
	dateRangeOpts DateRangeOptions,
	pagination PaginationParams,
) (PaginatedResult[Expense], error) {
	query := `
	SELECT id,
		COALESCE(parent_id, id) as parent_id,
		payee,
		amount,
		frequency,
		start_date,
		end_date,
		category,
		growth_rate,
		COALESCE(notes, '') as notes,
		COALESCE(growth_strategy, '') as growth_strategy,
		updated_at,
		source_liability_id
	FROM finance_expenses
	WHERE user_id = $1`

	args := []any{userID}
	argIdx := 2

	// Add dynamic date range filtering
	dateRangeSubQuery, argIdx := addDateRangeFilterQuery(dateRangeOpts, argIdx)
	if dateRangeSubQuery != "" {
		query += " AND " + dateRangeSubQuery
		if dateRangeOpts.StartDate != nil {
			args = append(args, *dateRangeOpts.StartDate)
		}
		if dateRangeOpts.EndDate != nil {
			args = append(args, *dateRangeOpts.EndDate)
		}
	}

	query += ` ORDER BY parent_id, start_date`

	// Add pagination
	paginationSubQuery, _ := addPaginationQuery(pagination, argIdx)
	if paginationSubQuery != "" {
		query += " " + paginationSubQuery
		if pagination.Limit != nil {
			args = append(args, *pagination.Limit)
		}
		if pagination.Offset != nil {
			args = append(args, *pagination.Offset)
		}
	}

	logQuery(query, args)
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		fmt.Printf("Failed to query expenses: %v\n", err)
		return PaginatedResult[Expense]{}, err
	}
	defer rows.Close()

	expenses := []Expense{}
	for rows.Next() {
		var e Expense
		var endDate sql.NullTime
		var sourceLiabilityID sql.NullString

		err := rows.Scan(
			&e.ID, &e.ParentID, &e.Payee, &e.Amount, &e.Frequency,
			&e.StartDate, &endDate, &e.Category, &e.GrowthRate,
			&e.Notes, &e.GrowthStrategy, &e.UpdatedAt, &sourceLiabilityID,
		)
		if err != nil {
			return PaginatedResult[Expense]{}, err
		}

		if endDate.Valid {
			e.EndDate = &endDate.Time
		}
		if sourceLiabilityID.Valid {
			e.SourceLiabilityID = &sourceLiabilityID.String
		}

		expenses = append(expenses, e)
	}

	return PaginatedResult[Expense]{
		Data:   expenses,
		Count:  len(expenses),
		Limit:  pagination.Limit,
		Offset: pagination.Offset,
	}, nil
}

// GetCPFAccount retrieves the CPF account for a user (one per user)
func (s *Store) GetCPFAccount(
	ctx context.Context,
	userID string,
) (*CPFAccount, error) {
	query := `
	SELECT
		id,
		user_id,
		oa_balance,
		sa_balance,
		ma_balance,
		ra_balance,
		oa_used_for_housing,
		housing_start_date,
		date_of_birth,
		residency_status,
		pr_grant_date,
		created_at,
		updated_at
	FROM cpf_accounts
	WHERE user_id = $1`

	var cpf CPFAccount
	var housingStartDate sql.NullTime
	var prGrantDate sql.NullTime

	err := s.db.QueryRowContext(ctx, query, userID).Scan(
		&cpf.ID,
		&cpf.UserID,
		&cpf.OABalance,
		&cpf.SABalance,
		&cpf.MABalance,
		&cpf.RABalance,
		&cpf.OAUsedForHousing,
		&housingStartDate,
		&cpf.DateOfBirth,
		&cpf.ResidencyStatus,
		&prGrantDate,
		&cpf.CreatedAt,
		&cpf.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil // No CPF account found for user
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query CPF account: %w", err)
	}

	if housingStartDate.Valid {
		cpf.HousingStartDate = &housingStartDate.Time
	}
	if prGrantDate.Valid {
		cpf.PRGrantDate = &prGrantDate.Time
	}

	return &cpf, nil
}

// ----- IncomeAllocation operations -----

// IncomeAllocation represents a destination allocation for an income.
// Income can be distributed to multiple cash_accounts or investments.
// Uses separate nullable FK columns for proper referential integrity.
type IncomeAllocation struct {
	ID                  string          `json:"id"`
	IncomeID            string          `json:"incomeId"`
	TargetCashAccountID *string         `json:"targetCashAccountId,omitempty"`
	TargetInvestmentID  *string         `json:"targetInvestmentId,omitempty"`
	AllocationType      string          `json:"allocationType"`  // 'percentage' or 'fixed'
	AllocationValue     decimal.Decimal `json:"allocationValue"` // percentage (0-100) or fixed amount
	CreatedAt           time.Time       `json:"createdAt"`
}

// ErrNotFound indicates a record was not found
var ErrNotFound = fmt.Errorf("not found")

// CreateLiability creates a new liability and auto-creates a linked expense if minimum payment is set.
func (s *Store) CreateLiability(ctx context.Context, userID string, li Liability) (Liability, error) {
	startDate := li.StartDate
	if startDate.IsZero() {
		startDate = time.Now().UTC()
	}

	// Default repayment strategy
	repaymentStrategy := li.RepaymentStrategy
	if repaymentStrategy == "" {
		repaymentStrategy = "standard_amortization"
	}

	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_liabilities (user_id, parent_id, name, category, current_balance, interest_rate_apr, minimum_payment, start_date, end_date, notes, repayment_strategy)
		VALUES ($1, COALESCE($2, gen_random_uuid()), $3, $4, $5, $6, $7, $8, $9, NULLIF($10, ''), $11)
		ON CONFLICT ON CONSTRAINT finance_liabilities_parent_start_date_key DO UPDATE
		SET name=EXCLUDED.name,
		    category=EXCLUDED.category,
		    current_balance=EXCLUDED.current_balance,
		    interest_rate_apr=EXCLUDED.interest_rate_apr,
		    minimum_payment=EXCLUDED.minimum_payment,
		    end_date=EXCLUDED.end_date,
		    notes=EXCLUDED.notes,
		    repayment_strategy=EXCLUDED.repayment_strategy,
		    updated_at=NOW()
		RETURNING id, COALESCE(parent_id,id), name, category, current_balance, interest_rate_apr, minimum_payment, start_date, end_date, COALESCE(notes, ''), COALESCE(repayment_strategy, 'standard_amortization'), updated_at`,
		userID, nullIfEmpty(li.ParentID), li.Name, li.Category, li.CurrentBalance, li.InterestRateAPR, li.MinimumPayment, startDate, li.EndDate, li.Notes, repaymentStrategy)

	var created Liability
	var endDateVal sql.NullTime
	if err := row.Scan(&created.ID, &created.ParentID, &created.Name, &created.Category, &created.CurrentBalance, &created.InterestRateAPR, &created.MinimumPayment, &created.StartDate, &endDateVal, &created.Notes, &created.RepaymentStrategy, &created.UpdatedAt); err != nil {
		return Liability{}, err
	}
	if endDateVal.Valid {
		created.EndDate = &endDateVal.Time
	}

	// Auto-create linked expense for liability repayment if minimum payment is set
	zero := decimal.Zero()
	if created.MinimumPayment.Cmp(zero) > 0 {
		_, _ = s.CreateExpense(ctx, userID, Expense{
			Payee:             created.Name,
			Amount:            created.MinimumPayment,
			Frequency:         "monthly",
			StartDate:         created.StartDate,
			EndDate:           created.EndDate,
			Category:          "Debt Payment",
			GrowthRate:        *zero,
			SourceLiabilityID: &created.ID,
		})
	}

	return created, nil
}

// CreateExpense creates a new expense record.
func (s *Store) CreateExpense(ctx context.Context, userID string, exp Expense) (Expense, error) {
	startDate := exp.StartDate
	if startDate.IsZero() {
		startDate = time.Now().UTC()
	}

	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_expenses (user_id, parent_id, payee, amount, frequency, start_date, end_date, category, growth_rate, notes, source_liability_id)
		VALUES ($1, COALESCE($2, gen_random_uuid()), $3, $4, $5, $6, $7, $8, $9, NULLIF($10, ''), $11)
		RETURNING id, COALESCE(parent_id,id), payee, amount, frequency, start_date, end_date, category, growth_rate, COALESCE(notes, ''), updated_at, source_liability_id`,
		userID, nullIfEmpty(exp.ParentID), exp.Payee, exp.Amount, exp.Frequency, startDate, exp.EndDate, exp.Category, exp.GrowthRate, exp.Notes, exp.SourceLiabilityID)

	var created Expense
	var endDateVal sql.NullTime
	var sourceLiabilityID sql.NullString
	if err := row.Scan(&created.ID, &created.ParentID, &created.Payee, &created.Amount, &created.Frequency, &created.StartDate, &endDateVal, &created.Category, &created.GrowthRate, &created.Notes, &created.UpdatedAt, &sourceLiabilityID); err != nil {
		return Expense{}, err
	}
	if endDateVal.Valid {
		created.EndDate = &endDateVal.Time
	}
	if sourceLiabilityID.Valid {
		created.SourceLiabilityID = &sourceLiabilityID.String
	}

	return created, nil
}

// nullIfEmpty returns nil if the string is empty, otherwise returns a pointer to the string
func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// ListIncomeAllocations returns all allocations for an income.
// Uses LEFT JOIN to verify income ownership and fetch allocations in a single query.
func (s *Store) ListIncomeAllocations(
	ctx context.Context,
	userID string,
	incomeID string,
) ([]IncomeAllocation, error) {
	query := `
	SELECT
		fi.id,
		ia.id,
		ia.target_cash_account_id,
		ia.target_investment_id,
		ia.allocation_type,
		ia.allocation_value,
		ia.created_at
	FROM finance_incomes fi
	LEFT JOIN income_allocations ia ON ia.income_id = fi.id
	WHERE fi.id = $1 AND fi.user_id = $2
	ORDER BY ia.created_at`

	logQuery(query, []any{incomeID, userID})
	rows, err := s.db.QueryContext(ctx, query, incomeID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query income allocations: %w", err)
	}
	defer rows.Close()

	allocations := []IncomeAllocation{}
	foundIncome := false

	for rows.Next() {
		foundIncome = true

		var incomeIDResult string
		var id, targetCashAccountID, targetInvestmentID, allocationType sql.NullString
		var allocationValue decimal.Decimal
		var createdAt sql.NullTime

		err := rows.Scan(
			&incomeIDResult,
			&id,
			&targetCashAccountID,
			&targetInvestmentID,
			&allocationType,
			&allocationValue,
			&createdAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan income allocation: %w", err)
		}

		// Skip if no allocation (LEFT JOIN produced NULL row)
		if !id.Valid {
			continue
		}

		a := IncomeAllocation{
			ID:              id.String,
			IncomeID:        incomeID,
			AllocationType:  allocationType.String,
			AllocationValue: allocationValue,
			CreatedAt:       createdAt.Time,
		}
		if targetCashAccountID.Valid {
			a.TargetCashAccountID = &targetCashAccountID.String
		}
		if targetInvestmentID.Valid {
			a.TargetInvestmentID = &targetInvestmentID.String
		}

		allocations = append(allocations, a)
	}

	if !foundIncome {
		return nil, ErrNotFound
	}

	return allocations, nil
}

// ListAllIncomeAllocations returns all allocations for all of a user's incomes.
// Used by timeline service to calculate total investment allocations.
func (s *Store) ListAllIncomeAllocations(
	ctx context.Context,
	userID string,
) ([]IncomeAllocation, error) {
	query := `
	SELECT
		ia.id,
		ia.income_id,
		ia.target_cash_account_id,
		ia.target_investment_id,
		ia.allocation_type,
		ia.allocation_value,
		ia.created_at
	FROM income_allocations ia
	INNER JOIN finance_incomes fi ON fi.id = ia.income_id
	WHERE fi.user_id = $1
	ORDER BY ia.income_id, ia.created_at`

	logQuery(query, []any{userID})
	rows, err := s.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query all income allocations: %w", err)
	}
	defer rows.Close()

	allocations := []IncomeAllocation{}
	for rows.Next() {
		var a IncomeAllocation
		var targetCashAccountID, targetInvestmentID sql.NullString

		err := rows.Scan(
			&a.ID, &a.IncomeID,
			&targetCashAccountID, &targetInvestmentID,
			&a.AllocationType, &a.AllocationValue, &a.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan income allocation: %w", err)
		}

		if targetCashAccountID.Valid {
			a.TargetCashAccountID = &targetCashAccountID.String
		}
		if targetInvestmentID.Valid {
			a.TargetInvestmentID = &targetInvestmentID.String
		}

		allocations = append(allocations, a)
	}

	return allocations, nil
}

// GetIncomeAllocation returns a single allocation by ID.
func (s *Store) GetIncomeAllocation(
	ctx context.Context,
	userID string,
	allocationID string,
) (*IncomeAllocation, error) {
	query := `
	SELECT ia.id, ia.income_id, ia.target_cash_account_id, ia.target_investment_id,
	       ia.allocation_type, ia.allocation_value, ia.created_at
	FROM income_allocations ia
	INNER JOIN finance_incomes fi ON fi.id = ia.income_id AND fi.user_id = $1
	WHERE ia.id = $2`

	var a IncomeAllocation
	var targetCashAccountID, targetInvestmentID sql.NullString

	err := s.db.QueryRowContext(ctx, query, userID, allocationID).Scan(
		&a.ID, &a.IncomeID,
		&targetCashAccountID, &targetInvestmentID,
		&a.AllocationType, &a.AllocationValue, &a.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get income allocation: %w", err)
	}

	if targetCashAccountID.Valid {
		a.TargetCashAccountID = &targetCashAccountID.String
	}
	if targetInvestmentID.Valid {
		a.TargetInvestmentID = &targetInvestmentID.String
	}

	return &a, nil
}

// CreateIncomeAllocation creates a new allocation for an income.
func (s *Store) CreateIncomeAllocation(
	ctx context.Context,
	userID string,
	allocation IncomeAllocation,
) (*IncomeAllocation, error) {
	// Verify the income belongs to the user
	var exists bool
	err := s.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM finance_incomes WHERE id = $1 AND user_id = $2)`,
		allocation.IncomeID, userID,
	).Scan(&exists)
	if err != nil {
		return nil, fmt.Errorf("failed to verify income ownership: %w", err)
	}
	if !exists {
		return nil, ErrNotFound
	}

	query := `
	INSERT INTO income_allocations (income_id, target_cash_account_id, target_investment_id, allocation_type, allocation_value)
	VALUES ($1, $2, $3, $4, $5)
	RETURNING id, income_id, target_cash_account_id, target_investment_id, allocation_type, allocation_value, created_at`

	var created IncomeAllocation
	var targetCashAccountID, targetInvestmentID sql.NullString

	err = s.db.QueryRowContext(ctx, query,
		allocation.IncomeID,
		allocation.TargetCashAccountID,
		allocation.TargetInvestmentID,
		allocation.AllocationType,
		allocation.AllocationValue,
	).Scan(
		&created.ID, &created.IncomeID,
		&targetCashAccountID, &targetInvestmentID,
		&created.AllocationType, &created.AllocationValue, &created.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create income allocation: %w", err)
	}

	if targetCashAccountID.Valid {
		created.TargetCashAccountID = &targetCashAccountID.String
	}
	if targetInvestmentID.Valid {
		created.TargetInvestmentID = &targetInvestmentID.String
	}

	return &created, nil
}

// UpdateIncomeAllocation updates an existing allocation.
func (s *Store) UpdateIncomeAllocation(
	ctx context.Context,
	userID string,
	allocation IncomeAllocation,
) (*IncomeAllocation, error) {
	query := `
	UPDATE income_allocations ia
	SET target_cash_account_id = $3,
	    target_investment_id = $4,
	    allocation_type = $5,
	    allocation_value = $6
	FROM finance_incomes fi
	WHERE ia.id = $2
	  AND ia.income_id = fi.id
	  AND fi.user_id = $1
	RETURNING ia.id, ia.income_id, ia.target_cash_account_id, ia.target_investment_id,
	          ia.allocation_type, ia.allocation_value, ia.created_at`

	var updated IncomeAllocation
	var targetCashAccountID, targetInvestmentID sql.NullString

	err := s.db.QueryRowContext(ctx, query,
		userID, allocation.ID,
		allocation.TargetCashAccountID,
		allocation.TargetInvestmentID,
		allocation.AllocationType,
		allocation.AllocationValue,
	).Scan(
		&updated.ID, &updated.IncomeID,
		&targetCashAccountID, &targetInvestmentID,
		&updated.AllocationType, &updated.AllocationValue, &updated.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update income allocation: %w", err)
	}

	if targetCashAccountID.Valid {
		updated.TargetCashAccountID = &targetCashAccountID.String
	}
	if targetInvestmentID.Valid {
		updated.TargetInvestmentID = &targetInvestmentID.String
	}

	return &updated, nil
}

// DeleteIncomeAllocation deletes an allocation by ID.
func (s *Store) DeleteIncomeAllocation(
	ctx context.Context,
	userID string,
	allocationID string,
) error {
	query := `
	DELETE FROM income_allocations ia
	USING finance_incomes fi
	WHERE ia.id = $2
	  AND ia.income_id = fi.id
	  AND fi.user_id = $1`

	result, err := s.db.ExecContext(ctx, query, userID, allocationID)
	if err != nil {
		return fmt.Errorf("failed to delete income allocation: %w", err)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if affected == 0 {
		return ErrNotFound
	}

	return nil
}
