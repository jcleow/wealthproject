// Package retirement provides CPF retirement calculations including
// Age 55 RA conversion and CPF LIFE eligibility.
package retirement

import "financial-chat-system/backend/internal/decimal"

// TargetScheme represents the retirement sum target scheme.
type TargetScheme string

const (
	// TargetBRS targets the Basic Retirement Sum
	TargetBRS TargetScheme = "brs"
	// TargetFRS targets the Full Retirement Sum
	TargetFRS TargetScheme = "frs"
	// TargetERS targets the Enhanced Retirement Sum
	TargetERS TargetScheme = "ers"
)

// ConversionInput contains the inputs for Age 55 RA conversion calculation.
type ConversionInput struct {
	// Current CPF balances before conversion
	OABalance *decimal.Decimal // Ordinary Account balance
	SABalance *decimal.Decimal // Special Account balance
	MABalance *decimal.Decimal // MediSave Account balance

	// Target scheme and retirement sums
	TargetScheme TargetScheme     // "brs", "frs", or "ers"
	BRS          *decimal.Decimal // Basic Retirement Sum at age 55
	FRS          *decimal.Decimal // Full Retirement Sum at age 55
	ERS          *decimal.Decimal // Enhanced Retirement Sum at age 55
	BHS          *decimal.Decimal // Basic Healthcare Sum (MediSave cap)

	// Optional: Property pledge reduces required RA
	PropertyPledgeAmount *decimal.Decimal // Amount pledged against property (up to 50% of property value, max 50% of BRS)
}

// ConversionResult contains the outcome of Age 55 RA conversion.
type ConversionResult struct {
	// Transfer breakdown
	SAToRA         *decimal.Decimal // Amount transferred from SA to RA
	OAToRA         *decimal.Decimal // Amount transferred from OA to RA
	MAOverflowToRA *decimal.Decimal // MA exceeding BHS → RA

	// Final balances after conversion
	FinalOA *decimal.Decimal // Remaining OA (can be withdrawn)
	FinalSA *decimal.Decimal // Should be 0 after 55
	FinalMA *decimal.Decimal // Capped at BHS
	FinalRA *decimal.Decimal // Total RA after all transfers

	// Status flags
	MeetsTarget     bool // Whether the target scheme amount is met
	CPFLifeEligible bool // RA >= $60,000 at age 55 (eligible for CPF LIFE)

	// Withdrawable amount
	WithdrawableOA *decimal.Decimal // OA that can be withdrawn at 55

	// Target details
	TargetScheme TargetScheme     // The target scheme used
	TargetAmount *decimal.Decimal // The target amount based on scheme
}

// CPF LIFE eligibility threshold
var CPFLifeMinimumRA = decimal.NewFromInt64(60000, 0)

// Maximum property pledge percentage of BRS
var MaxPropertyPledgePct = decimal.MustFromFloat64(0.5) // 50% of BRS
