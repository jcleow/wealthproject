package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type Store struct {
	db *sql.DB
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
	CurrentValue     float64                `json:"currentValue"`
	AnnualGrowthRate float64                `json:"annualGrowthRate"`
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
	Balance        float64                `json:"balance"`
	InterestRate   float64                `json:"interestRate"`
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
	CurrentBalance  float64                `json:"currentBalance"`
	InterestRateAPR float64                `json:"interestRateApr"`
	MinimumPayment  float64                `json:"minimumPayment"`
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
	Amount         float64                `json:"amount"`
	Frequency      string                 `json:"frequency"`
	StartDate      time.Time              `json:"startDate"`         // Precise start date (day-level) - now required
	EndDate        *time.Time             `json:"endDate,omitempty"` // NULL means ongoing
	Category       string                 `json:"category"`
	GrowthRate     float64                `json:"growthRate"`
	Notes          string                 `json:"notes"`
	GrowthStrategy string                 `json:"growthStrategy"`
	GrowthMetadata map[string]interface{} `json:"growthMetadata,omitempty"`
	UpdatedAt      time.Time              `json:"updatedAt"`
}

// Expense represents a persisted expense record.
type Expense struct {
	ID             string                 `json:"id"`
	ParentID       string                 `json:"parentId"`
	Payee          string                 `json:"payee"`
	Amount         float64                `json:"amount"`
	Frequency      string                 `json:"frequency"`
	StartDate      time.Time              `json:"startDate"`         // Precise start date (day-level)
	EndDate        *time.Time             `json:"endDate,omitempty"` // NULL means ongoing
	Category       string                 `json:"category"`
	GrowthRate     float64                `json:"growthRate"`
	Notes          string                 `json:"notes"`
	GrowthStrategy string                 `json:"growthStrategy"`
	GrowthMetadata map[string]interface{} `json:"growthMetadata,omitempty"`
	UpdatedAt      time.Time              `json:"updatedAt"`
}

// CPFAccount represents a user's CPF account with balances and profile data.
type CPFAccount struct {
	ID               string     `json:"id"`
	UserID           string     `json:"userId"`
	OABalance        float64    `json:"oaBalance"`        // Ordinary Account balance
	SABalance        float64    `json:"saBalance"`        // Special Account balance
	MABalance        float64    `json:"maBalance"`        // MediSave Account balance
	RABalance        float64    `json:"raBalance"`        // Retirement Account balance (only after age 55)
	OAUsedForHousing float64    `json:"oaUsedForHousing"` // OA amount used for housing (for accrued interest)
	HousingStartDate *time.Time `json:"housingStartDate,omitempty"`
	DateOfBirth      time.Time  `json:"dateOfBirth"`
	ResidencyStatus  string     `json:"residencyStatus"` // 'citizen', 'pr_year_1', 'pr_year_2', 'pr_year_3_plus'
	PRGrantDate      *time.Time `json:"prGrantDate,omitempty"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
}

type DateRangeOptions struct {
	ActiveAfter  *time.Time // Item must be active after this date (start_date <= this, end_date >= this or NULL)
	ActiveBefore *time.Time // Item must start before this date (start_date <= this)
}

func addDateRangeFilterQuery(opts DateRangeOptions, argIdx int) (string, int) {
	// Add optional date range filtering
	dateRangeSubquery := []string{}

	if opts.ActiveAfter != nil {
		dateRangeSubquery = append(dateRangeSubquery, fmt.Sprintf(` (end_date IS NULL OR end_date >= $%d) `, argIdx))
		argIdx++
	}
	if opts.ActiveBefore != nil {
		dateRangeSubquery = append(dateRangeSubquery, fmt.Sprintf(` start_date <= $%d `, argIdx))
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
		paginationSubquery = append(paginationSubquery, fmt.Sprintf(`LIMIT %d `, argIdx))
		argIdx += 1
	}

	if pagination.Offset != nil {
		paginationSubquery = append(paginationSubquery, fmt.Sprintf(`OFFSET %d `, argIdx))
		argIdx += 1
	}

	subQuery := strings.Join(paginationSubquery, " AND ")

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
	ORDER BY parent_id, start_date	
	`

	args := []any{userID}
	argIdx := 2 // i.e start 2

	// Add dynamic date range filtering / pagination
	dateRangeSubQuery, argIdx := addDateRangeFilterQuery(dateRangeOpts, argIdx)
	paginationSubQuery, _ := addPaginationQuery(pagination, argIdx)

	query += dateRangeSubQuery
	query += paginationSubQuery
	query += ` ORDER BY parent_id, start_date`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		fmt.Printf("Failed to query for non cash assets")
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

		err := rows.Scan(&a.ID, &a.ParentID, &a.Name, &a.Category, &a.CurrentValue, &a.StartDate, &endDate, &a.Notes, &a.UpdatedAt)
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
		Count:  1, // to implement
		Limit:  pagination.Limit,
		Offset: pagination.Offset,
	}, fmt.Errorf("")
}
