// Package projector provides CPF balance projection to a future date.
//
// It calculates projected CPF account balances by applying:
// - Monthly contributions from linked incomes
// - Interest accrual (2.5% OA, 4% SA/MA/RA)
// - Year-to-date wage ceiling tracking
package projector

import (
	"time"

	"financial-chat-system/backend/internal/decimal"
)

// AccountSnapshot represents CPF account state at a point in time
type AccountSnapshot struct {
	OABalance       *decimal.Decimal // Ordinary Account balance
	SABalance       *decimal.Decimal // Special Account balance
	MABalance       *decimal.Decimal // MediSave Account balance
	RABalance       *decimal.Decimal // Retirement Account balance
	DateOfBirth     time.Time        // For age-based rate calculation
	ResidencyStatus string           // "citizen", "pr_year_1", "pr_year_2", "pr_year_3_plus"
	AsOfDate        time.Time        // When these balances were recorded
}

// IncomeStream represents an income contributing to CPF
type IncomeStream struct {
	MonthlyAmount *decimal.Decimal // Monthly income amount
	WageType      string           // "ow" (ordinary wages) or "aw" (additional wages)
	StartDate     time.Time        // When this income started
	EndDate       *time.Time       // When this income ends (nil = ongoing)
}

// ProjectedBalances contains the projected CPF state at target date
type ProjectedBalances struct {
	OA       *decimal.Decimal // Projected Ordinary Account balance
	SA       *decimal.Decimal // Projected Special Account balance
	MA       *decimal.Decimal // Projected MediSave Account balance
	RA       *decimal.Decimal // Projected Retirement Account balance
	AsOfDate time.Time        // The projection target date

	// Breakdown for transparency
	ContributionsOA *decimal.Decimal // Total OA contributions added
	InterestOA      *decimal.Decimal // Total OA interest earned
}

// YearlySnapshot represents CPF balances at a specific year
type YearlySnapshot struct {
	Year          int              `json:"year"`          // Calendar year
	Age           int              `json:"age"`           // Age at end of year
	OA            *decimal.Decimal `json:"oa"`            // Ordinary Account balance
	SA            *decimal.Decimal `json:"sa"`            // Special Account balance
	MA            *decimal.Decimal `json:"ma"`            // MediSave Account balance
	RA            *decimal.Decimal `json:"ra"`            // Retirement Account balance
	Total         *decimal.Decimal `json:"total"`         // Total CPF balance
	Contributions *decimal.Decimal `json:"contributions"` // Total contributions this year
	Interest      *decimal.Decimal `json:"interest"`      // Total interest this year
}

// YearByYearProjection contains year-by-year CPF projection data
type YearByYearProjection struct {
	Snapshots        []YearlySnapshot  `json:"snapshots"`        // Year-by-year balances
	Age55Balances    *ProjectedBalances `json:"age55Balances"`    // Balances at age 55
	Age65Balances    *ProjectedBalances `json:"age65Balances"`    // Balances at age 65
	FRSAtAge55       *decimal.Decimal   `json:"frsAt55"`          // Full Retirement Sum at age 55
	BRSAtAge55       *decimal.Decimal   `json:"brsAt55"`          // Basic Retirement Sum at age 55
	ERSAtAge55       *decimal.Decimal   `json:"ersAt55"`          // Enhanced Retirement Sum at age 55
	BHS              *decimal.Decimal   `json:"bhs"`              // Basic Healthcare Sum (MediSave cap)
}
