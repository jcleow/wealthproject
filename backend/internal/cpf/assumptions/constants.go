// Package assumptions provides CPF assumptions management and persistence.
package assumptions

import "financial-chat-system/backend/internal/decimal"

// Official CPF Interest Rates
// Reference: https://www.cpf.gov.sg/member/growing-your-savings/earning-interest/interest-rates
var (
	// OAInterestRate is the Ordinary Account base interest rate (2.5% p.a.)
	OAInterestRate = decimal.MustFromString("0.025")

	// SAInterestRate is the Special Account base interest rate (4.0% p.a.)
	SAInterestRate = decimal.MustFromString("0.04")

	// MAInterestRate is the Medisave Account base interest rate (4.0% p.a.)
	MAInterestRate = decimal.MustFromString("0.04")

	// RAInterestRate is the Retirement Account base interest rate (4.0% p.a.)
	RAInterestRate = decimal.MustFromString("0.04")

	// ExtraInterestFirst60K is the extra interest on first $60,000 combined balance (1.0% p.a.)
	ExtraInterestFirst60K = decimal.MustFromString("0.01")

	// ExtraInterestFirst30KAbove55 is the additional extra interest on first $30,000 for members 55+ (1.0% p.a.)
	ExtraInterestFirst30KAbove55 = decimal.MustFromString("0.01")
)

// Official CPF Growth Rate Assumptions
var (
	// FRSGrowthRate is the assumed annual growth rate for FRS/BRS/ERS (3.5% p.a.)
	// Reference: https://www.cpf.gov.sg/member/tnc/detailed-notes-for-cpf-planner-retirement-income
	FRSGrowthRate = decimal.MustFromString("0.035")

	// EscalatingPlanGrowth is the annual growth rate for CPF LIFE Escalating plan (2.0% p.a.)
	EscalatingPlanGrowth = decimal.MustFromString("0.02")
)

// CPF LIFE and Retirement Defaults
const (
	// DefaultRetirementAge is the standard retirement age for CPF purposes
	DefaultRetirementAge = 65

	// DefaultPayoutStartAge is the default age to start CPF LIFE payouts
	DefaultPayoutStartAge = 65

	// MinPayoutStartAge is the minimum age to start CPF LIFE payouts
	MinPayoutStartAge = 65

	// MaxPayoutStartAge is the maximum age to defer CPF LIFE payouts
	MaxPayoutStartAge = 70
)
