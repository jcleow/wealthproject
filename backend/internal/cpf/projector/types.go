// Package projector provides CPF balance projection calculations.
package projector

import "time"

// ProjectionYear represents CPF balances and activity for a single year.
type ProjectionYear struct {
	Year          int     `json:"year"`
	Age           int     `json:"age"`
	OA            float64 `json:"oa"`
	SA            float64 `json:"sa"`
	MA            float64 `json:"ma"`
	RA            float64 `json:"ra"`
	Total         float64 `json:"total"`
	Contributions float64 `json:"contributions"`
	Interest      float64 `json:"interest"`
}

// AccountBalances represents balances for all CPF accounts.
type AccountBalances struct {
	OA float64 `json:"oa"`
	SA float64 `json:"sa"`
	MA float64 `json:"ma"`
	RA float64 `json:"ra"`
}

// Milestone represents a significant CPF event (age 55, 65).
type Milestone struct {
	Year     int             `json:"year"`
	Balances AccountBalances `json:"balances"`
}

// Milestones contains key milestone events.
type Milestones struct {
	Age55 *Milestone `json:"age55,omitempty"`
	Age65 *Milestone `json:"age65,omitempty"`
}

// CPFLifeEstimates contains estimated monthly payouts for each plan.
type CPFLifeEstimates struct {
	Standard   float64 `json:"standard"`
	Basic      float64 `json:"basic"`
	Escalating float64 `json:"escalating"`
}

// RetirementSummary contains retirement planning information.
type RetirementSummary struct {
	FRSTarget        float64          `json:"frsTarget"`
	BRSTarget        float64          `json:"brsTarget"`
	ERSTarget        float64          `json:"ersTarget"`
	CPFLifeEstimates CPFLifeEstimates `json:"cpfLifeEstimates"`
}

// ProjectionRangeResult contains the complete projection output.
type ProjectionRangeResult struct {
	Projections []ProjectionYear  `json:"projections"`
	Milestones  Milestones        `json:"milestones"`
	Retirement  RetirementSummary `json:"retirement"`
}

// ProjectionInput contains all data needed for projection.
type ProjectionInput struct {
	// Current balances
	OABalance float64
	SABalance float64
	MABalance float64
	RABalance float64

	// Profile
	DateOfBirth time.Time
	CurrentDate time.Time

	// Income (for contribution calculation)
	MonthlySalary float64
	AnnualBonus   float64

	// Assumptions
	InterestRateOA               float64
	InterestRateSA               float64
	InterestRateMA               float64
	InterestRateRA               float64
	ExtraInterestFirst60k        float64
	ExtraInterestFirst30kAbove55 float64
	FRSGrowthRate                float64
	SalaryGrowthRate             float64
	RetirementAge                int
	AssumeContinuousEmployment   bool

	// CPF LIFE
	PayoutStartAge int

	// CPF Config (for current year rates)
	FRS int64
	BRS int64
	ERS int64
	BHS int64
}
