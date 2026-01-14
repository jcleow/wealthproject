// Package engine provides unified CPF calculation logic used by both
// the timeline service and the projector for consistent CPF lifecycle handling.
package engine

import (
	"time"

	"financial-chat-system/backend/internal/cpf/config"
	"financial-chat-system/backend/internal/decimal"
)

// CPFState represents the complete state of CPF accounts at a point in time.
// This is the core data structure shared between projector and timeline service.
type CPFState struct {
	// Account balances
	OA *decimal.Decimal // Ordinary Account balance
	SA *decimal.Decimal // Special Account balance
	MA *decimal.Decimal // MediSave Account balance
	RA *decimal.Decimal // Retirement Account balance

	// YTD tracking for contribution ceiling calculations
	YTDOrdinaryWages   *decimal.Decimal // Year-to-date capped OW
	YTDAdditionalWages *decimal.Decimal // Year-to-date AW

	// Profile information needed for calculations
	DateOfBirth     time.Time              // For age calculations
	Gender          string                 // "male" or "female" (for CPF LIFE)
	ResidencyStatus config.ResidencyStatus // Citizen, PR year 1/2/3+

	// Lifecycle flags
	RAFormed      bool // Whether RA has been formed (at age 55)
	PayoutsActive bool // Whether CPF LIFE payouts are active

	// CPF LIFE tracking (once payouts start)
	MonthlyPayout     *decimal.Decimal // Monthly payout amount
	CumulativePayouts *decimal.Decimal // Total payouts received to date

	// Timestamp
	AsOfDate time.Time // When this state was recorded/calculated
}

// NewCPFState creates a CPFState from initial balances and profile data.
func NewCPFState(
	oa, sa, ma, ra *decimal.Decimal,
	dob time.Time,
	gender string,
	residency config.ResidencyStatus,
	asOfDate time.Time,
) *CPFState {
	state := &CPFState{
		OA:                 cloneOrZero(oa),
		SA:                 cloneOrZero(sa),
		MA:                 cloneOrZero(ma),
		RA:                 cloneOrZero(ra),
		YTDOrdinaryWages:   decimal.Zero(),
		YTDAdditionalWages: decimal.Zero(),
		DateOfBirth:        dob,
		Gender:             gender,
		ResidencyStatus:    residency,
		RAFormed:           false,
		PayoutsActive:      false,
		MonthlyPayout:      nil,
		CumulativePayouts:  decimal.Zero(),
		AsOfDate:           asOfDate,
	}

	// Check if RA has already been formed (person is 55+ with RA balance)
	age := state.AgeAt(asOfDate)
	if age >= 55 && ra != nil && !ra.IsZero() {
		state.RAFormed = true
	}

	return state
}

// Clone creates a deep copy of the state.
func (s *CPFState) Clone() *CPFState {
	if s == nil {
		return nil
	}
	return &CPFState{
		OA:                 cloneOrZero(s.OA),
		SA:                 cloneOrZero(s.SA),
		MA:                 cloneOrZero(s.MA),
		RA:                 cloneOrZero(s.RA),
		YTDOrdinaryWages:   cloneOrZero(s.YTDOrdinaryWages),
		YTDAdditionalWages: cloneOrZero(s.YTDAdditionalWages),
		DateOfBirth:        s.DateOfBirth,
		Gender:             s.Gender,
		ResidencyStatus:    s.ResidencyStatus,
		RAFormed:           s.RAFormed,
		PayoutsActive:      s.PayoutsActive,
		MonthlyPayout:      cloneOrZero(s.MonthlyPayout),
		CumulativePayouts:  cloneOrZero(s.CumulativePayouts),
		AsOfDate:           s.AsOfDate,
	}
}

// TotalBalance returns the sum of all account balances.
func (s *CPFState) TotalBalance() *decimal.Decimal {
	total := decimal.Zero()
	total = total.Add(s.OA)
	total = total.Add(s.SA)
	total = total.Add(s.MA)
	total = total.Add(s.RA)
	return total
}

// ResetYTD resets year-to-date wage tracking (call at year boundaries).
func (s *CPFState) ResetYTD() {
	s.YTDOrdinaryWages = decimal.Zero()
	s.YTDAdditionalWages = decimal.Zero()
}

// AgeAt returns the age at a given date.
func (s *CPFState) AgeAt(date time.Time) int {
	age := date.Year() - s.DateOfBirth.Year()
	// Adjust if birthday hasn't occurred yet this year
	dobThisYear := time.Date(date.Year(), s.DateOfBirth.Month(), s.DateOfBirth.Day(), 0, 0, 0, 0, s.DateOfBirth.Location())
	if date.Before(dobThisYear) {
		age--
	}
	return age
}

// cloneOrZero returns a clone of the decimal or zero if nil.
func cloneOrZero(d *decimal.Decimal) *decimal.Decimal {
	if d == nil {
		return decimal.Zero()
	}
	return decimal.Zero().Add(d)
}
