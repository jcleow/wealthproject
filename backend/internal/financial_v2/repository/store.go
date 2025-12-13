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
	ID               string                 `json:"id"`
	ParentID         string                 `json:"parentId"`
	Name             string                 `json:"name"`
	Category         string                 `json:"category"`
	CurrentValue     decimal.Decimal        `json:"currentValue"`
	AnnualGrowthRate decimal.Decimal        `json:"annualGrowthRate"`
	StartDate        time.Time              `json:"startDate"`         // Precise start date (day-level)
	EndDate          *time.Time             `json:"endDate,omitempty"` // NULL means ongoing
	Notes            string                 `json:"notes"`
	GrowthStrategy   string                 `json:"growthStrategy"`
	GrowthMetadata   map[string]interface{} `json:"growthMetadata,omitempty"`
	UpdatedAt        time.Time              `json:"updatedAt"`
}

type CashAsset struct {
	ID             string                 `json:"id"`
	UserID         string                 `json:"userId"`
	Name           string                 `json:"name"`
	Balance        decimal.Decimal        `json:"balance"`
	InterestRate   decimal.Decimal        `json:"interestRate"`
	BankName       string                 `json:"bankName,omitempty"`
	AccountType    string                 `json:"accountType,omitempty"` // 'checking', 'savings', 'money_market'
	IsAccumulator  bool                   `json:"isAccumulator"`
	StartDate      time.Time              `json:"startDate"`         // Precise start date (day-level)
	EndDate        *time.Time             `json:"endDate,omitempty"` // NULL means ongoing
	Notes          string                 `json:"notes,omitempty"`
	GrowthStrategy string                 `json:"growthStrategy"`
	GrowthMetadata map[string]interface{} `json:"growthMetadata,omitempty"`
	CreatedAt      time.Time              `json:"createdAt"`
	UpdatedAt      time.Time              `json:"updatedAt"`
}

// Liability represents a persisted liability record.
type Liability struct {
	ID              string                 `json:"id"`
	ParentID        string                 `json:"parentId"`
	Name            string                 `json:"name"`
	Category        string                 `json:"category"`
	CurrentBalance  decimal.Decimal        `json:"currentBalance"`
	InterestRateAPR decimal.Decimal        `json:"interestRateApr"`
	MinimumPayment  decimal.Decimal        `json:"minimumPayment"`
	StartDate       time.Time              `json:"startDate"`         // Precise start date (day-level)
	EndDate         *time.Time             `json:"endDate,omitempty"` // NULL means ongoing
	Notes           string                 `json:"notes"`
	GrowthStrategy  string                 `json:"growthStrategy"`
	GrowthMetadata  map[string]interface{} `json:"growthMetadata,omitempty"`
	UpdatedAt       time.Time              `json:"updatedAt"`
}

// Income represents a persisted income record.
type Income struct {
	ID             string                 `json:"id"`
	ParentID       string                 `json:"parentId"`
	Source         string                 `json:"source"`
	Amount         decimal.Decimal        `json:"amount"`
	Frequency      string                 `json:"frequency"`
	StartDate      time.Time              `json:"startDate"`         // Precise start date (day-level) - now required
	EndDate        *time.Time             `json:"endDate,omitempty"` // NULL means ongoing
	Category       string                 `json:"category"`
	GrowthRate     decimal.Decimal        `json:"growthRate"`
	Notes          string                 `json:"notes"`
	GrowthStrategy string                 `json:"growthStrategy"`
	GrowthMetadata map[string]interface{} `json:"growthMetadata,omitempty"`
	UpdatedAt      time.Time              `json:"updatedAt"`
	// CPF-related fields
	IncomeType    string `json:"incomeType"`    // 'salary', 'bonus', 'commission', 'rental', 'dividend', 'freelance', 'other'
	CPFApplicable bool   `json:"cpfApplicable"` // Whether CPF contributions apply to this income
	CPFWageType   string `json:"cpfWageType"`   // 'ow' (Ordinary Wages) or 'aw' (Additional Wages)
}

// Expense represents a persisted expense record.
type Expense struct {
	ID             string                 `json:"id"`
	ParentID       string                 `json:"parentId"`
	Payee          string                 `json:"payee"`
	Amount         decimal.Decimal        `json:"amount"`
	Frequency      string                 `json:"frequency"`
	StartDate      time.Time              `json:"startDate"`         // Precise start date (day-level)
	EndDate        *time.Time             `json:"endDate,omitempty"` // NULL means ongoing
	Category       string                 `json:"category"`
	GrowthRate     decimal.Decimal        `json:"growthRate"`
	Notes          string                 `json:"notes"`
	GrowthStrategy string                 `json:"growthStrategy"`
	GrowthMetadata map[string]interface{} `json:"growthMetadata,omitempty"`
	UpdatedAt      time.Time              `json:"updatedAt"`
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
	FROM cash_accounts
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
			&l.UpdatedAt,
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
		COALESCE(cpf_applicable, false) as cpf_applicable,
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
			&i.IncomeType, &i.CPFApplicable, &i.CPFWageType,
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
		updated_at
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

		err := rows.Scan(
			&e.ID, &e.ParentID, &e.Payee, &e.Amount, &e.Frequency,
			&e.StartDate, &endDate, &e.Category, &e.GrowthRate,
			&e.Notes, &e.GrowthStrategy, &e.UpdatedAt,
		)
		if err != nil {
			return PaginatedResult[Expense]{}, err
		}

		if endDate.Valid {
			e.EndDate = &endDate.Time
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
