package repository

import (
	"context"
	"fmt"
	"log"
	"runtime"
	"strings"
	"time"

	"financial-chat-system/backend/internal/decimal"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// DebugSQL enables SQL query logging when set to true
var DebugSQL = false

type PgxPool interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Begin(ctx context.Context) (pgx.Tx, error)
}

type Store struct {
	pool PgxPool
}

// NewStore creates a new repository Store with pgxpool
func NewStore(pool PgxPool) *Store {
	return &Store{pool: pool}
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
	TerminalValue    *decimal.Decimal `json:"terminalValue,omitempty"`  // Value at end of useful life (NULL = disappear, 0 = worthless)
	Notes            string          `json:"notes"`
	GrowthStrategy   string          `json:"growthStrategy"`
	UpdatedAt        time.Time       `json:"updatedAt"`
	// Scenario impact fields
	ScenarioEventID *string `json:"scenarioEventId,omitempty"` // Links to scenario event if this is a scenario-driven row
	ImpactKind      *string `json:"impactKind,omitempty"`      // NULL = base item, 'delta' = additive, 'override' = replaces
	ImpactFrequency *string `json:"impactFrequency,omitempty"` // How often delta adds (NULL for base/override)
}

// Investment mirrors NonCashAsset but lives in finance_investments
type Investment struct {
	ID             string          `json:"id"`
	ParentID       string          `json:"parentId"`
	Name           string          `json:"name"`
	Category       string          `json:"category"`
	CurrentValue   decimal.Decimal `json:"currentValue"`
	GrowthRate     decimal.Decimal `json:"growthRate"`
	StartDate      time.Time       `json:"startDate"`         // Precise start date (day-level)
	EndDate        *time.Time      `json:"endDate,omitempty"` // NULL means ongoing
	Notes          string          `json:"notes"`
	GrowthStrategy string          `json:"growthStrategy"`
	UpdatedAt      time.Time       `json:"updatedAt"`
	// Scenario impact fields
	ScenarioEventID *string `json:"scenarioEventId,omitempty"` // Links to scenario event if this is a scenario-driven row
	ImpactKind      *string `json:"impactKind,omitempty"`      // NULL = base item, 'delta' = additive, 'override' = replaces
	ImpactFrequency *string `json:"impactFrequency,omitempty"` // How often delta adds (NULL for base/override)
}

type CashAsset struct {
	ID             string          `json:"id"`
	UserID         string          `json:"userId"`
	ParentID       *string         `json:"parentId,omitempty"` // For versioning support
	Name           string          `json:"name"`
	Balance        decimal.Decimal `json:"balance"`
	InterestRate   decimal.Decimal `json:"interestRate"`
	BankName       string          `json:"bankName,omitempty"`
	AccountType    string          `json:"accountType,omitempty"` // 'checking', 'savings', 'money_market'
	Category       string          `json:"category,omitempty"`
	IsAccumulator  bool            `json:"isAccumulator"`
	StartDate      time.Time       `json:"startDate"`         // Precise start date (day-level)
	EndDate        *time.Time      `json:"endDate,omitempty"` // NULL means ongoing
	Notes          string          `json:"notes,omitempty"`
	GrowthStrategy string          `json:"growthStrategy"`
	CreatedAt      time.Time       `json:"createdAt"`
	UpdatedAt      time.Time       `json:"updatedAt"`
	// Scenario impact fields
	ScenarioEventID *string `json:"scenarioEventId,omitempty"` // Links to scenario event if this is a scenario-driven row
	ImpactKind      *string `json:"impactKind,omitempty"`      // NULL = base item, 'delta' = additive, 'override' = replaces
	ImpactFrequency *string `json:"impactFrequency,omitempty"` // How often delta adds (NULL for base/override)
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
	// Scenario impact fields
	ScenarioEventID *string `json:"scenarioEventId,omitempty"` // Links to scenario event if this is a scenario-driven row
	ImpactKind      *string `json:"impactKind,omitempty"`      // NULL = base item, 'delta' = additive, 'override' = replaces
	ImpactFrequency *string `json:"impactFrequency,omitempty"` // How often delta adds (NULL for base/override)
}

// Income represents a persisted income record.
type Income struct {
	ID             string          `json:"id"`
	ParentID       string          `json:"parentId"`
	Name           string          `json:"name"`
	PersonID       string          `json:"personId"` // FK to persons table (required)
	PersonName     string          `json:"personName,omitempty"` // Display name from persons table (read-only, populated via JOIN)
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
	// Scenario impact fields
	ScenarioEventID *string `json:"scenarioEventId,omitempty"` // Links to scenario event if this is a scenario-driven row
	ImpactKind      *string `json:"impactKind,omitempty"`      // NULL = base item, 'delta' = additive, 'override' = replaces
	ImpactFrequency *string `json:"impactFrequency,omitempty"` // How often delta adds (NULL for base/override)
}

// Expense represents a persisted expense record.
type Expense struct {
	ID                string          `json:"id"`
	ParentID          string          `json:"parentId"`
	Name              string          `json:"name"`
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
	// Scenario impact fields
	ScenarioEventID *string `json:"scenarioEventId,omitempty"` // Links to scenario event if this is a scenario-driven row
	ImpactKind      *string `json:"impactKind,omitempty"`      // NULL = base item, 'delta' = additive, 'override' = replaces
	ImpactFrequency *string `json:"impactFrequency,omitempty"` // How often delta adds (NULL for base/override)
}

// CPFAccount represents a user's CPF account with balances and profile data.
// Supports versioning via parent_id + start_date/end_date for timeline-aware edits.
type CPFAccount struct {
	ID               string          `json:"id"`
	UserID           string          `json:"userId"`
	PersonID         string          `json:"personId"`             // FK to persons table (required)
	PersonName       string          `json:"personName,omitempty"` // Display name from persons table (read-only, populated via JOIN)
	ParentID         string          `json:"parentId"`             // Groups versions of same logical account
	StartDate        time.Time       `json:"startDate"`            // When this version starts
	EndDate          *time.Time      `json:"endDate,omitempty"`    // When this version ends (NULL = ongoing)
	OABalance        decimal.Decimal `json:"oaBalance"`            // Ordinary Account balance
	SABalance        decimal.Decimal `json:"saBalance"`            // Special Account balance
	MABalance        decimal.Decimal `json:"maBalance"`            // MediSave Account balance
	RABalance        decimal.Decimal `json:"raBalance"`            // Retirement Account balance (only after age 55)
	// OAUsedForHousing tracks OA withdrawals for housing purposes (for accrued interest calculation).
	// TODO: For multiple property scenarios, consider a 1:M relationship (cpf_housing_usages table)
	// with fields: property_scenario_id, amount_used, withdrawal_date, property_link_id.
	// This would allow tracking different OA usage amounts per property scenario.
	OAUsedForHousing decimal.Decimal `json:"oaUsedForHousing"`
	HousingStartDate *time.Time      `json:"housingStartDate,omitempty"`
	// Person-related fields (read-only, populated via JOIN from persons table)
	DateOfBirth     time.Time  `json:"dateOfBirth"`
	ResidencyStatus string     `json:"residencyStatus"` // 'citizen', 'pr_year_1', 'pr_year_2', 'pr_year_3_plus'
	PRGrantDate     *time.Time `json:"prGrantDate,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

// Person represents a household member for income/CPF ownership and filtering.
type Person struct {
	ID              string     `json:"id"`
	UserID          string     `json:"userId"`
	Name            string     `json:"name"`
	DisplayColor    *string    `json:"displayColor,omitempty"`
	IsIncluded      bool       `json:"isIncluded"`
	DateOfBirth     time.Time  `json:"dateOfBirth"`
	ResidencyStatus string     `json:"residencyStatus"` // 'citizen', 'pr_year_1', 'pr_year_2', 'pr_year_3_plus'
	PRGrantDate     *time.Time `json:"prGrantDate,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
	// Stats populated by GetPersonsWithStats
	IncomeCount int `json:"incomeCount,omitempty"`
	CPFCount    int `json:"cpfCount,omitempty"`
}

type DateRangeOptions struct {
	StartDate *time.Time // Filter items where start_date >= this
	EndDate   *time.Time // Filter items where start_date <= this
}

// ListQuery consolidates common query parameters for list operations.
type ListQuery struct {
	UserID               string
	DateRange            DateRangeOptions
	Pagination           PaginationParams
	IncludeScenarioItems bool // When true, include items created by scenario start impacts
}

// addDateRangeFilterQuery builds a SQL filter for items active during a date range.
// An item is "active" if: started before the range ends AND (no end_date OR end_date after range starts).
// This ensures items that started before the query range but are still active are included.
func addDateRangeFilterQuery(opts DateRangeOptions, argIdx int) (string, int) {
	dateRangeSubquery := []string{}

	// Include items that started before the end of the query range
	if opts.EndDate != nil {
		dateRangeSubquery = append(dateRangeSubquery, fmt.Sprintf(`start_date < $%d`, argIdx))
		argIdx++
	}

	// Exclude items that ended before the start of the query range
	if opts.StartDate != nil {
		dateRangeSubquery = append(dateRangeSubquery, fmt.Sprintf(`(end_date IS NULL OR end_date >= $%d)`, argIdx))
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
	q ListQuery,
) (PaginatedResult[NonCashAsset], error) {
	query := `
	SELECT id,
		COALESCE(parent_id, id) as parent_id,
		name,
		category,
		current_value,
		growth_rate,
		start_date,
		end_date,
		terminal_value,
		COALESCE(notes, '') as notes,
		updated_at,
		scenario_event_id
	FROM finance_assets
	WHERE user_id = $1`

	// Filter scenario items:
	// - When IncludeScenarioItems=false: exclude all scenario items
	// - When IncludeScenarioItems=true: include regular items AND 'start' impact items only
	//   (delta/override/stop rows are impact DATA, not items to display)
	if !q.IncludeScenarioItems {
		query += ` AND scenario_event_id IS NULL`
	} else {
		query += ` AND (scenario_event_id IS NULL OR impact_kind = 'start')`
	}

	args := []any{q.UserID}
	argIdx := 2 // i.e start 2

	// Add dynamic date range filtering
	dateRangeSubQuery, argIdx := addDateRangeFilterQuery(q.DateRange, argIdx)
	if dateRangeSubQuery != "" {
		query += " AND " + dateRangeSubQuery
		// Args order must match SQL: EndDate first (for start_date < $X), then StartDate (for end_date >= $Y)
		if q.DateRange.EndDate != nil {
			args = append(args, *q.DateRange.EndDate)
		}
		if q.DateRange.StartDate != nil {
			args = append(args, *q.DateRange.StartDate)
		}
	}

	query += ` ORDER BY parent_id, start_date`

	// Add pagination
	paginationSubQuery, _ := addPaginationQuery(q.Pagination, argIdx)
	if paginationSubQuery != "" {
		query += " " + paginationSubQuery
		if q.Pagination.Limit != nil {
			args = append(args, *q.Pagination.Limit)
		}
		if q.Pagination.Offset != nil {
			args = append(args, *q.Pagination.Offset)
		}
	}

	logQuery(query, args)
	rows, err := s.pool.Query(ctx, query, args...)
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
		// pgx can scan NULL directly into *time.Time
		err := rows.Scan(&a.ID, &a.ParentID, &a.Name, &a.Category, &a.CurrentValue, &a.AnnualGrowthRate, &a.StartDate, &a.EndDate, &a.TerminalValue, &a.Notes, &a.UpdatedAt, &a.ScenarioEventID)
		if err != nil {
			return PaginatedResult[NonCashAsset]{}, err
		}
		nonCashAssets = append(nonCashAssets, a)
	}

	return PaginatedResult[NonCashAsset]{
		Data:   nonCashAssets,
		Count:  len(nonCashAssets),
		Limit:  q.Pagination.Limit,
		Offset: q.Pagination.Offset,
	}, nil
}

func (s *Store) ListInvestments(
	ctx context.Context,
	q ListQuery,
) (PaginatedResult[Investment], error) {
	query := `
	SELECT id,
	COALESCE(parent_id, id) as parent_id,
	name,
	category,
	current_value,
	growth_rate,
	start_date,
	end_date,
	COALESCE(notes, '') as notes,
	updated_at,
	scenario_event_id
FROM finance_investments
	WHERE user_id = $1`

	// Filter scenario items:
	// - When IncludeScenarioItems=false: exclude all scenario items
	// - When IncludeScenarioItems=true: include regular items AND 'start' impact items only
	if !q.IncludeScenarioItems {
		query += ` AND scenario_event_id IS NULL`
	} else {
		query += ` AND (scenario_event_id IS NULL OR impact_kind = 'start')`
	}

	args := []any{q.UserID}
	argIdx := 2

	dateRangeSubQuery, argIdx := addDateRangeFilterQuery(q.DateRange, argIdx)
	if dateRangeSubQuery != "" {
		query += " AND " + dateRangeSubQuery
		// Args order must match SQL: EndDate first (for start_date < $X), then StartDate (for end_date >= $Y)
		if q.DateRange.EndDate != nil {
			args = append(args, *q.DateRange.EndDate)
		}
		if q.DateRange.StartDate != nil {
			args = append(args, *q.DateRange.StartDate)
		}
	}

	query += ` ORDER BY parent_id, start_date`

	paginationSubQuery, _ := addPaginationQuery(q.Pagination, argIdx)
	if paginationSubQuery != "" {
		query += " " + paginationSubQuery
		if q.Pagination.Limit != nil {
			args = append(args, *q.Pagination.Limit)
		}
		if q.Pagination.Offset != nil {
			args = append(args, *q.Pagination.Offset)
		}
	}

	logQuery(query, args)
	rows, err := s.pool.Query(ctx, query, args...)
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
		err := rows.Scan(&inv.ID, &inv.ParentID, &inv.Name, &inv.Category, &inv.CurrentValue, &inv.GrowthRate, &inv.StartDate, &inv.EndDate, &inv.Notes, &inv.UpdatedAt, &inv.ScenarioEventID)
		if err != nil {
			return PaginatedResult[Investment]{}, err
		}
		investments = append(investments, inv)
	}

	return PaginatedResult[Investment]{
		Data:   investments,
		Count:  len(investments),
		Limit:  q.Pagination.Limit,
		Offset: q.Pagination.Offset,
	}, nil
}

func (s *Store) ListCashAssets(
	ctx context.Context,
	q ListQuery,
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

	// Filter scenario items:
	// - When IncludeScenarioItems=false: exclude all scenario items
	// - When IncludeScenarioItems=true: include regular items AND 'start' impact items only
	if !q.IncludeScenarioItems {
		query += ` AND scenario_event_id IS NULL`
	} else {
		query += ` AND (scenario_event_id IS NULL OR impact_kind = 'start')`
	}

	args := []any{q.UserID}
	argIdx := 2

	// Add dynamic date range filtering
	dateRangeSubQuery, argIdx := addDateRangeFilterQuery(q.DateRange, argIdx)
	if dateRangeSubQuery != "" {
		query += " AND " + dateRangeSubQuery
		// Args order must match SQL: EndDate first (for start_date < $X), then StartDate (for end_date >= $Y)
		if q.DateRange.EndDate != nil {
			args = append(args, *q.DateRange.EndDate)
		}
		if q.DateRange.StartDate != nil {
			args = append(args, *q.DateRange.StartDate)
		}
	}

	query += ` ORDER BY created_at`

	// Add pagination
	paginationSubQuery, _ := addPaginationQuery(q.Pagination, argIdx)
	if paginationSubQuery != "" {
		query += " " + paginationSubQuery
		if q.Pagination.Limit != nil {
			args = append(args, *q.Pagination.Limit)
		}
		if q.Pagination.Offset != nil {
			args = append(args, *q.Pagination.Offset)
		}
	}

	logQuery(query, args)
	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		fmt.Printf("Failed to query cash assets: %v\n", err)
		return PaginatedResult[CashAsset]{}, err
	}
	defer rows.Close()

	cashAssets := []CashAsset{}
	for rows.Next() {
		var a CashAsset
		err := rows.Scan(
			&a.ID, &a.UserID, &a.Name, &a.Balance, &a.InterestRate,
			&a.BankName, &a.AccountType, &a.IsAccumulator,
			&a.StartDate, &a.EndDate, &a.Notes, &a.GrowthStrategy,
			&a.CreatedAt, &a.UpdatedAt,
		)
		if err != nil {
			return PaginatedResult[CashAsset]{}, err
		}
		cashAssets = append(cashAssets, a)
	}

	return PaginatedResult[CashAsset]{
		Data:   cashAssets,
		Count:  len(cashAssets),
		Limit:  q.Pagination.Limit,
		Offset: q.Pagination.Offset,
	}, nil
}

func (s *Store) ListLiabilities(
	ctx context.Context,
	q ListQuery,
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
		updated_at,
		scenario_event_id
	FROM finance_liabilities
	WHERE user_id = $1`

	// Filter scenario items:
	// - When IncludeScenarioItems=false: exclude all scenario items
	// - When IncludeScenarioItems=true: include regular items AND 'start' impact items only
	if !q.IncludeScenarioItems {
		query += ` AND scenario_event_id IS NULL`
	} else {
		query += ` AND (scenario_event_id IS NULL OR impact_kind = 'start')`
	}

	args := []any{q.UserID}
	argIdx := 2

	// Add dynamic date range filtering
	dateRangeSubQuery, argIdx := addDateRangeFilterQuery(q.DateRange, argIdx)
	if dateRangeSubQuery != "" {
		query += " AND " + dateRangeSubQuery
		// Args order must match SQL: EndDate first (for start_date < $X), then StartDate (for end_date >= $Y)
		if q.DateRange.EndDate != nil {
			args = append(args, *q.DateRange.EndDate)
		}
		if q.DateRange.StartDate != nil {
			args = append(args, *q.DateRange.StartDate)
		}
	}

	query += ` ORDER BY parent_id, start_date`

	// Add pagination
	paginationSubQuery, _ := addPaginationQuery(q.Pagination, argIdx)
	if paginationSubQuery != "" {
		query += " " + paginationSubQuery
		if q.Pagination.Limit != nil {
			args = append(args, *q.Pagination.Limit)
		}
		if q.Pagination.Offset != nil {
			args = append(args, *q.Pagination.Offset)
		}
	}

	logQuery(query, args)
	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		fmt.Printf("Failed to query liabilities: %v\n", err)
		return PaginatedResult[Liability]{}, err
	}
	defer rows.Close()

	liabilities := []Liability{}
	for rows.Next() {
		var l Liability
		err := rows.Scan(
			&l.ID, &l.ParentID, &l.Name, &l.Category,
			&l.CurrentBalance, &l.InterestRateAPR, &l.MinimumPayment,
			&l.StartDate, &l.EndDate, &l.Notes, &l.GrowthStrategy,
			&l.RepaymentStrategy, &l.UpdatedAt, &l.ScenarioEventID,
		)
		if err != nil {
			return PaginatedResult[Liability]{}, err
		}
		liabilities = append(liabilities, l)
	}

	return PaginatedResult[Liability]{
		Data:   liabilities,
		Count:  len(liabilities),
		Limit:  q.Pagination.Limit,
		Offset: q.Pagination.Offset,
	}, nil
}

func (s *Store) ListIncomes(
	ctx context.Context,
	q ListQuery,
) (PaginatedResult[Income], error) {
	query := `
	SELECT i.id,
		COALESCE(i.parent_id, i.id) as parent_id,
		i.name,
		i.person_id,
		COALESCE(p.name, '') as person_name,
		i.amount,
		i.frequency,
		i.start_date,
		i.end_date,
		i.category,
		i.growth_rate,
		COALESCE(i.notes, '') as notes,
		COALESCE(i.growth_strategy, '') as growth_strategy,
		i.updated_at,
		COALESCE(i.income_type, 'other') as income_type,
		COALESCE(i.cpf_wage_type, '') as cpf_wage_type,
		i.scenario_event_id
	FROM finance_incomes i
	LEFT JOIN persons p ON i.person_id = p.id
	WHERE i.user_id = $1`

	// Filter scenario items:
	// - When IncludeScenarioItems=false: exclude all scenario items
	// - When IncludeScenarioItems=true: include regular items AND 'start' impact items only
	if !q.IncludeScenarioItems {
		query += ` AND i.scenario_event_id IS NULL`
	} else {
		query += ` AND (i.scenario_event_id IS NULL OR i.impact_kind = 'start')`
	}

	args := []any{q.UserID}
	argIdx := 2

	// Add dynamic date range filtering
	dateRangeSubQuery, argIdx := addDateRangeFilterQuery(q.DateRange, argIdx)
	if dateRangeSubQuery != "" {
		query += " AND " + dateRangeSubQuery
		// Args order must match SQL: EndDate first (for start_date < $X), then StartDate (for end_date >= $Y)
		if q.DateRange.EndDate != nil {
			args = append(args, *q.DateRange.EndDate)
		}
		if q.DateRange.StartDate != nil {
			args = append(args, *q.DateRange.StartDate)
		}
	}

	query += ` ORDER BY i.parent_id, i.start_date`

	// Add pagination
	paginationSubQuery, _ := addPaginationQuery(q.Pagination, argIdx)
	if paginationSubQuery != "" {
		query += " " + paginationSubQuery
		if q.Pagination.Limit != nil {
			args = append(args, *q.Pagination.Limit)
		}
		if q.Pagination.Offset != nil {
			args = append(args, *q.Pagination.Offset)
		}
	}

	logQuery(query, args)
	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		fmt.Printf("Failed to query incomes: %v\n", err)
		return PaginatedResult[Income]{}, err
	}
	defer rows.Close()

	incomes := []Income{}
	for rows.Next() {
		var i Income
		err := rows.Scan(
			&i.ID, &i.ParentID, &i.Name, &i.PersonID, &i.PersonName, &i.Amount, &i.Frequency,
			&i.StartDate, &i.EndDate, &i.Category, &i.GrowthRate,
			&i.Notes, &i.GrowthStrategy, &i.UpdatedAt,
			&i.IncomeType, &i.CPFWageType, &i.ScenarioEventID,
		)
		if err != nil {
			return PaginatedResult[Income]{}, err
		}
		incomes = append(incomes, i)
	}

	return PaginatedResult[Income]{
		Data:   incomes,
		Count:  len(incomes),
		Limit:  q.Pagination.Limit,
		Offset: q.Pagination.Offset,
	}, nil
}

func (s *Store) ListExpenses(
	ctx context.Context,
	q ListQuery,
) (PaginatedResult[Expense], error) {
	query := `
	SELECT id,
		COALESCE(parent_id, id) as parent_id,
		name,
		amount,
		frequency,
		start_date,
		end_date,
		category,
		growth_rate,
		COALESCE(notes, '') as notes,
		COALESCE(growth_strategy, '') as growth_strategy,
		updated_at,
		source_liability_id,
		scenario_event_id
	FROM finance_expenses
	WHERE user_id = $1`

	// Filter scenario items:
	// - When IncludeScenarioItems=false: exclude all scenario items
	// - When IncludeScenarioItems=true: include regular items AND 'start' impact items only
	if !q.IncludeScenarioItems {
		query += ` AND scenario_event_id IS NULL`
	} else {
		query += ` AND (scenario_event_id IS NULL OR impact_kind = 'start')`
	}

	args := []any{q.UserID}
	argIdx := 2

	// Add dynamic date range filtering
	dateRangeSubQuery, argIdx := addDateRangeFilterQuery(q.DateRange, argIdx)
	if dateRangeSubQuery != "" {
		query += " AND " + dateRangeSubQuery
		// Args order must match SQL: EndDate first (for start_date < $X), then StartDate (for end_date >= $Y)
		if q.DateRange.EndDate != nil {
			args = append(args, *q.DateRange.EndDate)
		}
		if q.DateRange.StartDate != nil {
			args = append(args, *q.DateRange.StartDate)
		}
	}

	query += ` ORDER BY parent_id, start_date`

	// Add pagination
	paginationSubQuery, _ := addPaginationQuery(q.Pagination, argIdx)
	if paginationSubQuery != "" {
		query += " " + paginationSubQuery
		if q.Pagination.Limit != nil {
			args = append(args, *q.Pagination.Limit)
		}
		if q.Pagination.Offset != nil {
			args = append(args, *q.Pagination.Offset)
		}
	}

	logQuery(query, args)
	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		fmt.Printf("Failed to query expenses: %v\n", err)
		return PaginatedResult[Expense]{}, err
	}
	defer rows.Close()

	expenses := []Expense{}
	for rows.Next() {
		var e Expense
		err := rows.Scan(
			&e.ID, &e.ParentID, &e.Name, &e.Amount, &e.Frequency,
			&e.StartDate, &e.EndDate, &e.Category, &e.GrowthRate,
			&e.Notes, &e.GrowthStrategy, &e.UpdatedAt, &e.SourceLiabilityID, &e.ScenarioEventID,
		)
		if err != nil {
			return PaginatedResult[Expense]{}, err
		}
		expenses = append(expenses, e)
	}

	return PaginatedResult[Expense]{
		Data:   expenses,
		Count:  len(expenses),
		Limit:  q.Pagination.Limit,
		Offset: q.Pagination.Offset,
	}, nil
}

// GetCPFAccount retrieves the CPF account for a user.
// After migration, returns the most recent version (no end_date) if versioning columns exist.
func (s *Store) GetCPFAccount(
	ctx context.Context,
	userID string,
) (*CPFAccount, error) {
	query := `
	SELECT
		id,
		user_id,
		COALESCE(parent_id, id) as parent_id,
		COALESCE(start_date, created_at) as start_date,
		end_date,
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
	WHERE user_id = $1 AND end_date IS NULL
	ORDER BY start_date DESC
	LIMIT 1`

	var cpf CPFAccount
	err := s.pool.QueryRow(ctx, query, userID).Scan(
		&cpf.ID,
		&cpf.UserID,
		&cpf.ParentID,
		&cpf.StartDate,
		&cpf.EndDate,
		&cpf.OABalance,
		&cpf.SABalance,
		&cpf.MABalance,
		&cpf.RABalance,
		&cpf.OAUsedForHousing,
		&cpf.HousingStartDate,
		&cpf.DateOfBirth,
		&cpf.ResidencyStatus,
		&cpf.PRGrantDate,
		&cpf.CreatedAt,
		&cpf.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil // No CPF account found for user
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query CPF account: %w", err)
	}

	return &cpf, nil
}

// ----- IncomeAllocation operations -----

// IncomeAllocation represents a destination allocation for an income.
// Income can be distributed to multiple cash_accounts or investments.
// Uses separate nullable FK columns for proper referential integrity.
// Supports versioning via parent_id + start_date/end_date for timeline-aware edits.
type IncomeAllocation struct {
	ID                  string          `json:"id"`
	IncomeID            string          `json:"incomeId"`
	ParentID            string          `json:"parentId"`          // Groups versions of same logical allocation
	StartDate           time.Time       `json:"startDate"`         // When this version starts
	EndDate             *time.Time      `json:"endDate,omitempty"` // When this version ends (NULL = ongoing)
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

	row := s.pool.QueryRow(ctx, `
		INSERT INTO finance_liabilities (user_id, parent_id, name, category, current_balance, interest_rate_apr, minimum_payment, start_date, end_date, notes, repayment_strategy)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULLIF($10, ''), $11)
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
	if err := row.Scan(&created.ID, &created.ParentID, &created.Name, &created.Category, &created.CurrentBalance, &created.InterestRateAPR, &created.MinimumPayment, &created.StartDate, &created.EndDate, &created.Notes, &created.RepaymentStrategy, &created.UpdatedAt); err != nil {
		return Liability{}, err
	}

	// Auto-create linked expense for liability repayment if minimum payment is set
	zero := decimal.Zero()
	if created.MinimumPayment.Cmp(zero) > 0 {
		_, _ = s.CreateExpense(ctx, userID, Expense{
			Name:              created.Name,
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
// Uses upsert to handle conflicts on (parent_id, start_date).
func (s *Store) CreateExpense(ctx context.Context, userID string, exp Expense) (Expense, error) {
	startDate := exp.StartDate
	if startDate.IsZero() {
		startDate = time.Now().UTC()
	}

	// Default growth strategy if not provided
	growthStrategy := exp.GrowthStrategy
	if growthStrategy == "" {
		growthStrategy = "annual_step"
	}

	query := `
		INSERT INTO finance_expenses (user_id, parent_id, name, amount, frequency, start_date, end_date, category, growth_rate, growth_strategy, notes, source_liability_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULLIF($11, ''), $12)
		ON CONFLICT ON CONSTRAINT finance_expenses_parent_start_date_key DO UPDATE
		SET name=EXCLUDED.name,
		    amount=EXCLUDED.amount,
		    frequency=EXCLUDED.frequency,
		    end_date=EXCLUDED.end_date,
		    category=EXCLUDED.category,
		    growth_rate=EXCLUDED.growth_rate,
		    growth_strategy=EXCLUDED.growth_strategy,
		    notes=EXCLUDED.notes,
		    source_liability_id=EXCLUDED.source_liability_id,
		    updated_at=NOW()
		RETURNING id, COALESCE(parent_id,id), name, amount, frequency, start_date, end_date, category, growth_rate, COALESCE(growth_strategy, '') as growth_strategy, COALESCE(notes, ''), updated_at, source_liability_id`

	args := []any{
		userID, nullIfEmpty(exp.ParentID), exp.Name, exp.Amount, exp.Frequency,
		startDate, exp.EndDate, exp.Category, exp.GrowthRate, growthStrategy,
		exp.Notes, exp.SourceLiabilityID,
	}

	logQuery(query, args)
	row := s.pool.QueryRow(ctx, query, args...)

	var created Expense
	if err := row.Scan(
		&created.ID, &created.ParentID, &created.Name, &created.Amount, &created.Frequency,
		&created.StartDate, &created.EndDate, &created.Category, &created.GrowthRate,
		&created.GrowthStrategy, &created.Notes, &created.UpdatedAt, &created.SourceLiabilityID,
	); err != nil {
		return Expense{}, fmt.Errorf("failed to create expense: %w", err)
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
		ia.parent_id,
		ia.start_date,
		ia.end_date,
		ia.target_cash_account_id,
		ia.target_investment_id,
		ia.allocation_type,
		ia.allocation_value,
		ia.created_at
	FROM finance_incomes fi
	LEFT JOIN income_allocations ia ON ia.income_id = fi.id
	WHERE fi.id = $1 AND fi.user_id = $2
	ORDER BY ia.parent_id, ia.start_date`

	logQuery(query, []any{incomeID, userID})
	rows, err := s.pool.Query(ctx, query, incomeID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query income allocations: %w", err)
	}
	defer rows.Close()

	allocations := []IncomeAllocation{}
	foundIncome := false

	for rows.Next() {
		foundIncome = true

		var incomeIDResult string
		var id, parentID, targetCashAccountID, targetInvestmentID, allocationType *string
		var startDate *time.Time
		var endDate *time.Time
		var allocationValue decimal.Decimal
		var createdAt *time.Time

		err := rows.Scan(
			&incomeIDResult,
			&id,
			&parentID,
			&startDate,
			&endDate,
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
		if id == nil {
			continue
		}

		a := IncomeAllocation{
			ID:                  *id,
			IncomeID:            incomeID,
			TargetCashAccountID: targetCashAccountID,
			TargetInvestmentID:  targetInvestmentID,
			AllocationValue:     allocationValue,
			EndDate:             endDate,
		}
		if parentID != nil {
			a.ParentID = *parentID
		}
		if startDate != nil {
			a.StartDate = *startDate
		}
		if allocationType != nil {
			a.AllocationType = *allocationType
		}
		if createdAt != nil {
			a.CreatedAt = *createdAt
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
		COALESCE(ia.parent_id, ia.id) as parent_id,
		ia.start_date,
		ia.end_date,
		ia.target_cash_account_id,
		ia.target_investment_id,
		ia.allocation_type,
		ia.allocation_value,
		ia.created_at
	FROM income_allocations ia
	INNER JOIN finance_incomes fi ON fi.id = ia.income_id
	WHERE fi.user_id = $1
	ORDER BY ia.parent_id, ia.start_date`

	logQuery(query, []any{userID})
	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query all income allocations: %w", err)
	}
	defer rows.Close()

	allocations := []IncomeAllocation{}
	for rows.Next() {
		var a IncomeAllocation
		err := rows.Scan(
			&a.ID, &a.IncomeID, &a.ParentID, &a.StartDate, &a.EndDate,
			&a.TargetCashAccountID, &a.TargetInvestmentID,
			&a.AllocationType, &a.AllocationValue, &a.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan income allocation: %w", err)
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
	SELECT ia.id, ia.income_id, COALESCE(ia.parent_id, ia.id) as parent_id,
	       ia.start_date, ia.end_date,
	       ia.target_cash_account_id, ia.target_investment_id,
	       ia.allocation_type, ia.allocation_value, ia.created_at
	FROM income_allocations ia
	INNER JOIN finance_incomes fi ON fi.id = ia.income_id AND fi.user_id = $1
	WHERE ia.id = $2`

	var a IncomeAllocation
	// pgx scans NULL directly into *string and *time.Time
	err := s.pool.QueryRow(ctx, query, userID, allocationID).Scan(
		&a.ID, &a.IncomeID, &a.ParentID,
		&a.StartDate, &a.EndDate,
		&a.TargetCashAccountID, &a.TargetInvestmentID,
		&a.AllocationType, &a.AllocationValue, &a.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get income allocation: %w", err)
	}

	return &a, nil
}

// CreateIncomeAllocation creates a new allocation for an income.
// If ParentID is empty, the new row's ID becomes its own parent (new logical allocation).
// If ParentID is set, this creates a new version of an existing allocation (restart scenario).
func (s *Store) CreateIncomeAllocation(
	ctx context.Context,
	userID string,
	allocation IncomeAllocation,
) (*IncomeAllocation, error) {
	// Verify the income belongs to the user
	var exists bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM finance_incomes WHERE id = $1 AND user_id = $2)`,
		allocation.IncomeID, userID,
	).Scan(&exists)
	if err != nil {
		return nil, fmt.Errorf("failed to verify income ownership: %w", err)
	}
	if !exists {
		return nil, ErrNotFound
	}

	// Default start_date to 2025-01-01 if not provided
	startDate := allocation.StartDate
	if startDate.IsZero() {
		startDate = time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	}

	query := `
	INSERT INTO income_allocations (income_id, parent_id, start_date, end_date, target_cash_account_id, target_investment_id, allocation_type, allocation_value)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	RETURNING id, income_id, COALESCE(parent_id, id), start_date, end_date, target_cash_account_id, target_investment_id, allocation_type, allocation_value, created_at`

	var created IncomeAllocation
	// pgx scans NULL directly into *string and *time.Time
	err = s.pool.QueryRow(ctx, query,
		allocation.IncomeID,
		nullIfEmpty(allocation.ParentID),
		startDate,
		allocation.EndDate,
		allocation.TargetCashAccountID,
		allocation.TargetInvestmentID,
		allocation.AllocationType,
		allocation.AllocationValue,
	).Scan(
		&created.ID, &created.IncomeID, &created.ParentID,
		&created.StartDate, &created.EndDate,
		&created.TargetCashAccountID, &created.TargetInvestmentID,
		&created.AllocationType, &created.AllocationValue, &created.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create income allocation: %w", err)
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
	RETURNING ia.id, ia.income_id, COALESCE(ia.parent_id, ia.id), ia.start_date, ia.end_date,
	          ia.target_cash_account_id, ia.target_investment_id,
	          ia.allocation_type, ia.allocation_value, ia.created_at`

	var updated IncomeAllocation
	// pgx scans NULL directly into *string and *time.Time
	err := s.pool.QueryRow(ctx, query,
		userID, allocation.ID,
		allocation.TargetCashAccountID,
		allocation.TargetInvestmentID,
		allocation.AllocationType,
		allocation.AllocationValue,
	).Scan(
		&updated.ID, &updated.IncomeID, &updated.ParentID,
		&updated.StartDate, &updated.EndDate,
		&updated.TargetCashAccountID, &updated.TargetInvestmentID,
		&updated.AllocationType, &updated.AllocationValue, &updated.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update income allocation: %w", err)
	}

	return &updated, nil
}

// SetIncomeAllocationEndDate sets the end_date for an allocation (stops it at a future point).
// Used when "deleting" at a future time - preserves the original record with an end_date.
func (s *Store) SetIncomeAllocationEndDate(
	ctx context.Context,
	userID string,
	allocationID string,
	endDate time.Time,
) (*IncomeAllocation, error) {
	query := `
	UPDATE income_allocations ia
	SET end_date = $3
	FROM finance_incomes fi
	WHERE ia.id = $2
	  AND ia.income_id = fi.id
	  AND fi.user_id = $1
	RETURNING ia.id, ia.income_id, COALESCE(ia.parent_id, ia.id), ia.start_date, ia.end_date,
	          ia.target_cash_account_id, ia.target_investment_id,
	          ia.allocation_type, ia.allocation_value, ia.created_at`

	var updated IncomeAllocation
	err := s.pool.QueryRow(ctx, query, userID, allocationID, endDate).Scan(
		&updated.ID, &updated.IncomeID, &updated.ParentID,
		&updated.StartDate, &updated.EndDate,
		&updated.TargetCashAccountID, &updated.TargetInvestmentID,
		&updated.AllocationType, &updated.AllocationValue, &updated.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to set income allocation end date: %w", err)
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

	tag, err := s.pool.Exec(ctx, query, userID, allocationID)
	if err != nil {
		return fmt.Errorf("failed to delete income allocation: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// ==================== Bulk Delete Operations ====================

// DeleteAllNonCashAssets deletes all non-cash assets for a user (bulk delete).
func (s *Store) DeleteAllNonCashAssets(ctx context.Context, userID string) (int64, error) {
	query := `DELETE FROM finance_assets WHERE user_id = $1`
	logQuery(query, []any{userID})
	tag, err := s.pool.Exec(ctx, query, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete all non-cash assets: %w", err)
	}
	return tag.RowsAffected(), nil
}

// DeleteAllCashAssets resets all cash accounts for a user (bulk delete).
// The accumulator account is preserved but reset to 0 balance.
// Non-accumulator accounts are deleted.
func (s *Store) DeleteAllCashAssets(ctx context.Context, userID string) (int64, error) {
	// Reset accumulator balance to 0 (keep the account)
	resetQuery := `UPDATE finance_cash_accounts SET balance = 0, updated_at = NOW() WHERE user_id = $1 AND is_accumulator = true`
	logQuery(resetQuery, []any{userID})
	_, err := s.pool.Exec(ctx, resetQuery, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to reset accumulator balance: %w", err)
	}

	// Delete non-accumulator cash accounts
	deleteQuery := `DELETE FROM finance_cash_accounts WHERE user_id = $1 AND is_accumulator = false`
	logQuery(deleteQuery, []any{userID})
	tag, err := s.pool.Exec(ctx, deleteQuery, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete non-accumulator cash accounts: %w", err)
	}
	return tag.RowsAffected(), nil
}

// DeleteAllLiabilities deletes all liabilities for a user (bulk delete).
func (s *Store) DeleteAllLiabilities(ctx context.Context, userID string) (int64, error) {
	query := `DELETE FROM finance_liabilities WHERE user_id = $1`
	logQuery(query, []any{userID})
	tag, err := s.pool.Exec(ctx, query, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete all liabilities: %w", err)
	}
	return tag.RowsAffected(), nil
}

// DeleteAllIncomes deletes all incomes for a user (bulk delete).
// Also cascades to delete income_allocations via FK constraint.
func (s *Store) DeleteAllIncomes(ctx context.Context, userID string) (int64, error) {
	query := `DELETE FROM finance_incomes WHERE user_id = $1`
	logQuery(query, []any{userID})
	tag, err := s.pool.Exec(ctx, query, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete all incomes: %w", err)
	}
	return tag.RowsAffected(), nil
}

// DeleteAllInvestments deletes all investments for a user (bulk delete).
func (s *Store) DeleteAllInvestments(ctx context.Context, userID string) (int64, error) {
	query := `DELETE FROM finance_investments WHERE user_id = $1`
	logQuery(query, []any{userID})
	tag, err := s.pool.Exec(ctx, query, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete all investments: %w", err)
	}
	return tag.RowsAffected(), nil
}

// DeleteAllCPFAccounts deletes all CPF accounts for a user (bulk delete).
func (s *Store) DeleteAllCPFAccounts(ctx context.Context, userID string) (int64, error) {
	query := `DELETE FROM cpf_accounts WHERE user_id = $1`
	logQuery(query, []any{userID})
	tag, err := s.pool.Exec(ctx, query, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete all CPF accounts: %w", err)
	}
	return tag.RowsAffected(), nil
}

// DeleteAllIncomeAllocations deletes all income allocations for a user (bulk delete).
func (s *Store) DeleteAllIncomeAllocations(ctx context.Context, userID string) (int64, error) {
	query := `
	DELETE FROM income_allocations ia
	USING finance_incomes fi
	WHERE ia.income_id = fi.id AND fi.user_id = $1`
	logQuery(query, []any{userID})
	tag, err := s.pool.Exec(ctx, query, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete all income allocations: %w", err)
	}
	return tag.RowsAffected(), nil
}

// ResetAllUserData deletes all financial data for a user in a single transaction.
// This avoids deadlocks by ensuring proper deletion order (child tables before parent tables).
// Returns the total number of rows affected across all tables.
func (s *Store) ResetAllUserData(ctx context.Context, userID string) (int64, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var totalAffected int64

	// Delete in order of dependencies (child tables first to avoid FK constraint issues)
	// Note: Most FK constraints have ON DELETE CASCADE, but we delete explicitly
	// to avoid deadlocks when parallel transactions try to cascade-delete the same rows

	// 1. Delete income_allocations first (depends on incomes, investments, cash_accounts)
	tag, err := tx.Exec(ctx, `
		DELETE FROM income_allocations ia
		USING finance_incomes fi
		WHERE ia.income_id = fi.id AND fi.user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete income allocations: %w", err)
	}
	totalAffected += tag.RowsAffected()

	// 2. Delete property-related tables (depend on property_sg which depends on incomes/cpf)
	tag, err = tx.Exec(ctx, `
		DELETE FROM property_links pl
		USING property_scenarios ps
		WHERE pl.property_scenario_id = ps.id AND ps.user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete property links: %w", err)
	}
	totalAffected += tag.RowsAffected()

	tag, err = tx.Exec(ctx, `
		DELETE FROM liability_rate_periods lrp
		USING property_sg psg, property_scenarios ps
		WHERE lrp.property_sg_id = psg.id AND ps.property_sg_id = psg.id AND ps.user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete liability rate periods: %w", err)
	}
	totalAffected += tag.RowsAffected()

	tag, err = tx.Exec(ctx, `
		DELETE FROM growth_periods gp
		USING property_sg psg, property_scenarios ps
		WHERE gp.property_sg_id = psg.id AND ps.property_sg_id = psg.id AND ps.user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete property growth periods: %w", err)
	}
	totalAffected += tag.RowsAffected()

	tag, err = tx.Exec(ctx, `
		DELETE FROM property_fees pf
		USING property_sg psg, property_scenarios ps
		WHERE pf.property_sg_id = psg.id AND ps.property_sg_id = psg.id AND ps.user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete property fees: %w", err)
	}
	totalAffected += tag.RowsAffected()

	tag, err = tx.Exec(ctx, `
		DELETE FROM property_sg_grants psg_g
		USING property_sg psg, property_scenarios ps
		WHERE psg_g.property_sg_id = psg.id AND ps.property_sg_id = psg.id AND ps.user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete property grants: %w", err)
	}
	totalAffected += tag.RowsAffected()

	// Delete property_sg entries via property_scenarios
	tag, err = tx.Exec(ctx, `
		DELETE FROM property_sg psg
		USING property_scenarios ps
		WHERE ps.property_sg_id = psg.id AND ps.user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete property_sg: %w", err)
	}
	totalAffected += tag.RowsAffected()

	// Delete property_scenarios
	tag, err = tx.Exec(ctx, `DELETE FROM property_scenarios WHERE user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete property scenarios: %w", err)
	}
	totalAffected += tag.RowsAffected()

	// 3. Delete growth_periods for financial items
	tag, err = tx.Exec(ctx, `
		DELETE FROM growth_periods gp
		USING finance_incomes fi
		WHERE gp.finance_income_id = fi.id AND fi.user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete income growth periods: %w", err)
	}
	totalAffected += tag.RowsAffected()

	tag, err = tx.Exec(ctx, `
		DELETE FROM growth_periods gp
		USING finance_investments finv
		WHERE gp.finance_investment_id = finv.id AND finv.user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete investment growth periods: %w", err)
	}
	totalAffected += tag.RowsAffected()

	// 4. Delete core financial tables (order doesn't matter much now, but expenses before liabilities)
	tag, err = tx.Exec(ctx, `DELETE FROM finance_expenses WHERE user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete expenses: %w", err)
	}
	totalAffected += tag.RowsAffected()

	tag, err = tx.Exec(ctx, `DELETE FROM finance_incomes WHERE user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete incomes: %w", err)
	}
	totalAffected += tag.RowsAffected()

	tag, err = tx.Exec(ctx, `DELETE FROM finance_liabilities WHERE user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete liabilities: %w", err)
	}
	totalAffected += tag.RowsAffected()

	tag, err = tx.Exec(ctx, `DELETE FROM finance_investments WHERE user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete investments: %w", err)
	}
	totalAffected += tag.RowsAffected()

	tag, err = tx.Exec(ctx, `DELETE FROM finance_assets WHERE user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete assets: %w", err)
	}
	totalAffected += tag.RowsAffected()

	// Reset accumulator balance (keep the account, just zero it)
	_, err = tx.Exec(ctx, `UPDATE finance_cash_accounts SET balance = 0, updated_at = NOW() WHERE user_id = $1 AND is_accumulator = true`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to reset accumulator: %w", err)
	}

	// Delete non-accumulator cash accounts
	tag, err = tx.Exec(ctx, `DELETE FROM finance_cash_accounts WHERE user_id = $1 AND is_accumulator = false`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete cash accounts: %w", err)
	}
	totalAffected += tag.RowsAffected()

	// 5. Delete CPF accounts
	tag, err = tx.Exec(ctx, `DELETE FROM cpf_accounts WHERE user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete CPF accounts: %w", err)
	}
	totalAffected += tag.RowsAffected()

	// 6. Delete scenario events (now safe - all dependents via FK CASCADE already gone)
	tag, err = tx.Exec(ctx, `DELETE FROM scenario_events WHERE user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete scenario events: %w", err)
	}
	totalAffected += tag.RowsAffected()

	// 7. Delete persons
	tag, err = tx.Exec(ctx, `DELETE FROM persons WHERE user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete persons: %w", err)
	}
	totalAffected += tag.RowsAffected()

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return totalAffected, nil
}
