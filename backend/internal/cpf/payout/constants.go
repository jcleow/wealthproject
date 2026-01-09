package payout

import "financial-chat-system/backend/internal/decimal"

// CPF LIFE Payout Divisors
// Source: CPF Playbook "Quick Calculation" method
// Monthly payout at 65 = RA at 55 / divisor
var (
	// MaleDivisor is used to calculate male CPF LIFE payouts.
	// Males have higher payouts (lower divisor) due to shorter life expectancy.
	MaleDivisor = decimal.MustFromString("120")

	// FemaleDivisor is used to calculate female CPF LIFE payouts.
	// Females have lower payouts (higher divisor) due to longer life expectancy.
	FemaleDivisor = decimal.MustFromString("132")
)

// Plan Adjustment Factors
// These adjust the Standard plan payout to get Basic/Escalating payouts.
var (
	// StandardAdjustment - no adjustment for Standard plan.
	StandardAdjustment = decimal.MustFromString("1.0")

	// BasicAdjustment - Basic plan pays ~90% of Standard.
	// Lower payout preserves more for bequest.
	BasicAdjustment = decimal.MustFromString("0.90")

	// EscalatingAdjustment - Escalating starts at ~80% of Standard.
	// Grows 2% annually to eventually exceed Standard.
	EscalatingAdjustment = decimal.MustFromString("0.80")
)

// Escalating Plan Growth
var (
	// EscalatingGrowthRate is the annual increase for Escalating plan (2% p.a.)
	EscalatingGrowthRate = decimal.MustFromString("0.02")

	// EscalatingGrowthMultiplier is 1 + growth rate (1.02)
	EscalatingGrowthMultiplier = decimal.MustFromString("1.02")
)

// Deferment Bonus
// Delaying payout start from 65 increases monthly payout.
var (
	// DefermentBonusPerYear is the increase per year deferred (~7% per year).
	DefermentBonusPerYear = decimal.MustFromString("0.07")

	// MaxDefermentBonus is the maximum deferment bonus (+40% at age 70).
	MaxDefermentBonus = decimal.MustFromString("0.40")
)

// RA Interest Rate
var (
	// RAInterestRate is the annual interest on RA balance (4% p.a.)
	RAInterestRate = decimal.MustFromString("0.04")

	// RAGrowthMultiplier is 1 + interest rate (1.04)
	RAGrowthMultiplier = decimal.MustFromString("1.04")
)

// Age Limits
const (
	// MinPayoutAge is the earliest age to start CPF LIFE payouts.
	MinPayoutAge = 65

	// MaxPayoutAge is the latest age to start CPF LIFE payouts.
	// Payouts auto-start at 70 if not initiated.
	MaxPayoutAge = 70

	// RACreationAge is when RA is created from OA+SA.
	RACreationAge = 55
)

// 2025 Retirement Sums (for reference/testing)
var (
	BRS2025 = decimal.MustFromString("106500")
	FRS2025 = decimal.MustFromString("213000")
	ERS2025 = decimal.MustFromString("426000")
)
